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
import { motion } from 'framer-motion'
import './App.css'
import { StepItem } from './components/StepItem'
import { SortableStepItem } from './components/SortableStepItem'
import { Droppable } from './components/Droppable'
import type { StoredState, LibraryStep } from './types'
import { STORAGE_KEY, STORAGE_VERSION, EDITOR_SPLIT_STORAGE_KEY, SIDEBAR_SPLIT_STORAGE_KEY, LIBRARY_SPLIT_STORAGE_KEY, HELPERS_LIB } from './utils/constants'
import { loadStoredState } from './utils/storage'
import { useStepGroups } from './hooks/useStepGroups'
import { useSteps } from './hooks/useSteps'
import { useLibrary } from './hooks/useLibrary'
import { usePipeline } from './hooks/usePipeline'
import { useSearch } from './hooks/useSearch'
import { useTheme } from './hooks/useTheme'

function App() {
  // 1. Theme
  const { theme, toggleTheme } = useTheme()

  // 2. Load initial state
  const stored = useMemo(() => loadStoredState(), [])

  // 3. Monaco editor configuration
  const didInitMonaco = useRef(false)
  const [inputLanguage, setInputLanguage] = useState('plaintext')
  const [outputLanguage, setOutputLanguage] = useState('plaintext')

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

  // 4. Core data hooks
  const groupsAPI = useStepGroups(stored.stepGroups, stored.selectedGroupId)
  const stepsAPI = useSteps(groupsAPI.activeGroup, stored.selectedStepId, groupsAPI.setStepGroups)
  const libraryAPI = useLibrary(
    stepsAPI.activeSteps,
    stored.librarySteps,
    stepsAPI.updateActiveSteps,
    stepsAPI.setSelectedStepId
  )
  const pipelineAPI = usePipeline(
    stepsAPI.activeSteps,
    !!groupsAPI.activeGroup,
    groupsAPI.activeGroup?.inputText ?? '',
    useCallback(
      (inputText: string) => {
        if (groupsAPI.activeGroup) {
          groupsAPI.updateGroupInputText(groupsAPI.activeGroup.id, inputText)
        }
      },
      [groupsAPI]
    )
  )
  const searchAPI = useSearch(
    groupsAPI.stepGroups,
    stepsAPI.activeSteps,
    libraryAPI.librarySteps
  )

  // 5. UI state
  const [ioLayout, setIoLayout] = useState<'horizontal' | 'vertical'>('vertical')
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(true)
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    stepId: string
  } | null>(null)
  const [editingGroupTitleId, setEditingGroupTitleId] = useState<string | null>(null)

  // 6. Drag-and-drop state
  const [isDraggingOverSidebar, setIsDraggingOverSidebar] = useState(false)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // 6. Layout/resize state
  const appRef = useRef<HTMLDivElement | null>(null)
  const appMainRef = useRef<HTMLElement | null>(null)
  const [editorPanelHeight, setEditorPanelHeight] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(EDITOR_SPLIT_STORAGE_KEY)
      if (!raw) return null
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    }
  })
  const [isResizingEditorSplit, setIsResizingEditorSplit] = useState(false)
  const resizeStartYRef = useRef(0)
  const resizeStartHeightRef = useRef(0)

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_SPLIT_STORAGE_KEY)
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : 260
    } catch {
      return 260
    }
  })
  const [libraryWidth, setLibraryWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(LIBRARY_SPLIT_STORAGE_KEY)
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : 320
    } catch {
      return 320
    }
  })
  const [isWideLayout, setIsWideLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 1024 : true,
  )
  const [isResizingCols, setIsResizingCols] = useState<null | 'sidebar' | 'library'>(null)
  const resizeStartXRef = useRef(0)
  const resizeStartSidebarWidthRef = useRef(260)
  const resizeStartLibraryWidthRef = useRef(320)


  // 7. Drag-and-drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
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

    if (over && over.id === 'library-droppable' && groupsAPI.activeGroup) {
      const stepToSave = stepsAPI.activeSteps.find((step) => step.id === active.id)
      if (stepToSave) {
        libraryAPI.saveStepToLibrary(stepToSave)
      }
    } else if (over && active.id !== over.id && groupsAPI.activeGroup) {
      const oldIndex = stepsAPI.activeSteps.findIndex((step) => step.id === active.id)
      const newIndex = stepsAPI.activeSteps.findIndex((step) => step.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        stepsAPI.moveStep(oldIndex, newIndex)
      }
    }

    setActiveDragId(null)
  }

  // 8. Effects
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    const state: StoredState = {
      version: STORAGE_VERSION,
      stepGroups: groupsAPI.stepGroups,
      selectedGroupId: groupsAPI.selectedGroupId,
      selectedStepId: stepsAPI.selectedStepId,
      librarySteps: libraryAPI.librarySteps,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [groupsAPI.stepGroups, groupsAPI.selectedGroupId, stepsAPI.selectedStepId, libraryAPI.librarySteps])

  useEffect(() => {
    if (editorPanelHeight == null) return
    try {
      localStorage.setItem(EDITOR_SPLIT_STORAGE_KEY, String(editorPanelHeight))
    } catch {
      // ignore
    }
  }, [editorPanelHeight])

  useEffect(() => {
    const onResize = () => setIsWideLayout(window.innerWidth > 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_SPLIT_STORAGE_KEY, String(sidebarWidth))
    } catch {
      // ignore
    }
  }, [sidebarWidth])

  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_SPLIT_STORAGE_KEY, String(libraryWidth))
    } catch {
      // ignore
    }
  }, [libraryWidth])

  useEffect(() => {
    if (!isResizingEditorSplit) return
    const handleMove = (event: PointerEvent) => {
      const delta = event.clientY - resizeStartYRef.current
      const main = appMainRef.current
      const container = main?.querySelector('.editor-io-stack') as HTMLDivElement | null
      const containerHeight = container?.clientHeight ?? main?.clientHeight ?? 0

      const minEditor = 220
      const minIo = 220
      const maxEditor = Math.max(minEditor, containerHeight - minIo - 16) // keep some breathing room

      const next = Math.min(maxEditor, Math.max(minEditor, resizeStartHeightRef.current + delta))
      setEditorPanelHeight(next)
    }
    const handleUp = () => setIsResizingEditorSplit(false)

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isResizingEditorSplit])

  useEffect(() => {
    if (!isResizingCols) return
    const handleMove = (event: PointerEvent) => {
      const appWidth = appRef.current?.getBoundingClientRect().width ?? window.innerWidth
      const handleTotal = 24 // two 12px handles
      const minMain = 520
      const minSidebar = 220
      const minLibrary = 260

      if (isResizingCols === 'sidebar') {
        const delta = event.clientX - resizeStartXRef.current
        const maxSidebar = Math.max(
          minSidebar,
          appWidth - libraryWidth - handleTotal - minMain,
        )
        const next = Math.min(
          maxSidebar,
          Math.max(minSidebar, resizeStartSidebarWidthRef.current + delta),
        )
        setSidebarWidth(next)
      } else {
        const delta = event.clientX - resizeStartXRef.current
        const maxLibrary = Math.max(
          minLibrary,
          appWidth - sidebarWidth - handleTotal - minMain,
        )
        // Dragging handle left (delta negative) should increase library width
        const next = Math.min(
          maxLibrary,
          Math.max(minLibrary, resizeStartLibraryWidthRef.current - delta),
        )
        setLibraryWidth(next)
      }
    }
    const handleUp = () => setIsResizingCols(null)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isResizingCols, sidebarWidth, libraryWidth])

  useEffect(() => {
    if (!groupsAPI.activeGroup) {
      stepsAPI.setSelectedStepId(null)
      return
    }
    if (!stepsAPI.activeSteps.length) {
      stepsAPI.setSelectedStepId(null)
      return
    }
    if (!stepsAPI.selectedStepId || !stepsAPI.activeSteps.some((step) => step.id === stepsAPI.selectedStepId)) {
      stepsAPI.setSelectedStepId(stepsAPI.activeSteps[0].id)
    }
  }, [groupsAPI.activeGroup, stepsAPI])

  useEffect(() => {
    if (pipelineAPI.runScope !== 'all' && stepsAPI.selectedStep) {
      pipelineAPI.setScopeStepId(stepsAPI.selectedStep.id)
    }
  }, [pipelineAPI, stepsAPI.selectedStep])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`app ${isResizingCols ? 'is-resizing-cols' : ''}`}
        ref={appRef}
        style={
          isWideLayout
            ? ({
                ['--sidebar-w' as any]: `${sidebarWidth}px`,
                ['--library-w' as any]: `${libraryWidth}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <nav className="navbar">
          <h1 className="navbar-title">Father Chef</h1>
          <div className="navbar-actions">
            <button
              className="ghost"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              style={{ padding: '6px 10px', fontSize: '16px' }}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </nav>

        <div className="app-content">
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
                   stepsAPI.moveStep(fromIndex, stepsAPI.activeSteps.length - 1)
               }
               return
            }

            const data = event.dataTransfer.getData('application/json')
            if (!data) return
            try {
              const libraryStep = JSON.parse(data) as LibraryStep
              libraryAPI.addStepFromLibrary(libraryStep)
            } catch {
              // ignore
            }
          }}
        >
          <div className="sidebar-header">
            <h2>Steps</h2>
            <button className="primary" onClick={stepsAPI.addStep} disabled={!groupsAPI.activeGroup}>
              + Add Step
            </button>
          </div>
          <input
            className="search"
            placeholder="Search steps"
            value={searchAPI.stepSearch}
            onChange={(event) => searchAPI.setStepSearch(event.target.value)}
            disabled={!groupsAPI.activeGroup}
          />
          <div
            className="step-list"
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              const data = event.dataTransfer.getData('application/json')
              if (!data) return
              try {
                const libraryStep = JSON.parse(data) as LibraryStep
                // If dropped directly on the list (not on an item), add to end
                libraryAPI.addStepFromLibrary(libraryStep)
              } catch {
                // ignore invalid data
              }
            }}
          >
            <SortableContext
              items={searchAPI.visibleSteps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
              disabled={!!searchAPI.stepSearch}
            >
                {searchAPI.visibleSteps.map((step, index) => (
                  <SortableStepItem
                    key={step.id}
                    id={step.id}
                    step={step}
                    index={index}
                    hasActiveDrag={!!activeDragId}
                    isSelected={step.id === stepsAPI.selectedStep?.id}
                    dropTargetIndex={dropTargetIndex}
                    editingTitleStepId={stepsAPI.editingTitleStepId}
                    className={stepsAPI.deletingStepIds[step.id] ? 'is-deleting' : ''}
                    isDeleting={!!stepsAPI.deletingStepIds[step.id]}
                    onSelect={stepsAPI.setSelectedStepId}
                    onContextMenu={(e: React.MouseEvent, id: string) => {
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        stepId: id,
                      })
                    }}
                    onUpdateTitle={(id: string, title: string) => stepsAPI.updateStep(id, { title })}
                    setEditingTitleStepId={stepsAPI.setEditingTitleStepId}
                    onToggleMuted={(id: string) => {
                      const target = stepsAPI.activeSteps.find((s) => s.id === id)
                      if (!target) return
                      stepsAPI.updateStep(id, { muted: !target.muted })
                    }}
                    onDelete={stepsAPI.requestDeleteStep}
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
                            libraryAPI.addStepFromLibrary(libraryStep, index)
                          }
                        } catch {
                          // ignore
                        }
                      }
                    }}
                  />
                ))}
            </SortableContext>
            {!groupsAPI.activeGroup && (
              <div className="empty">Create or load a group to manage steps.</div>
            )}
            {groupsAPI.activeGroup && !stepsAPI.activeSteps.length && (
              <div className="empty">This group is empty. Add your first step.</div>
            )}
          </div>
        </aside>

        {isWideLayout && (
          <div
            className="vsplitter"
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={(event) => {
              event.preventDefault()
              resizeStartXRef.current = event.clientX
              resizeStartSidebarWidthRef.current = sidebarWidth
              setIsResizingCols('sidebar')
              ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
            }}
          >
            <div className="vsplitter-handle" />
          </div>
        )}

        <main
          className={`app-main ${isResizingEditorSplit ? 'is-resizing' : ''}`}
          ref={(node) => {
            appMainRef.current = node
          }}
        >

        {!groupsAPI.activeGroup ? (
          <section className="panel group-picker">
            <div className="panel-header">
              <div>
                <h2>Create or load a step group</h2>
                <p className="subtitle">
                  Start with a blank group or open an existing group.
                </p>
              </div>
              <button className="primary" onClick={groupsAPI.addGroup}>
                +
              </button>
            </div>
            <div className="group-list">
              {searchAPI.visibleGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="group-item"
                  onClick={() => groupsAPI.setSelectedGroupId(group.id)}
                >
                  <span>{group.title}</span>
                  <span className="muted">{group.steps.length} steps</span>
                </button>
              ))}
              {!groupsAPI.stepGroups.length && (
                <div className="empty">No saved groups yet.</div>
              )}
            </div>
          </section>
        ) : (
          <div className="editor-io-stack">
            <section
              className="panel editor"
              style={editorPanelHeight != null ? { height: `${editorPanelHeight}px` } : undefined}
            >
              <div className="panel-header">
                <div>
                  <h2>Step Editor</h2>
                  <p className="subtitle">{pipelineAPI.scopeLabel}</p>
                </div>
              </div>
              {stepsAPI.selectedStep ? (
                <>
                  <div className="field">
                    <label htmlFor="step-title">Title</label>
                    <input
                      id="step-title"
                      value={stepsAPI.selectedStep?.title ?? ''}
                      onChange={(event) => {
                        if (stepsAPI.selectedStep) {
                          stepsAPI.updateStep(stepsAPI.selectedStep.id, { title: event.target.value })
                        }
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="step-code">JavaScript</label>
                    <div className="code-editor" id="step-code">
                      <Editor
                        height="220px"
                        language="javascript"
                        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                        beforeMount={handleEditorBeforeMount}
                        value={stepsAPI.selectedStep?.code ?? ''}
                        onChange={(value) => {
                          if (stepsAPI.selectedStep) {
                            stepsAPI.updateStep(stepsAPI.selectedStep.id, { code: value ?? '' })
                          }
                        }}
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
                        checked={stepsAPI.selectedStep?.muted ?? false}
                        onChange={(event) => {
                          if (stepsAPI.selectedStep) {
                            stepsAPI.updateStep(stepsAPI.selectedStep.id, { muted: event.target.checked })
                          }
                        }}
                      />
                      Mute this step
                    </label>
                  </div>
          <div className="toggle-row">
            <button
              type="button"
              className="ghost"
              onClick={() => libraryAPI.saveStepToLibrary(stepsAPI.selectedStep ?? undefined)}
            >
              Save to library
            </button>
          </div>
                </>
              ) : (
                <div className="empty">Select a step to begin editing.</div>
              )}
            </section>
            <div
              className="splitter"
              role="separator"
              aria-orientation="horizontal"
              tabIndex={0}
              onPointerDown={(event) => {
                // Start resize drag
                event.preventDefault()
                const editorEl = appMainRef.current?.querySelector('section.panel.editor') as HTMLElement | null
                resizeStartYRef.current = event.clientY
                resizeStartHeightRef.current =
                  editorEl?.getBoundingClientRect().height ?? editorPanelHeight ?? 360
                setIsResizingEditorSplit(true)
                ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
              }}
            >
              <div className="splitter-handle" />
            </div>
            <section className={`panel io ${ioLayout}`} style={{ flex: '1 1 auto', minHeight: 0 }}>
              <div className="io-panel">
                <div className="panel-header">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <h2>Input</h2>
                    <button
                      className="ghost"
                      style={{ padding: '4px', display: 'flex' }}
                      onClick={() => setIoLayout(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                      title={ioLayout === 'vertical' ? "Switch to horizontal split" : "Switch to vertical split"}
                    >
                      {ioLayout === 'vertical' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <line x1="12" y1="4" x2="12" y2="20" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <line x1="4" y1="12" x2="20" y2="12" />
                        </svg>
                      )}
                    </button>
                  </div>
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
                    theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                    beforeMount={handleEditorBeforeMount}
                    value={pipelineAPI.inputText}
                    onChange={(value) => pipelineAPI.setInputText(value ?? '')}
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
                      outline: Object.keys(pipelineAPI.stepErrors).length > 0 ? 'solid 1px red' : 'none'}}
                >
                  <Editor
                    height="100%"
                    language={outputLanguage}
                    theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                    beforeMount={handleEditorBeforeMount}
                    value={pipelineAPI.outputText}
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
          </div>
        )}
      </main>

      {isWideLayout && (
        <div
          className="vsplitter"
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault()
            resizeStartXRef.current = event.clientX
            resizeStartLibraryWidthRef.current = libraryWidth
            setIsResizingCols('library')
            ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
          }}
        >
          <div className="vsplitter-handle" />
        </div>
      )}

      <Droppable id="library-droppable" className="sidebar library">
        <div className="library-section">
          <div className="sidebar-header">
            <h2
              onClick={() => setIsGroupsExpanded((prev) => !prev)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Step Groups {isGroupsExpanded ? '▼' : '▶'}
            </h2>
            <button className="primary" onClick={groupsAPI.addGroup}>
            +
            </button>
          </div>
          {isGroupsExpanded && (
            <>
              <input
                className="search"
                placeholder="Search groups"
                value={searchAPI.groupSearch}
                onChange={(event) => searchAPI.setGroupSearch(event.target.value)}
              />
              <div className="group-list">
                {searchAPI.visibleGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`group-row ${group.id === groupsAPI.selectedGroupId ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="group-select"
                      onClick={() => groupsAPI.setSelectedGroupId(group.id)}
                    >
                      {editingGroupTitleId === group.id ? (
                        <input
                          autoFocus
                          className="step-title-input"
                          value={group.title}
                          onChange={(e) => groupsAPI.updateGroupTitle(group.id, e.target.value)}
                          onBlur={() => setEditingGroupTitleId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingGroupTitleId(null)
                            e.stopPropagation()
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingGroupTitleId(group.id)
                          }}
                        >
                          {group.title}
                        </span>
                      )}
                      <span className="muted">{group.steps.length} steps</span>
                    </button>
                    <div className="group-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          const nextTitle = window.prompt('Group title', group.title)
                          if (nextTitle !== null && nextTitle.trim()) {
                            groupsAPI.updateGroupTitle(group.id, nextTitle.trim())
                          }
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => groupsAPI.deleteGroup(group.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!groupsAPI.stepGroups.length && (
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
            <button className="primary" onClick={libraryAPI.addLibraryStep}>
              + 
            </button>
          </div>
          {isLibraryExpanded && (
            <>
              <input
                className="search"
                placeholder="Search library"
                value={searchAPI.librarySearch}
                onChange={(event) => searchAPI.setLibrarySearch(event.target.value)}
              />
              <div
                className="library-list"
                onDragOver={(event) => {
                  // Allow dropping to reorder within the library list
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  libraryAPI.setLibraryDropTargetIndex(null)

                  const textData = event.dataTransfer.getData('text/plain')
                  if (textData && textData.startsWith('LIB_REORDER:')) {
                    const fromIndex = parseInt(textData.replace('LIB_REORDER:', ''), 10)
                    if (!Number.isNaN(fromIndex)) {
                      // Dropped on the list itself → move to end
                      libraryAPI.moveLibraryStep(fromIndex, Math.max(0, libraryAPI.librarySteps.length - 1))
                    }
                  }
                }}
              >
                {searchAPI.visibleLibrarySteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    layout
                    transition={{ type: 'spring', stiffness: 600, damping: 45 }}
                  >
                    <div
                      className={`library-item ${step.id === libraryAPI.selectedLibraryStep?.id ? 'active' : ''} ${libraryAPI.libraryDropTargetIndex === index ? 'drop-target' : ''}`}
                      draggable={libraryAPI.editingLibraryTitleId !== step.id}
                      onDragStart={(event: React.DragEvent<HTMLDivElement>) => {
                        if (libraryAPI.editingLibraryTitleId === step.id) return
                        event.dataTransfer.setData(
                          'application/json',
                          JSON.stringify(step),
                        )
                        // Also allow reordering within the library list
                        event.dataTransfer.setData('text/plain', `LIB_REORDER:${index}`)
                        event.dataTransfer.effectAllowed = 'copyMove'
                      }}
                      onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.dataTransfer.dropEffect = 'move'
                        libraryAPI.setLibraryDropTargetIndex(index)
                      }}
                      onDragLeave={() => {
                        if (libraryAPI.libraryDropTargetIndex === index) {
                          libraryAPI.setLibraryDropTargetIndex(null)
                        }
                      }}
                      onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                        event.preventDefault()
                        event.stopPropagation()
                        libraryAPI.setLibraryDropTargetIndex(null)

                        const textData = event.dataTransfer.getData('text/plain')
                        if (textData && textData.startsWith('LIB_REORDER:')) {
                          const fromIndex = parseInt(
                            textData.replace('LIB_REORDER:', ''),
                            10,
                          )
                          if (!Number.isNaN(fromIndex)) {
                            libraryAPI.moveLibraryStep(fromIndex, index)
                          }
                        }
                      }}
                    >
                    <button
                      type="button"
                      className="library-select"
                      onClick={() => libraryAPI.setSelectedLibraryStepId(step.id)}
                    >
                      {libraryAPI.editingLibraryTitleId === step.id ? (
                        <input
                          autoFocus
                          className="step-title-input"
                          value={step.title}
                          onChange={(e) =>
                            libraryAPI.updateLibraryStep(step.id, { title: e.target.value })
                          }
                          onBlur={() => libraryAPI.setEditingLibraryTitleId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') libraryAPI.setEditingLibraryTitleId(null)
                            e.stopPropagation()
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            libraryAPI.setEditingLibraryTitleId(step.id)
                          }}
                        >
                          {step.title}
                        </span>
                      )}
                    </button>
                    <div className="library-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => libraryAPI.addStepFromLibrary(step)}
                        disabled={!groupsAPI.activeGroup}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => libraryAPI.deleteLibraryStep(step.id)}
                      >
                        Delete
                      </button>
                    </div>
                    </div>
                  </motion.div>
                ))}
                {!libraryAPI.librarySteps.length && (
                  <div className="empty">Save a step to build your library.</div>
                )}
              </div>
              {libraryAPI.selectedLibraryStep && (
                <div className="library-editor">
                  <div className="field">
                    <label htmlFor="library-title">Library title</label>
                    <input
                      id="library-title"
                      value={libraryAPI.selectedLibraryStep?.title ?? ''}
                      onChange={(event) => {
                        if (libraryAPI.selectedLibraryStep) {
                          libraryAPI.updateLibraryStep(libraryAPI.selectedLibraryStep.id, {
                            title: event.target.value,
                          })
                        }
                      }}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="library-code">Library code</label>
                    <div className="code-editor" id="library-code">
                      <Editor
                        height="180px"
                        language="javascript"
                        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                        beforeMount={handleEditorBeforeMount}
                        value={libraryAPI.selectedLibraryStep?.code ?? ''}
                        onChange={(value) => {
                          if (libraryAPI.selectedLibraryStep) {
                            libraryAPI.updateLibraryStep(libraryAPI.selectedLibraryStep.id, {
                              code: value ?? '',
                            })
                          }
                        }}
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
      </div>
      <DragOverlay>
        {activeDragId ? (
          <StepItem
            step={stepsAPI.activeSteps.find((s) => s.id === activeDragId)!}
            index={-1}
            isSelected={activeDragId === stepsAPI.selectedStepId}
            dropTargetIndex={null}
            editingTitleStepId={null}
            onSelect={() => {}}
            onContextMenu={() => {}}
            onUpdateTitle={() => {}}
            setEditingTitleStepId={() => {}}
            onToggleMuted={() => {}}
            onDelete={() => {}}
            style={{
              boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
              cursor: 'grabbing',
              background: '#fff',
              touchAction: 'none',
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
              const step = stepsAPI.activeSteps.find((s) => s.id === contextMenu.stepId)
              if (step) {
                libraryAPI.saveStepToLibrary(step)
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
