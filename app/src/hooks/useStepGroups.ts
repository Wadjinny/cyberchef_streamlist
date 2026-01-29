import { useState, useMemo } from 'react'
import type { StepGroup } from '../types'
import { createGroup } from '../utils/factories'

export const useStepGroups = (initialGroups: StepGroup[], initialSelectedId: string | null) => {
  const [stepGroups, setStepGroups] = useState<StepGroup[]>(initialGroups)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialSelectedId)

  const activeGroup = useMemo(
    () => stepGroups.find((group) => group.id === selectedGroupId) ?? null,
    [stepGroups, selectedGroupId]
  )

  const addGroup = () => {
    setStepGroups((prev) => {
      const next = [...prev, createGroup(prev.length + 1)]
      setSelectedGroupId(next[next.length - 1].id)
      return next
    })
  }

  const updateGroupTitle = (id: string, title: string) => {
    setStepGroups((prev) =>
      prev.map((group) =>
        group.id === id ? { ...group, title, updatedAt: Date.now() } : group
      )
    )
  }

  const deleteGroup = (id: string) => {
    setStepGroups((prev) => {
      const next = prev.filter((group) => group.id !== id)
      if (selectedGroupId === id) {
        setSelectedGroupId(next[0]?.id ?? null)
      }
      return next
    })
  }

  const updateGroupInputText = (id: string, inputText: string) => {
    setStepGroups((prev) =>
      prev.map((group) =>
        group.id === id ? { ...group, inputText, updatedAt: Date.now() } : group
      )
    )
  }

  return {
    stepGroups,
    selectedGroupId,
    activeGroup,
    setStepGroups,
    addGroup,
    updateGroupTitle,
    deleteGroup,
    updateGroupInputText,
    setSelectedGroupId,
  }
}
