import { useState, useMemo } from 'react'
import type { StepGroup, Step, LibraryStep } from '../types'

export const useSearch = (
  stepGroups: StepGroup[],
  activeSteps: Step[],
  librarySteps: LibraryStep[]
) => {
  const [groupSearch, setGroupSearch] = useState('')
  const [stepSearch, setStepSearch] = useState('')
  const [librarySearch, setLibrarySearch] = useState('')

  const visibleGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase()
    if (!query) return stepGroups
    return stepGroups.filter((group) => group.title.toLowerCase().includes(query))
  }, [groupSearch, stepGroups])

  const visibleSteps = useMemo(() => {
    const query = stepSearch.trim().toLowerCase()
    if (!query) return activeSteps
    return activeSteps.filter(
      (step) =>
        step.title.toLowerCase().includes(query) ||
        step.code.toLowerCase().includes(query)
    )
  }, [stepSearch, activeSteps])

  const visibleLibrarySteps = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()
    if (!query) return librarySteps
    return librarySteps.filter(
      (step) =>
        step.title.toLowerCase().includes(query) ||
        step.code.toLowerCase().includes(query)
    )
  }, [librarySearch, librarySteps])

  return {
    groupSearch,
    stepSearch,
    librarySearch,
    visibleGroups,
    visibleSteps,
    visibleLibrarySteps,
    setGroupSearch,
    setStepSearch,
    setLibrarySearch,
  }
}
