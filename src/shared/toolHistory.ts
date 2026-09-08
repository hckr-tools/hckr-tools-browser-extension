import {
  enqueueOutbox,
  idbPut,
  idbRemove,
  idbValues,
  type ToolHistoryEntry,
} from './workspace';

export type { ToolHistoryEntry };

const MAX_HISTORY_TEXT_CHARS = 100_000;
const MAX_ENTRIES_PER_TOOL = 100;

export interface RecordToolUsageParams {
  toolId: string;
  toolTitle: string;
  action: string;
  input: string;
  output?: string;
  options?: Record<string, unknown>;
  summary?: string;
}

function truncate(text?: string): string | undefined {
  if (!text) return text;
  if (text.length <= MAX_HISTORY_TEXT_CHARS) return text;
  return text.slice(0, MAX_HISTORY_TEXT_CHARS) + '\n… [truncated]';
}

/**
 * Record a tool usage action. Deduplicates identical inputs and
 * coalesces rapid keystrokes within 3 seconds for the same action.
 */
export async function recordToolUsage(params: RecordToolUsageParams): Promise<ToolHistoryEntry | null> {
  const trimmedInput = (params.input || '').trim();
  const trimmedOutput = (params.output || '').trim();

  // Don't record completely empty usage
  if (!trimmedInput && !trimmedOutput) {
    return null;
  }

  const safeInput = truncate(params.input) || '';
  const safeOutput = truncate(params.output);
  const now = new Date().toISOString();

  try {
    const all = await idbValues<ToolHistoryEntry>('tool_history');
    const toolEntries = all
      .filter((entry) => entry.toolId === params.toolId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const latest = toolEntries[0];

    // Case 1: Identical input & action -> touch updatedAt
    if (
      latest &&
      latest.action === params.action &&
      latest.input === safeInput &&
      JSON.stringify(latest.options ?? {}) === JSON.stringify(params.options ?? {})
    ) {
      const updated: ToolHistoryEntry = {
        ...latest,
        output: safeOutput ?? latest.output,
        summary: params.summary ?? latest.summary,
        updatedAt: now,
        revision: latest.revision + 1,
      };
      await idbPut('tool_history', updated);
      await enqueueOutbox('tool_history', 'upsert', updated as unknown as Record<string, unknown>);
      globalThis.dispatchEvent(new CustomEvent('hckr-tool-history-changed', { detail: { toolId: params.toolId } }));
      return updated;
    }

    // Case 2: Within rapid typing debounce window (3s) for same action -> update existing entry
    if (
      latest &&
      latest.action === params.action &&
      Date.now() - new Date(latest.createdAt).getTime() < 3000
    ) {
      const updated: ToolHistoryEntry = {
        ...latest,
        input: safeInput,
        output: safeOutput ?? latest.output,
        options: params.options ?? latest.options,
        summary: params.summary ?? latest.summary,
        updatedAt: now,
        revision: latest.revision + 1,
      };
      await idbPut('tool_history', updated);
      await enqueueOutbox('tool_history', 'upsert', updated as unknown as Record<string, unknown>);
      globalThis.dispatchEvent(new CustomEvent('hckr-tool-history-changed', { detail: { toolId: params.toolId } }));
      return updated;
    }

    // Case 3: Create new entry
    const newEntry: ToolHistoryEntry = {
      id: `th-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      toolId: params.toolId,
      toolTitle: params.toolTitle,
      action: params.action,
      input: safeInput,
      output: safeOutput,
      options: params.options,
      summary: params.summary,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };

    await idbPut('tool_history', newEntry);

    // Enforce per-tool limit: prune oldest if > MAX_ENTRIES_PER_TOOL
    if (toolEntries.length >= MAX_ENTRIES_PER_TOOL) {
      const toRemove = toolEntries.slice(MAX_ENTRIES_PER_TOOL - 1);
      for (const old of toRemove) {
        await idbRemove('tool_history', old.id);
        await enqueueOutbox('tool_history', 'delete', { id: old.id });
      }
    }

    await enqueueOutbox('tool_history', 'upsert', newEntry as unknown as Record<string, unknown>);
    globalThis.dispatchEvent(new CustomEvent('hckr-tool-history-changed', { detail: { toolId: params.toolId } }));
    return newEntry;
  } catch (error) {
    console.error('Failed to record tool usage history:', error);
    return null;
  }
}

/**
 * List history entries sorted newest-first, optionally filtered by toolId.
 */
export async function listToolHistory(toolId?: string, limit = 100): Promise<ToolHistoryEntry[]> {
  try {
    const all = await idbValues<ToolHistoryEntry>('tool_history');
    const filtered = toolId ? all.filter((entry) => entry.toolId === toolId) : all;
    return filtered
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to list tool history:', error);
    return [];
  }
}

/**
 * Delete a single tool history record by id.
 */
export async function deleteToolHistoryEntry(id: string): Promise<void> {
  try {
    await idbRemove('tool_history', id);
    await enqueueOutbox('tool_history', 'delete', { id });
    globalThis.dispatchEvent(new CustomEvent('hckr-tool-history-changed'));
  } catch (error) {
    console.error('Failed to delete tool history entry:', error);
  }
}

/**
 * Clear all tool history entries, or only those for a specific tool.
 */
export async function clearToolHistory(toolId?: string): Promise<void> {
  try {
    const all = await idbValues<ToolHistoryEntry>('tool_history');
    const targets = toolId ? all.filter((entry) => entry.toolId === toolId) : all;
    for (const target of targets) {
      await idbRemove('tool_history', target.id);
      await enqueueOutbox('tool_history', 'delete', { id: target.id });
    }
    globalThis.dispatchEvent(new CustomEvent('hckr-tool-history-changed', { detail: { toolId } }));
  } catch (error) {
    console.error('Failed to clear tool history:', error);
  }
}
