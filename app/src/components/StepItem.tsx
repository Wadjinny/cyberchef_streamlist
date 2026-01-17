import { memo } from 'react';
import type { Step } from '../types';

type StepItemProps = {
  step: Step;
  index: number;
  isSelected: boolean;
  dropTargetIndex: number | null;
  editingTitleStepId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  setEditingTitleStepId: (id: string | null) => void;
  onToggleMuted: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: any;
  style?: React.CSSProperties;
  className?: string;
  innerRef?: React.Ref<HTMLDivElement>;
  // Allow other props
  [key: string]: any;
};

export const StepItem = memo(({
  step,
  index,
  isSelected,
  dropTargetIndex,
  editingTitleStepId,
  onSelect,
  onContextMenu,
  onUpdateTitle,
  setEditingTitleStepId,
  onToggleMuted,
  onDelete,
  dragHandleProps,
  style,
  className,
  innerRef,
  ...props
}: StepItemProps) => {
  return (
    <div
      ref={innerRef}
      className={`step-item ${step.muted ? 'is-muted' : ''} ${isSelected ? 'active' : ''} ${dropTargetIndex === index ? 'drop-target' : ''} ${className || ''}`}
      onClick={() => onSelect(step.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, step.id);
      }}
      role="button"
      tabIndex={0}
      style={style}
      {...props}
      {...dragHandleProps}
      onKeyDown={(event) => {
        // Merge our interaction with dnd-kit keyboard handling
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(step.id);
        }
        if (dragHandleProps?.onKeyDown) {
          dragHandleProps.onKeyDown(event);
        }
      }}
    >
      <div className="step-title">
        {editingTitleStepId === step.id ? (
          <input
            autoFocus
            className="step-title-input"
            value={step.title}
            onChange={(e) => onUpdateTitle(step.id, e.target.value)}
            onBlur={() => setEditingTitleStepId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingTitleStepId(null);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span onDoubleClick={() => setEditingTitleStepId(step.id)}>
              {step.title || `title ${index + 1}`}
            </span>
            <span className="step-meta">
              {new Date(step.createdAt).toLocaleString()}
            </span>
          </div>
        )}
        {step.muted && <span className="badge">Muted</span>}
      </div>
      <div className="step-actions">
        <button
          type="button"
          className="ghost"
          title={step.muted ? 'Unmute step' : 'Mute step'}
          aria-label={step.muted ? 'Unmute step' : 'Mute step'}
          onClick={(event) => {
            event.stopPropagation();
            onToggleMuted(step.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {step.muted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a4 4 0 010 7" />
              <path d="M18 6a7 7 0 010 12" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="ghost danger"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(step.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ✕
        </button>
      </div>
    </div>
  );
});
