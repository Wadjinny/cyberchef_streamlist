# Project Specification: Text Transformation Step Builder

## Overview

A web app that lets users build a text transformation pipeline. Each pipeline step is powered by user-provided JavaScript that transforms input text into output text. Users can add, edit, delete, and search steps, and quickly test outputs while writing code. Steps are persisted in local storage.

## Goals

- Provide a simple, browser-based interface to define and run text transformations.
- Make step creation and editing fast with live output preview and code highlighting.
- Persist steps locally so users can return without setup.
- Enable fast discovery via sidebar search by title or code.

## Non-Goals

- No server-side storage or multi-user collaboration.
- No complex workflow orchestration beyond sequential step execution.
- No authentication or accounts.

## Core Concepts

- **Step**: A single JavaScript transform that accepts input text and returns output text.
- **Pipeline**: Ordered list of steps applied sequentially to the input text.
- **Live Preview**: Immediate output updates as code or input changes.

## Functional Requirements

### Step Management

- Users can create a new step.
- Users can edit a step’s title and code.
- Users can delete a step.
- Steps have a default title format `title {{i}}` where `i` is a 1-based index.
- Step order is user-controlled (move up/down or drag-and-drop).
- Users can mute single step, all steps above, all step bellow
- Users can save steps into a reusable steps library.
- Users can add steps from the steps library into the current group.
- Users can edit and delete steps in the steps library.

### Step Group Management

- Users can create a step group (a named collection of steps).
- Users can edit a step group (title, steps).
- Users can delete a step group.
- Users can load a step group into the editor workspace.

### Text Transformation

- Each step defines a JavaScript function body (or full function) that transforms text.
- Input text is passed to the step code and output text is produced.
- Errors in step code are captured and displayed without crashing the app.

### Live Testing

- Output updates in near real time while editing code or input text.
- Users can test a single step or the full pipeline.

### Code Editor

- JavaScript syntax highlighting in the step editor.
- Optional line numbers and minimal editor affordances (tab indentation).

### Persistence

- Steps are stored in `localStorage`.
- On load, the app restores steps from `localStorage`.
- If no steps exist, a default step is created with the default title.

### Search

- A sidebar lists all steps.
- Search filters by title or code content.
- Clicking a step focuses it in the editor.
- A second sidebar lists steps in the steps library and supports search.
- Step groups are searchable by title.

## User Stories

- As a user, I can paste input text and see the transformed output immediately.
- As a user, I can add a new step to refine the transformation pipeline.
- As a user, I can fix code and instantly see the effect.
- As a user, I can find a step by searching its title or code.
- As a user, I can close the browser and keep my steps.

## UX / UI Requirements

- **Layout**: Main editor with Input/Output panels, plus two sidebars.
- **Sidebar**: Search box + list of steps with title.
- **Second Sidebar**: Steps library + step group library.
- **Editor**: JavaScript highlighting, error display area.
- **Input**: Textarea for raw input.
- **Output**: Readonly text area or code block.
- **Controls**: Add step, delete step, move step, run single step/full pipeline.
- **Initial UI**: Prompt to create a blank step group and show saved step groups.

## Data Model

Step object:

```
{
  id: string,
  title: string,
  code: string,
  createdAt: number,
  updatedAt: number
}
```

Step group object:

```
{
  id: string,
  title: string,
  steps: Step[],
  createdAt: number,
  updatedAt: number
}
```

Library step object:

```
{
  id: string,
  title: string,
  code: string,
  createdAt: number,
  updatedAt: number
}
```

Local storage keys:

- `steps`: JSON array of step objects.
- `selectedStepId`: last focused step id (optional).
- `stepGroups`: JSON array of step group objects.
- `librarySteps`: JSON array of library step objects.
- `selectedGroupId`: last focused step group id (optional).

## Execution Model

- Pipeline applies steps in order: `output = stepN(stepN-1(...step1(input)))`.
- Step code runs in a sandboxed `Function` wrapper:
  - Input text provided as `input`.
  - Expected to return a string or value coerced to string.
  - Example wrapper: `new Function("input", code)`.

## Error Handling

- Syntax/runtime errors are caught and shown per step.
- Output displays last successful result or a clear error message.
- Errors do not block editing or navigation.

## Performance Considerations

- Debounce live preview updates (e.g., 150–300ms).
- Avoid re-running full pipeline when only single-step test is requested.

## Accessibility

- Keyboard navigation for sidebar list and editor.
- Clear focus states and readable contrast.

## Future Enhancements (Optional)

- Import/export steps as JSON.
- Step templates/snippets.
- Optional regex helper functions.

## Linear Implementation Plan

1. **Project scaffolding**

   - Create a single-page app layout and basic routing (if needed).
   - Add a lightweight state management pattern (app state in one module).

2. **Data model + storage**

   - Implement step CRUD in state.
   - Add `localStorage` load/save with schema versioning.
   - Ensure default step creation on empty storage.

3. **Core UI layout**

   - Build three-panel layout: sidebar, input, output.
   - Render step list with selection state.
   - Add search box and filtering logic.
   - Add second sidebar for steps library and step groups.

4. **Step editor**

   - Integrate code editor with JS syntax highlighting.
   - Add title editing and default title generation logic.
   - Implement mute toggles for step and ranges (above/below).
   - Add "save to library" control per step.

5. **Execution engine**

   - Build safe-ish JS execution wrapper with `Function`.
   - Implement pipeline execution and single-step execution.
   - Capture and display errors per step.

6. **Live preview**

   - Debounce input/code changes.
   - Update output in near real time with latest changes.

7. **UX polish**

   - Add step ordering (move buttons / drag & drop).
   - Improve error messages and empty states.
   - Add keyboard shortcuts for add/delete/save step.
   - Add empty state for step groups (create new + list saved).

8. **Testing + hardening**

   - Add unit tests for transform engine, storage, and search.
   - Manual QA for edge cases (empty input, erroring code).

9. **Packaging**
   - Add build tooling and deploy instructions.
   - Add README with usage and safety notes.

## Technical Specifications

### Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **State**: local component state + centralized store (e.g. Zustand) or React Context
- **Editor**: CodeMirror 6 (preferred) or Monaco Editor
- **Styling**: Tailwind CSS or CSS modules
- **Persistence**: `localStorage`

### Architecture

- **Single-page app** with one main route.
- **State modules**:
  - `steps` slice: list, selected id, ordering, muted ranges.
  - `stepGroups` slice: list, selected group id, group CRUD.
  - `librarySteps` slice: list, selection, CRUD.
  - `input` slice: input text.
  - `output` slice: last output, last error.
- **Effects**:
  - Recompute output on debounce when input or step code changes.
  - Persist steps on change.
  - Persist step groups and library steps on change.

### Data Model (extended)

```
{
  id: string,
  title: string,
  code: string,
  muted: boolean,
  createdAt: number,
  updatedAt: number
}
```

Local storage schema:

```
{
  version: 1,
  steps: Step[],
  selectedStepId: string | null,
  stepGroups: StepGroup[],
  selectedGroupId: string | null,
  librarySteps: LibraryStep[]
}
```

### Execution Engine

- Wrap step code with:
  - `new Function("input", "helpers", code)`
  - `helpers` contains common utilities (e.g., `trim`, `upper`, `lower`).
- Coerce return value to string: `String(result ?? "")`.
- Catch errors and store `stepError` with step id.
- Muted logic:
  - Skip muted steps.
  - When "mute above" is enabled for a step, only run from that step onward.
  - When "mute below" is enabled for a step, run up to that step only.

### Editor Integration

- **CodeMirror 6**:
  - Language: JavaScript.
  - Features: line numbers, bracket matching, history.
  - Display inline errors under the editor.

### Search

- Local search over `title` and `code`.
- Case-insensitive match; highlight matches in list.
- Steps library has its own search filter.
- Step groups searchable by title.

### Security Notes

- User code executes in the browser via `Function` (no sandbox).
- Add warning in UI about executing untrusted code.

### Testing

- Unit tests for:
  - Step CRUD and default title logic.
  - Execution engine (success + error).
  - Mute logic for above/below/single step.
  - Search filtering.
