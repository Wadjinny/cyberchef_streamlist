import { useState, useMemo } from 'react'
import type { Step, LibraryStep } from '../types'
import { createLibraryStep } from '../utils/factories'

export const useLibrary = (
  activeSteps: Step[],
  initialLibrarySteps: LibraryStep[],
  updateActiveSteps: (updater: (prev: Step[]) => Step[]) => void,
  setSelectedStepId: (id: string) => void
) => {
  const [librarySteps, setLibrarySteps] = useState<LibraryStep[]>(initialLibrarySteps)
  const [selectedLibraryStepId, setSelectedLibraryStepId] = useState<string | null>(null)
  const [editingLibraryTitleId, setEditingLibraryTitleId] = useState<string | null>(null)
  const [libraryDropTargetIndex, setLibraryDropTargetIndex] = useState<number | null>(null)

  const selectedLibraryStep = useMemo(
    () => librarySteps.find((step) => step.id === selectedLibraryStepId) ?? null,
    [librarySteps, selectedLibraryStepId]
  )

  const addLibraryStep = () => {
    setLibrarySteps((prev) => [...prev, createLibraryStep(prev.length + 1)])
  }

  const updateLibraryStep = (id: string, updates: Partial<LibraryStep>) => {
    setLibrarySteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, ...updates, updatedAt: Date.now() } : step
      )
    )
  }

  const deleteLibraryStep = (id: string) => {
    setLibrarySteps((prev) => prev.filter((step) => step.id !== id))
    if (selectedLibraryStepId === id) {
      setSelectedLibraryStepId(null)
    }
  }

  const moveLibraryStep = (fromIndex: number, toIndex: number) => {
    setLibrarySteps((prev) => {
      const next = [...prev]
      if (fromIndex < 0 || fromIndex >= next.length || toIndex < 0 || toIndex >= next.length) {
        return next
      }
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const saveStepToLibrary = (stepToSave?: Step) => {
    if (!stepToSave) return
    const target = activeSteps.find((s) => s.id === stepToSave.id) ?? stepToSave
    setLibrarySteps((prev) => [...prev, createLibraryStep(prev.length + 1, target)])
  }

  const addStepFromLibrary = (libraryStep: LibraryStep, index?: number) => {
    updateActiveSteps((prev) => {
      const newStep: Step = {
        id: crypto.randomUUID(),
        title: libraryStep.title,
        code: libraryStep.code,
        muted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      const next = [...prev]
      if (typeof index === 'number') {
        next.splice(index, 0, newStep)
      } else {
        next.push(newStep)
      }
      setSelectedStepId(newStep.id)
      return next
    })
  }

  return {
    librarySteps,
    selectedLibraryStepId,
    selectedLibraryStep,
    editingLibraryTitleId,
    libraryDropTargetIndex,
    addLibraryStep,
    updateLibraryStep,
    deleteLibraryStep,
    moveLibraryStep,
    saveStepToLibrary,
    addStepFromLibrary,
    setSelectedLibraryStepId,
    setEditingLibraryTitleId,
    setLibraryDropTargetIndex,
  }
}
