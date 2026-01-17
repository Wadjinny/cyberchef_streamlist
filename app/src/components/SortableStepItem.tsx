import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StepItem } from './StepItem';
import type { ComponentProps } from 'react';
import { motion } from 'framer-motion';

type StepItemProps = ComponentProps<typeof StepItem>;

interface SortableStepItemProps extends StepItemProps {
  id: string;
  hasActiveDrag?: boolean;
  isDeleting?: boolean;
}

export function SortableStepItem({
  step,
  id,
  hasActiveDrag,
  isDeleting,
  style,
  ...props
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const combinedStyle = {
    ...style,
    transform: isDeleting
      ? 'translateX(-14px) scale(0.96)'
      : CSS.Transform.toString(transform),
    transition: isDeleting
      ? 'opacity 220ms ease, transform 220ms ease, max-height 220ms ease, padding 220ms ease, margin 220ms ease, border-width 220ms ease, filter 220ms ease'
      : transition,
    opacity: isDeleting ? 0 : isDragging ? 0.4 : 1,
    touchAction: 'none',
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative' as const,
    filter: isDeleting ? 'blur(1px)' : undefined,
    pointerEvents: isDeleting ? 'none' : undefined,
  };

  return (
    <motion.div
      layout={!hasActiveDrag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
    >
      <StepItem
        step={step}
        innerRef={setNodeRef}
        style={combinedStyle}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </motion.div>
  );
}
