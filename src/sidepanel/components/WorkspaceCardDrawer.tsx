import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { CardComment, WorkspaceCard, WorkspaceColumn } from '../../shared/workspace';
import { formatRelativeTime } from '../../shared/cloudSync';
import {
  type CardPriority,
  type CardLabel,
  type ChecklistItem,
  CARD_PRIORITIES,
  CARD_LABELS,
  getDueStatus,
  formatDueDate,
  checklistProgress,
} from '../../shared/cardLabels';
import './WorkspaceCardDrawer.css';

export interface WorkspaceCardDrawerProps {
  card: WorkspaceCard | null;
  ticketKey?: string;
  initialColumnId?: string;
  columns: WorkspaceColumn[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    title: string;
    columnId: string;
    url: string;
    favIconUrl?: string;
    note: string;
    tags: string[];
    comments?: CardComment[];
    priority?: CardPriority;
    dueDate?: string;
    label?: CardLabel;
    checklist?: ChecklistItem[];
  }) => Promise<void>;
  onArchive?: (card: WorkspaceCard) => Promise<void>;
}


export const WorkspaceCardDrawer: React.FC<WorkspaceCardDrawerProps> = ({
  card,
  ticketKey,
  initialColumnId,
  columns,
  isOpen,
  onClose,
  onSave,
  onArchive,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [columnId, setColumnId] = useState('');
  const [comments, setComments] = useState<CardComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [priority, setPriority] = useState<CardPriority | undefined>();
  const [dueDate, setDueDate] = useState<string>('');
  const [label, setLabel] = useState<CardLabel | undefined>();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const prevCardIdRef = useRef<string | null>(null);

  // Sync state when card or initialColumnId changes
  useEffect(() => {
    if (card) {
      if (card.id !== prevCardIdRef.current || !isOpen) {
        setTitle(card.title);
        setUrl(card.url || '');
        setNote(card.note || '');
        setTagsInput(card.tags.join(', '));
        setColumnId(card.columnId);
        setComments(card.comments || []);
        setNewCommentText('');
        setPriority(card.priority);
        setDueDate(card.dueDate || '');
        setLabel(card.label);
        setChecklist(card.checklist || []);
        setNewChecklistText('');
        prevCardIdRef.current = card.id;
      } else if (card.comments && card.comments.length !== comments.length) {
        setComments(card.comments);
      }
    } else {
      setTitle('');
      setUrl('');
      setNote('');
      setTagsInput('');
      setColumnId(initialColumnId || columns[0]?.id || '');
      setComments([]);
      setNewCommentText('');
      setPriority(undefined);
      setDueDate('');
      setLabel(undefined);
      setChecklist([]);
      setNewChecklistText('');
      prevCardIdRef.current = null;
    }
    setSavedStatus(false);
  }, [card, initialColumnId, columns, isOpen, comments.length]);

  // Focus title input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const parsedTags = useCallback(() => {
    return tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tagsInput]);

  const handleSave = useCallback(async (closeOnSave = false) => {
    if (!title.trim()) return;
    try {
      await onSave({
        id: card?.id,
        title: title.trim(),
        columnId: columnId || columns[0]?.id || '',
        url: url.trim(),
        favIconUrl: card?.favIconUrl,
        note,
        tags: parsedTags(),
        comments,
        priority,
        dueDate,
        label,
        checklist,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
      if (closeOnSave) {
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  }, [card, columnId, columns, comments, note, onClose, onSave, parsedTags, title, url]);

  // Auto-save on blur for existing cards
  const handleBlur = useCallback(() => {
    if (card && title.trim()) {
      void onSave({
        id: card.id,
        title: title.trim(),
        columnId: columnId || columns[0]?.id || '',
        url: url.trim(),
        favIconUrl: card.favIconUrl,
        note,
        tags: parsedTags(),
        comments,
        priority,
        dueDate,
        label,
        checklist,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  }, [card, columnId, columns, comments, note, onSave, parsedTags, title, url]);

  const handleColumnChange = useCallback((newColId: string) => {
    setColumnId(newColId);
    if (card && title.trim()) {
      // Auto-save column change immediately
      void onSave({
        id: card.id,
        title: title.trim(),
        columnId: newColId,
        url: url.trim(),
        favIconUrl: card.favIconUrl,
        note,
        tags: parsedTags(),
        comments,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  }, [card, comments, note, onSave, parsedTags, title, url]);

  const handlePriorityChange = useCallback((newPriority: CardPriority | undefined) => {
    setPriority(newPriority);
    if (card && title.trim()) {
      void onSave({
        id: card.id,
        title: title.trim(),
        columnId: columnId || columns[0]?.id || '',
        url: url.trim(),
        favIconUrl: card.favIconUrl,
        note,
        tags: parsedTags(),
        comments,
        priority: newPriority,
        dueDate,
        label,
        checklist,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  }, [card, columnId, columns, comments, dueDate, label, checklist, note, onSave, parsedTags, title, url]);

  const handleDueDateChange = useCallback((newDueDate: string) => {
    setDueDate(newDueDate);
    if (card && title.trim()) {
      void onSave({
        id: card.id,
        title: title.trim(),
        columnId: columnId || columns[0]?.id || '',
        url: url.trim(),
        favIconUrl: card.favIconUrl,
        note,
        tags: parsedTags(),
        comments,
        priority,
        dueDate: newDueDate,
        label,
        checklist,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  }, [card, columnId, columns, comments, priority, label, checklist, note, onSave, parsedTags, title, url]);

  const handleLabelChange = useCallback((newLabel: CardLabel | undefined) => {
    setLabel(newLabel);
    if (card && title.trim()) {
      void onSave({
        id: card.id,
        title: title.trim(),
        columnId: columnId || columns[0]?.id || '',
        url: url.trim(),
        favIconUrl: card.favIconUrl,
        note,
        tags: parsedTags(),
        comments,
        priority,
        dueDate,
        label: newLabel,
        checklist,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  }, [card, columnId, columns, comments, priority, dueDate, checklist, note, onSave, parsedTags, title, url]);

  const handleChecklistChange = useCallback((newChecklist: ChecklistItem[]) => {
    setChecklist(newChecklist);
    if (card && title.trim()) {
      void onSave({
        id: card.id,
        title: title.trim(),
        columnId: columnId || columns[0]?.id || '',
        url: url.trim(),
        favIconUrl: card.favIconUrl,
        note,
        tags: parsedTags(),
        comments,
        priority,
        dueDate,
        label,
        checklist: newChecklist,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  }, [card, columnId, columns, comments, priority, dueDate, label, note, onSave, parsedTags, title, url]);

  const handleAddComment = useCallback(async () => {
    const text = newCommentText.trim();
    if (!text) return;
    const newComment: CardComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: 'You',
      text,
      createdAt: new Date().toISOString(),
    };
    const nextComments = [...comments, newComment];
    setComments(nextComments);
    setNewCommentText('');
    if (card && title.trim()) {
      await onSave({
        id: card.id,
        title: title.trim(),
        columnId: columnId || columns[0]?.id || '',
        url: url.trim(),
        favIconUrl: card.favIconUrl,
        note,
        tags: parsedTags(),
        comments: nextComments,
        priority,
        dueDate,
        label,
        checklist,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  }, [card, columnId, columns, comments, newCommentText, note, onSave, parsedTags, title, url]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    const nextComments = comments.filter((c) => c.id !== commentId);
    setComments(nextComments);
    if (card && title.trim()) {
      await onSave({
        id: card.id,
        title: title.trim(),
        columnId: columnId || columns[0]?.id || '',
        url: url.trim(),
        favIconUrl: card.favIconUrl,
        note,
        tags: parsedTags(),
        comments: nextComments,
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  }, [card, columnId, columns, comments, note, onSave, parsedTags, title, url]);

  const handleOpenUrl = useCallback(() => {
    if (url) {
      void chrome.tabs.create({ url, active: true });
    }
  }, [url]);

  const handleCopyUrl = useCallback(() => {
    if (url) {
      void navigator.clipboard.writeText(url);
    }
  }, [url]);

  return (
    <>
      <div
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`workspace-card-drawer ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={card ? 'Card details' : 'New card'}
      >
        <header className="drawer-header">
          <div className="drawer-header-left">
            {ticketKey ? (
              <span className="drawer-ticket-key" title="Ticket ID">
                {ticketKey}
              </span>
            ) : (
              <span className="drawer-badge">{card ? 'Card' : 'New Card'}</span>
            )}
            <div className="drawer-status-wrapper">
              <span className="drawer-status-label">STATUS</span>
              <select
                className="drawer-column-select drawer-status-select"
                value={columnId}
                onChange={(e) => handleColumnChange(e.target.value)}
                aria-label="Card status"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close card details"
            title="Close (Esc)"
          >
            ✕
          </button>
        </header>

        <div className="drawer-body">
          <div className="drawer-field">
            <label className="drawer-label" htmlFor="card-title-input">
              Title
            </label>
            <input
              id="card-title-input"
              ref={titleInputRef}
              className="drawer-title-input"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleBlur}
            />
          </div>

          <div className="drawer-field">
            <label className="drawer-label" htmlFor="card-url-input">
              URL / Link
            </label>
            <div className="drawer-url-row">
              <input
                id="card-url-input"
                className="input"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleBlur}
              />
              {url && (
                <div className="drawer-url-actions">
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={handleOpenUrl}
                    title="Open link in new tab"
                  >
                    ↗ Open
                  </button>
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={handleCopyUrl}
                    title="Copy URL"
                  >
                    📋
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="drawer-field">
            <label className="drawer-label" htmlFor="card-note-input">
              Description & Notes
            </label>
            <textarea
              id="card-note-input"
              className="drawer-textarea"
              placeholder="Add details, notes, or context for this card..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleBlur}
            />
          </div>

          <div className="drawer-field">
            <label className="drawer-label" htmlFor="card-tags-input">
              Tags
            </label>
            <input
              id="card-tags-input"
              className="input"
              placeholder="bug, feature, urgent (comma separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={handleBlur}
            />
            {parsedTags().length > 0 && (
              <div className="drawer-tags-list">
                {parsedTags().map((tag) => (
                  <span key={tag} className="drawer-tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Priority</label>
            <div className="drawer-priority-row">
              {CARD_PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  className={`drawer-priority-btn ${priority === p.id ? 'active' : ''}`}
                  style={priority === p.id ? { backgroundColor: p.color, borderColor: p.color, color: '#fff' } : {}}
                  onClick={() => handlePriorityChange(priority === p.id ? undefined : p.id)}
                  title={p.name}
                  type="button"
                >
                  <span aria-hidden="true">{p.icon}</span> {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="drawer-field">
            <label className="drawer-label" htmlFor="card-due-input">Due Date</label>
            <div className="drawer-due-row">
              <input
                id="card-due-input"
                type="date"
                className="drawer-due-input input"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
              />
              {dueDate && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleDueDateChange('')}
                    title="Clear due date"
                  >
                    Clear
                  </button>
                  <span className={`drawer-due-status ${getDueStatus(dueDate) || ''}`}>
                    {formatDueDate(dueDate)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Label</label>
            <div className="drawer-label-row">
              {CARD_LABELS.map((l) => (
                <button
                  key={l.id}
                  className={`drawer-label-pill ${label === l.id ? 'active' : ''}`}
                  style={
                    label === l.id
                      ? { backgroundColor: l.color, borderColor: l.color, color: '#fff' }
                      : { borderColor: l.color, color: l.color }
                  }
                  onClick={() => handleLabelChange(label === l.id ? undefined : l.id)}
                  type="button"
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          <div className="drawer-field">
            <div className="drawer-checklist-header">
              <label className="drawer-label">Checklist</label>
              {checklist.length > 0 && (
                <span className="drawer-checklist-progress">
                  {checklistProgress(checklist).done}/{checklistProgress(checklist).total} ✓
                </span>
              )}
            </div>
            <div className="drawer-checklist-section">
              {checklist.map((item) => (
                <div key={item.id} className={`drawer-checklist-item ${item.checked ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => {
                      const next = checklist.map((i) =>
                        i.id === item.id ? { ...i, checked: e.target.checked } : i
                      );
                      handleChecklistChange(next);
                    }}
                  />
                  <span>{item.text}</span>
                  <button
                    type="button"
                    onClick={() => handleChecklistChange(checklist.filter((i) => i.id !== item.id))}
                    title="Delete item"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <input
                type="text"
                className="drawer-checklist-add input"
                placeholder="Add an item... (Enter to add)"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!newChecklistText.trim()) return;
                    const newItem: ChecklistItem = {
                      id: `checklist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      text: newChecklistText.trim(),
                      checked: false,
                      position: checklist.length,
                    };
                    handleChecklistChange([...checklist, newItem]);
                    setNewChecklistText('');
                  }
                }}
              />
            </div>
          </div>

          {/* Activity / Comments Section */}
          <div className="drawer-field card-comments-section">
            <div className="card-comments-header">
              <label className="drawer-label" htmlFor="card-comment-input">
                Activity & Comments
              </label>
              <span className="card-comments-count-badge">
                {comments.length}
              </span>
            </div>

            {/* List of comments */}
            <div className="card-comments-list" aria-label="Card comments">
              {comments.length === 0 ? (
                <div className="card-comments-empty">
                  No comments yet. Leave a note or update below.
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="card-comment-item">
                    <div className="card-comment-header">
                      <div className="card-comment-author-group">
                        <span className="card-comment-avatar" aria-hidden="true">
                          {comment.author ? comment.author[0].toUpperCase() : 'Y'}
                        </span>
                        <span className="card-comment-author">{comment.author || 'You'}</span>
                        <span
                          className="card-comment-time"
                          title={new Date(comment.createdAt).toLocaleString()}
                        >
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <button
                        className="card-comment-delete-btn"
                        type="button"
                        onClick={() => void handleDeleteComment(comment.id)}
                        title="Delete comment"
                        aria-label="Delete comment"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="card-comment-text">{comment.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Add new comment composer */}
            <div className="card-comment-composer">
              <textarea
                id="card-comment-input"
                className="card-comment-textarea"
                placeholder="Add a comment... (Enter to send, Shift+Enter for newline)"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleAddComment();
                  }
                }}
              />
              <div className="card-comment-composer-footer">
                <span className="card-comment-composer-hint">Enter to submit</span>
                <button
                  className="btn btn-sm btn-primary"
                  type="button"
                  disabled={!newCommentText.trim()}
                  onClick={() => void handleAddComment()}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>

          {card && (
            <div className="drawer-meta-info">
              <div className="drawer-meta-item">
                <span className="drawer-meta-label">Created:</span>
                <span className="drawer-meta-value" title={new Date(card.createdAt).toLocaleString()}>
                  {formatRelativeTime(card.createdAt)}{' '}
                  <span className="drawer-meta-full">({new Date(card.createdAt).toLocaleString()})</span>
                </span>
              </div>
              <div className="drawer-meta-item">
                <span className="drawer-meta-label">Updated:</span>
                <span className="drawer-meta-value" title={new Date(card.updatedAt).toLocaleString()}>
                  {formatRelativeTime(card.updatedAt)}{' '}
                  <span className="drawer-meta-full">({new Date(card.updatedAt).toLocaleString()})</span>
                </span>
              </div>
            </div>
          )}
        </div>

        <footer className="drawer-footer">
          <div className="drawer-footer-left">
            {card && onArchive && (
              <button
                className="btn btn-sm btn-danger"
                type="button"
                onClick={async () => {
                  await onArchive(card);
                  onClose();
                }}
              >
                Archive
              </button>
            )}
            {savedStatus && (
              <span className="drawer-saved-status">✓ Saved</span>
            )}
          </div>
          <div className="drawer-footer-right">
            <button className="btn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!title.trim()}
              onClick={() => void handleSave(true)}
            >
              {card ? 'Save changes' : 'Create card'}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
};

export const WorkspaceCardModal = WorkspaceCardDrawer;
