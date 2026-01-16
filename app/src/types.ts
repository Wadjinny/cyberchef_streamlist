export type Step = {
  id: string
  title: string
  code: string
  muted: boolean
  createdAt: number
  updatedAt: number
}

export type StepGroup = {
  id: string
  title: string
  steps: Step[]
  createdAt: number
  updatedAt: number
}

export type LibraryStep = {
  id: string
  title: string
  code: string
  createdAt: number
  updatedAt: number
}

export type StoredState = {
  version: 1
  stepGroups: StepGroup[]
  selectedGroupId: string | null
  selectedStepId: string | null
  librarySteps: LibraryStep[]
}

export type RunScope = 'all' | 'from' | 'to'
