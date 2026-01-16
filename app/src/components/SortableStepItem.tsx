import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StepItem } from './StepItem';
import type { ComponentProps } from 'react';
import { motion } from 'framer-motion';

type StepItemProps = ComponentProps<typeof StepItem>;

interface SortableStepItemProps extends StepItemProps {
  id: string;
  hasActiveDrag?: boolean;
}

export function SortableStepItem({ step, id, hasActiveDrag, style, ...props }: SortableStepItemProps) {
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
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    touchAction: 'none',
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
