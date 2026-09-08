/**
 * Shared constants for card labels, priorities, and due-date helpers.
 * Used by the Workspace board, card drawer, search/filter bar, and bulk-action toolbar.
 */

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

export type CardPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface PriorityDef {
  readonly id: CardPriority;
  readonly name: string;
  readonly color: string;
  readonly icon: string;
}

export const CARD_PRIORITIES: readonly PriorityDef[] = [
  { id: 'p0', name: 'P0 Critical', color: '#e74c3c', icon: '🔴' },
  { id: 'p1', name: 'P1 High', color: '#e67e22', icon: '🟠' },
  { id: 'p2', name: 'P2 Medium', color: '#f1c40f', icon: '🟡' },
  { id: 'p3', name: 'P3 Low', color: '#95a5a6', icon: '⚪' },
] as const;

export function getPriorityDef(id: CardPriority | undefined): PriorityDef | undefined {
  return id ? CARD_PRIORITIES.find((p) => p.id === id) : undefined;
}

// ---------------------------------------------------------------------------
// Labels (fixed set)
// ---------------------------------------------------------------------------

export type CardLabel = 'bug' | 'feature' | 'tech-debt' | 'research' | 'improvement' | 'blocked';

export interface LabelDef {
  readonly id: CardLabel;
  readonly name: string;
  readonly color: string;
}

export const CARD_LABELS: readonly LabelDef[] = [
  { id: 'bug', name: 'Bug', color: '#e74c3c' },
  { id: 'feature', name: 'Feature', color: '#3498db' },
  { id: 'tech-debt', name: 'Tech Debt', color: '#f39c12' },
  { id: 'research', name: 'Research', color: '#2ecc71' },
  { id: 'improvement', name: 'Improvement', color: '#9b59b6' },
  { id: 'blocked', name: 'Blocked', color: '#636e72' },
] as const;

export function getLabelDef(id: CardLabel | undefined): LabelDef | undefined {
  return id ? CARD_LABELS.find((l) => l.id === id) : undefined;
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  position: number;
}

export function checklistProgress(items: ChecklistItem[] | undefined): { done: number; total: number } {
  if (!items || items.length === 0) return { done: 0, total: 0 };
  return { done: items.filter((i) => i.checked).length, total: items.length };
}

// ---------------------------------------------------------------------------
// Due-date helpers
// ---------------------------------------------------------------------------

export type DueStatus = 'overdue' | 'today' | 'this-week' | 'future';

export function getDueStatus(dueDate: string | undefined): DueStatus | null {
  if (!dueDate) return null;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const due = new Date(dueDate + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'this-week';
  return 'future';
}

export function formatDueDate(dueDate: string): string {
  const status = getDueStatus(dueDate);
  const date = new Date(dueDate + 'T00:00:00');
  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (status === 'overdue') return `⚠️ ${formatted}`;
  if (status === 'today') return `📅 Today`;
  return formatted;
}
