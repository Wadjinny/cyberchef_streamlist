import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { Monaco } from '@monaco-editor/react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import './App.css'
import { StepItem } from './components/StepItem'
import { SortableStepItem } from './components/SortableStepItem'
import { Droppable } from './components/Droppable'
import type { Step, StepGroup, LibraryStep, StoredState, RunScope } from './types'
import { AnimatePresence } from 'framer-motion'

const BUBBLE_DELAY = 20
const STORAGE_KEY = 'text-transformer-steps-v1'
const STORAGE_VERSION = 1
const DEFAULT_CODE = `return input`
const HELPERS_LIB = `type Helpers = {
  upper(value: string): string
  lower(value: string): string
  trim(value: string): string
}

declare const helpers: Helpers
declare const input: string
`

const helpers = {
  upper: (value: string) => value.toUpperCase(),
  lower: (value: string) => value.toLowerCase(),
  trim: (value: string) => value.trim(),
}

const createStep = (index: number): Step => ({
  id: crypto.randomUUID(),
  title: `title ${index}`,
  code: DEFAULT_CODE,
  muted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const createGroup = (index: number): StepGroup => ({
  id: crypto.randomUUID(),
  title: `Group ${index}`,
  steps: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const createLibraryStep = (index: number, seed?: Step): LibraryStep => ({
  id: crypto.randomUUID(),
  title: seed?.title ?? `Library Step ${index}`,
  code: seed?.code ?? DEFAULT_CODE,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const loadStoredState = (): StoredState => {
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
      stepGroups: Array.isArray(parsed.stepGroups) ? parsed.stepGroups : [],
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

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

function App() {
  const didInitMonaco = useRef(false)
  const stored = useMemo(() => loadStoredState(), [])
  const [stepGroups, setStepGroups] = useState<StepGroup[]>(stored.stepGroups)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    stored.selectedGroupId,
  )
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    stored.selectedStepId,
  )
  const [librarySteps, setLibrarySteps] = useState<LibraryStep[]>(
    stored.librarySteps,
  )
  const [selectedLibraryStepId, setSelectedLibraryStepId] = useState<string | null>(
    null,
  )
  const [groupSearch, setGroupSearch] = useState('')
  const [librarySearch, setLibrarySearch] = useState('')
  const [stepSearch, setStepSearch] = useState('')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [inputLanguage, setInputLanguage] = useState('plaintext')
  const [outputLanguage, setOutputLanguage] = useState('plaintext')
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [runScope] = useState<RunScope>('all')
  const [scopeStepId, setScopeStepId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    stepId: string
  } | null>(null)
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(true)
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true)
  const [isDraggingOverSidebar, setIsDraggingOverSidebar] = useState(false)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [editingTitleStepId, setEditingTitleStepId] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && over.id === 'library-droppable' && activeGroup) {
      const stepToSave = activeSteps.find((step) => step.id === active.id)
      if (stepToSave) {
        saveStepToLibrary(stepToSave)
      }
    } else if (over && active.id !== over.id && activeGroup) {
      const oldIndex = activeSteps.findIndex((step) => step.id === active.id)
      const newIndex = activeSteps.findIndex((step) => step.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        moveStep(oldIndex, newIndex)
      }
    }

    setActiveDragId(null)
  }

  const activeGroup = stepGroups.find((group) => group.id === selectedGroupId) ?? null
  const activeSteps = activeGroup?.steps ?? []
  const selectedStep = activeSteps.find((step) => step.id === selectedStepId) ?? null
  const selectedLibraryStep =
    librarySteps.find((step) => step.id === selectedLibraryStepId) ?? null

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    const state: StoredState = {
      version: STORAGE_VERSION,
      stepGroups,
      selectedGroupId,
      selectedStepId,
      librarySteps,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [stepGroups, selectedGroupId, selectedStepId, librarySteps])

  useEffect(() => {
    if (!activeGroup) {
      setSelectedStepId(null)
      return
    }
    if (!activeSteps.length) {
      setSelectedStepId(null)
      return
    }
    if (!selectedStepId || !activeSteps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(activeSteps[0].id)
    }
  }, [activeGroup, activeSteps, selectedStepId])

  useEffect(() => {
    if (runScope !== 'all' && selectedStep) {
      setScopeStepId(selectedStep.id)
    }
  }, [runScope, selectedStep])

  const visibleSteps = useMemo(() => {
    const query = stepSearch.trim().toLowerCase()
    if (!query) return activeSteps
    return activeSteps.filter(
      (step) =>
        step.title.toLowerCase().includes(query) ||
        step.code.toLowerCase().includes(query),
    )
  }, [stepSearch, activeSteps])

  const visibleGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase()
    if (!query) return stepGroups
    return stepGroups.filter((group) => group.title.toLowerCase().includes(query))
  }, [groupSearch, stepGroups])

  const visibleLibrarySteps = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()
    if (!query) return librarySteps
    return librarySteps.filter(
      (step) =>
        step.title.toLowerCase().includes(query) ||
        step.code.toLowerCase().includes(query),
    )
  }, [librarySearch, librarySteps])

  const updateActiveSteps = (updater: (prev: Step[]) => Step[]) => {
    if (!activeGroup) return
    setStepGroups((prev) =>
      prev.map((group) =>
        group.id === activeGroup.id
          ? { ...group, steps: updater(group.steps), updatedAt: Date.now() }
          : group,
      ),
    )
  }

  const addGroup = () => {
    setStepGroups((prev) => {
      const next = [...prev, createGroup(prev.length + 1)]
      setSelectedGroupId(next[next.length - 1].id)
      setSelectedStepId(null)
      return next
    })
  }

  const updateGroupTitle = (id: string, title: string) => {
    setStepGroups((prev) =>
      prev.map((group) =>
        group.id === id ? { ...group, title, updatedAt: Date.now() } : group,
      ),
    )
  }

  const deleteGroup = (id: string) => {
    setStepGroups((prev) => {
      const next = prev.filter((group) => group.id !== id)
      if (selectedGroupId === id) {
        setSelectedGroupId(next[0]?.id ?? null)
        setSelectedStepId(null)
      }
      return next
    })
  }

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
        step.id === id ? { ...step, ...updates, updatedAt: Date.now() } : step,
      ),
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

  const addLibraryStep = () => {
    setLibrarySteps((prev) => [...prev, createLibraryStep(prev.length + 1)])
  }

  const updateLibraryStep = (id: string, updates: Partial<LibraryStep>) => {
    setLibrarySteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, ...updates, updatedAt: Date.now() } : step,
      ),
    )
  }

  const deleteLibraryStep = (id: string) => {
    setLibrarySteps((prev) => prev.filter((step) => step.id !== id))
    if (selectedLibraryStepId === id) {
      setSelectedLibraryStepId(null)
    }
  }

  const saveStepToLibrary = (stepToSave?: Step) => {
    const target = stepToSave ?? selectedStep
    if (!target) return
    setLibrarySteps((prev) => [...prev, createLibraryStep(prev.length + 1, target)])
  }

  const addStepFromLibrary = (libraryStep: LibraryStep, index?: number) => {
    if (!activeGroup) return
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

  const resolveScopeSteps = useCallback(
    (scope: RunScope, anchorId: string | null) => {
      if (scope === 'all') return activeSteps
      const anchor = anchorId ?? selectedStep?.id
      if (!anchor) return activeSteps
      const anchorIndex = activeSteps.findIndex((step) => step.id === anchor)
      if (anchorIndex < 0) return activeSteps
      if (scope === 'from') return activeSteps.slice(anchorIndex)
      return activeSteps.slice(0, anchorIndex + 1)
    },
    [activeSteps, selectedStep],
  )

  const executePipeline = useCallback(
    (scope: RunScope, anchorId: string | null) => {
      const errors: Record<string, string> = {}
      let current = inputText
      const pipeline = resolveScopeSteps(scope, anchorId)
      for (const step of pipeline) {
        if (step.muted) continue
        try {
          const fn = new Function('input', 'helpers', step.code) as (
            input: string,
            helpers: Record<string, (value: string) => string>,
          ) => unknown
          const result = fn(current, helpers)
          current = String(result ?? '')
        } catch (error) {
          errors[step.id] = getErrorMessage(error)
          return { output: current, errors, failedStep: step }
        }
      }
      return { output: current, errors, failedStep: null as Step | null }
    },
    [inputText, resolveScopeSteps],
  )

  const runPipeline = useCallback(
    (scope = runScope, anchorId = scopeStepId) => {
      const result = executePipeline(scope, anchorId)
      setStepErrors(result.errors)
      if (result.failedStep) {
        setOutputText(
          `Error in "${result.failedStep.title}": ${result.errors[result.failedStep.id]}`,
        )
      } else {
        setOutputText(result.output)
      }
    },
    [executePipeline, runScope, scopeStepId],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!activeGroup) return
      runPipeline()
    }, BUBBLE_DELAY)
    return () => window.clearTimeout(timer)
  }, [inputText, activeSteps, runScope, scopeStepId, runPipeline, activeGroup])

  const handleEditorBeforeMount = useCallback((monaco: Monaco) => {
    if (didInitMonaco.current) return
    didInitMonaco.current = true
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowJs: true,
      allowNonTsExtensions: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
    })
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      HELPERS_LIB,
      'file:///helpers.d.ts',
    )
  }, [])

  const scopeLabel =
    runScope === 'all'
      ? 'Running all steps'
      : runScope === 'from'
        ? 'Muted steps above selected'
        : 'Muted steps below selected'

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="app">
        <aside
          className={`sidebar ${isDraggingOverSidebar ? 'drag-over' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            const isReorder = event.dataTransfer.types.includes('text/plain')
            event.dataTransfer.dropEffect = isReorder ? 'move' : 'copy'
            if (!isDraggingOverSidebar) setIsDraggingOverSidebar(true)
          }}
          onDragLeave={(event) => {
            // Only unset if we are actually leaving the sidebar, not entering a child
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDraggingOverSidebar(false)
            }
          }}
          onDragEnd={() => setIsDraggingOverSidebar(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDraggingOverSidebar(false)
            
            const textData = event.dataTransfer.getData('text/plain')
            if (textData && textData.startsWith('REORDER:')) {
               const fromIndex = parseInt(textData.replace('REORDER:', ''), 10)
               if (!isNaN(fromIndex)) {
                   moveStep(fromIndex, activeSteps.length - 1)
               }
               return
            }

            const data = event.dataTransfer.getData('application/json')
            if (!data) return
            try {
              const libraryStep = JSON.parse(data) as LibraryStep
              addStepFromLibrary(libraryStep)
            } catch {
              // ignore
            }
          }}
        >
          <div className="sidebar-header">
            <h2>Steps</h2>
            <button className="primary" onClick={addStep} disabled={!activeGroup}>
              + Add Step
            </button>
          </div>
          <input
            className="search"
            placeholder="Search steps"
            value={stepSearch}
            onChange={(event) => setStepSearch(event.target.value)}
            disabled={!activeGroup}
          />
          <div
            className="step-list"
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const data = event.dataTransfer.getData('application/json')
              if (!data) return
              try {
                const libraryStep = JSON.parse(data) as LibraryStep
                // If dropped directly on the list (not on an item), add to end
                addStepFromLibrary(libraryStep)
              } catch {
                // ignore invalid data
              }
            }}
          >
            <SortableContext
              items={visibleSteps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
              disabled={!!stepSearch}
            >
              <AnimatePresence mode='popLayout'>
                {visibleSteps.map((step, index) => (
                  <SortableStepItem
                    key={step.id}
                    id={step.id}
                    step={step}
                    index={index}
                    hasActiveDrag={!!activeDragId}
                    isSelected={step.id === selectedStep?.id}
                    dropTargetIndex={dropTargetIndex}
                    editingTitleStepId={editingTitleStepId}
                    onSelect={setSelectedStepId}
                    onContextMenu={(e: React.MouseEvent, id: string) => {
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        stepId: id,
                      })
                    }}
                    onUpdateTitle={(id: string, title: string) => updateStep(id, { title })}
                    setEditingTitleStepId={setEditingTitleStepId}
                    onDelete={deleteStep}
                    onDragOver={(event: React.DragEvent) => {
                      event.preventDefault()
                      event.stopPropagation()
                      event.dataTransfer.dropEffect = 'copy'
                      setDropTargetIndex(index)
                    }}
                    onDragLeave={() => {
                      if (dropTargetIndex === index) {
                        setDropTargetIndex(null)
                      }
                    }}
                    onDrop={(event: React.DragEvent) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setDropTargetIndex(null)

                      const jsonData = event.dataTransfer.getData('application/json')
                      if (jsonData) {
                        try {
                          const libraryStep = JSON.parse(jsonData)
                          if (libraryStep && typeof libraryStep.title === 'string') {
                            addStepFromLibrary(libraryStep, index)
                          }
                        } catch {
                          // ignore
                        }
                      }
                    }}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
            {!activeGroup && (
              <div className="empty">Create or load a group to manage steps.</div>
            )}
            {activeGroup && !activeSteps.length && (
              <div className="empty">This group is empty. Add your first step.</div>
            )}
          </div>
        </aside>

        <main className="app-main">

        {!activeGroup ? (
          <section className="panel group-picker">
            <div className="panel-header">
              <div>
                <h2>Create or load a step group</h2>
                <p className="subtitle">
                  Start with a blank group or open an existing group.
                </p>
              </div>
              <button className="primary" onClick={addGroup}>
                + New Group
              </button>
            </div>
            <div className="group-list">
              {visibleGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="group-item"
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <span>{group.title}</span>
                  <span className="muted">{group.steps.length} steps</span>
                </button>
              ))}
              {!stepGroups.length && (
                <div className="empty">No saved groups yet.</div>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="panel editor">
              <div className="panel-header">
                <div>
                  <h2>Step Editor</h2>
                  <p className="subtitle">{scopeLabel}</p>
                </div>
              </div>
              {selectedStep ? (
                <>
                  <div className="field">
                    <label htmlFor="step-title">Title</label>
                    <input
                      id="step-title"
                      value={selectedStep.title}
                      onChange={(event) =>
                        updateStep(selectedStep.id, { title: event.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="step-code">JavaScript</label>
                    <div className="code-editor" id="step-code">
                      <Editor
                        height="220px"
                        language="javascript"
                        theme="vs-light"
                        beforeMount={handleEditorBeforeMount}
                        value={selectedStep.code}
                        onChange={(value) =>
                          updateStep(selectedStep.id, { code: value ?? '' })
                        }
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: 'on',
                          quickSuggestions: true,
                          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                          tabSize: 2,
                          wordWrap: 'on',
                        }}
                      />
                    </div>
                  </div>
                  <div className="toggle-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedStep.muted}
                        onChange={(event) =>
                          updateStep(selectedStep.id, { muted: event.target.checked })
                        }
                      />
                      Mute this step
                    </label>
                  </div>
          <div className="toggle-row">
            <button
              type="button"
              className="ghost"
              onClick={() => saveStepToLibrary()}
            >
              Save to library
            </button>
            <span className="muted">Helpers: upper, lower, trim</span>
          </div>
                </>
              ) : (
                <div className="empty">Select a step to begin editing.</div>
              )}
            </section>
            <section className="panel io">
              <div className="io-panel">
                <div className="panel-header">
                  <h2>Input</h2>
                  <select
                    className="lang-select"
                    value={inputLanguage}
                    onChange={(event) => setInputLanguage(event.target.value)}
                  >
                    <option value="plaintext">Plain text</option>
                    <option value="javascript">JavaScript</option>
                    <option value="json">JSON</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="markdown">Markdown</option>
                    <option value="xml">XML</option>
                  </select>
                </div>
                <div className="io-editor">
                  <Editor
                    height="100%"
                    language={inputLanguage}
                    theme="vs-light"
                    beforeMount={handleEditorBeforeMount}
                    value={inputText}
                    onChange={(value) => setInputText(value ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      quickSuggestions: true,
                      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                      tabSize: 2,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </div>
              <div className="io-panel">
                <div 
                className="panel-header"                 
                >
                  <h2>Output</h2>
                  <select
                    className="lang-select"
                    value={outputLanguage}
                    onChange={(event) => setOutputLanguage(event.target.value)}
                  >
                    <option value="plaintext">Plain text</option>
                    <option value="javascript">JavaScript</option>
                    <option value="json">JSON</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="markdown">Markdown</option>
                    <option value="xml">XML</option>
                  </select>
                </div>
                <div className="io-editor"
                    style={{
                      outline: Object.keys(stepErrors).length > 0 ? 'solid 1px red' : 'none'}}
                >
                  <Editor
                    height="100%"
                    language={outputLanguage}
                    theme="vs-light"
                    beforeMount={handleEditorBeforeMount}
                    value={outputText}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                      tabSize: 2,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Droppable id="library-droppable" className="sidebar library">
        <div className="library-section">
          <div className="sidebar-header">
            <h2
              onClick={() => setIsGroupsExpanded((prev) => !prev)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Step Groups {isGroupsExpanded ? '▼' : '▶'}
            </h2>
            <button className="primary" onClick={addGroup}>
              + New Group
            </button>
          </div>
          {isGroupsExpanded && (
            <>
              <input
                className="search"
                placeholder="Search groups"
                value={groupSearch}
                onChange={(event) => setGroupSearch(event.target.value)}
              />
              <div className="group-list">
                {visibleGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`group-row ${group.id === selectedGroupId ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="group-select"
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <span>{group.title}</span>
                      <span className="muted">{group.steps.length} steps</span>
                    </button>
                    <div className="group-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          const nextTitle = window.prompt('Group title', group.title)
                          if (nextTitle !== null && nextTitle.trim()) {
                            updateGroupTitle(group.id, nextTitle.trim())
                          }
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => deleteGroup(group.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!stepGroups.length && (
                  <div className="empty">Create your first group to get started.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="library-section">
          <div className="sidebar-header">
            <h2
              onClick={() => setIsLibraryExpanded((prev) => !prev)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Steps Library {isLibraryExpanded ? '▼' : '▶'}
            </h2>
            <button className="primary" onClick={addLibraryStep}>
              + New Step
            </button>
          </div>
          {isLibraryExpanded && (
            <>
              <input
                className="search"
                placeholder="Search library"
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
              />
              <div className="library-list">
                {visibleLibrarySteps.map((step) => (
                  <div
                    key={step.id}
                    className={`library-item ${step.id === selectedLibraryStep?.id ? 'active' : ''}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/json', JSON.stringify(step))
                      event.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <button
                      type="button"
                      className="library-select"
                      onClick={() => setSelectedLibraryStepId(step.id)}
                    >
                      <span>{step.title}</span>
                    </button>
                    <div className="library-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => addStepFromLibrary(step)}
                        disabled={!activeGroup}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => deleteLibraryStep(step.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!librarySteps.length && (
                  <div className="empty">Save a step to build your library.</div>
                )}
              </div>
              {selectedLibraryStep && (
                <div className="library-editor">
                  <div className="field">
                    <label htmlFor="library-title">Library title</label>
                    <input
                      id="library-title"
                      value={selectedLibraryStep.title}
                      onChange={(event) =>
                        updateLibraryStep(selectedLibraryStep.id, {
                          title: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="library-code">Library code</label>
                    <div className="code-editor" id="library-code">
                      <Editor
                        height="180px"
                        language="javascript"
                        theme="vs-light"
                        beforeMount={handleEditorBeforeMount}
                        value={selectedLibraryStep.code}
                        onChange={(value) =>
                          updateLibraryStep(selectedLibraryStep.id, {
                            code: value ?? '',
                          })
                        }
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: 'on',
                          quickSuggestions: true,
                          scrollbar: {
                            verticalScrollbarSize: 6,
                            horizontalScrollbarSize: 6,
                          },
                          tabSize: 2,
                          wordWrap: 'on',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Droppable>
      <DragOverlay>
        {activeDragId ? (
          <StepItem
            step={activeSteps.find((s) => s.id === activeDragId)!}
            index={-1}
            isSelected={activeDragId === selectedStepId}
            dropTargetIndex={null}
            editingTitleStepId={null}
            onSelect={() => {}}
            onContextMenu={() => {}}
            onUpdateTitle={() => {}}
            setEditingTitleStepId={() => {}}
            onDelete={() => {}}
            style={{
              boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
              cursor: 'grabbing',
              background: '#fff',
            }}
          />
        ) : null}
      </DragOverlay>
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              const step = activeSteps.find((s) => s.id === contextMenu.stepId)
              if (step) {
                saveStepToLibrary(step)
              }
              setContextMenu(null)
            }}
          >
            Save to library
          </button>
        </div>
      )}
    </div>
    </DndContext>
  )
}

export default App
