import type { StoredState } from '../types'
import { STORAGE_KEY, STORAGE_VERSION } from './constants'

export const loadStoredState = (): StoredState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        version: STORAGE_VERSION,
        stepGroups: [],
        selectedGroupId: null,
        selectedStepId: null,
        librarySteps: [],
      }
    }
    const parsed = JSON.parse(raw) as StoredState
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      return {
        version: STORAGE_VERSION,
        stepGroups: [],
        selectedGroupId: null,
        selectedStepId: null,
        librarySteps: [],
      }
    }
    return {
      version: STORAGE_VERSION,
      stepGroups: Array.isArray(parsed.stepGroups)
        ? parsed.stepGroups.map(group => ({
            ...group,
            inputText: group.inputText ?? '',
          }))
        : [],
      selectedGroupId: parsed.selectedGroupId ?? null,
      selectedStepId: parsed.selectedStepId ?? null,
      librarySteps: Array.isArray(parsed.librarySteps) ? parsed.librarySteps : [],
    }
  } catch {
    return {
      version: STORAGE_VERSION,
      stepGroups: [],
      selectedGroupId: null,
      selectedStepId: null,
      librarySteps: [],
    }
  }
}

export const saveToLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    // ignore
  }
}

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultValue
    const parsed = JSON.parse(raw)
    return parsed ?? defaultValue
  } catch {
    return defaultValue
  }
}
