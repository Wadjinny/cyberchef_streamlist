import { useState, useMemo, useCallback } from 'react'
import type { Step, StepGroup } from '../types'
import { createStep } from '../utils/factories'

export const useSteps = (
  activeGroup: StepGroup | null,
  initialSelectedStepId: string | null,
  setStepGroups: React.Dispatch<React.SetStateAction<StepGroup[]>>
) => {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(initialSelectedStepId)
  const [editingTitleStepId, setEditingTitleStepId] = useState<string | null>(null)
  const [deletingStepIds, setDeletingStepIds] = useState<Record<string, true>>({})

  const activeSteps = useMemo(() => activeGroup?.steps ?? [], [activeGroup])

  const selectedStep = useMemo(
    () => activeSteps.find((step) => step.id === selectedStepId) ?? null,
    [activeSteps, selectedStepId]
  )

  const updateActiveSteps = useCallback(
    (updater: (prev: Step[]) => Step[]) => {
      if (!activeGroup) return
      setStepGroups((prev) =>
        prev.map((group) =>
          group.id === activeGroup.id
            ? { ...group, steps: updater(group.steps), updatedAt: Date.now() }
            : group
        )
      )
    },
    [activeGroup, setStepGroups]
  )

  const addStep = () => {
    if (!activeGroup) return
    updateActiveSteps((prev) => {
      const next = [...prev, createStep(prev.length + 1)]
      setSelectedStepId(next[next.length - 1].id)
      return next
    })
  }

  const updateStep = (id: string, updates: Partial<Step>) => {
    updateActiveSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, ...updates, updatedAt: Date.now() } : step
      )
    )
  }

  const deleteStep = (id: string) => {
    updateActiveSteps((prev) => {
      const next = prev.filter((step) => step.id !== id)
      if (selectedStepId === id) {
        setSelectedStepId(next[0]?.id ?? null)
      }
      return next
    })
  }

  const requestDeleteStep = (id: string) => {
    setDeletingStepIds((prev) => ({ ...prev, [id]: true }))
    window.setTimeout(() => {
      deleteStep(id)
      // Cleanup after unmount
      window.setTimeout(() => {
        setDeletingStepIds((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, 0)
    }, 220)
  }

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (!activeGroup) return
    updateActiveSteps((prev) => {
      const next = [...prev]
      if (fromIndex < 0 || fromIndex >= next.length || toIndex < 0 || toIndex >= next.length) {
        return next
      }
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  return {
    activeSteps,
    selectedStepId,
    selectedStep,
    editingTitleStepId,
    deletingStepIds,
    addStep,
    updateStep,
    deleteStep,
    requestDeleteStep,
    moveStep,
    setSelectedStepId,
    setEditingTitleStepId,
    updateActiveSteps,
  }
}
