import type { Step, StepGroup, LibraryStep } from '../types'
import { DEFAULT_CODE } from './constants'

export const createStep = (index: number): Step => ({
  id: crypto.randomUUID(),
  title: `title ${index}`,
  code: DEFAULT_CODE,
  muted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const createGroup = (index: number): StepGroup => ({
  id: crypto.randomUUID(),
  title: `Group ${index}`,
  steps: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const createLibraryStep = (index: number, seed?: Step): LibraryStep => ({
  id: crypto.randomUUID(),
  title: seed?.title ?? `Library Step ${index}`,
  code: seed?.code ?? DEFAULT_CODE,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})
