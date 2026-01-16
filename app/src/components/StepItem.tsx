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
      className={`step-item ${isSelected ? 'active' : ''} ${dropTargetIndex === index ? 'drop-target' : ''} ${className || ''}`}
      onClick={() => onSelect(step.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, step.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(step.id);
        }
      }}
      role="button"
      tabIndex={0}
      style={style}
      {...dragHandleProps}
      {...props}
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
          <span onDoubleClick={() => setEditingTitleStepId(step.id)}>
            {step.title || `title ${index + 1}`}
          </span>
        )}
        {step.muted && <span className="badge">Muted</span>}
      </div>
      <div className="step-actions">
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
