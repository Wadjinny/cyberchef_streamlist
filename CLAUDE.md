# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CyberChef Streamlist is a React-based web application that implements a visual pipeline editor for text transformation. Users can create, organize, and execute JavaScript transformation steps in a drag-and-drop interface. The application is deployed to GitHub Pages and uses local storage for persistence.

## Commands

### Development
```bash
cd app
pnpm install          # Install dependencies (pnpm 10.28.2+)
pnpm dev              # Start dev server on port 5173
pnpm build            # Type-check with tsc and build for production
pnpm lint             # Run ESLint
pnpm preview          # Preview production build
```

### Deployment
The application auto-deploys to GitHub Pages on push to master via `.github/workflows/deploy-pages.yml`. The build sets `VITE_BASE` environment variable to `/<repo-name>/` for correct asset paths.

## Architecture

### Core Concept: Pipeline Execution Model
The application is built around a pipeline execution model where:
1. User input text flows through a series of JavaScript transformation steps
2. Each step receives the output of the previous step as `input`
3. Steps can be muted (skipped), reordered, or organized into groups
4. The pipeline auto-executes with a 20ms debounce after any change (input, code, or step order)

### Data Flow
```
App.tsx (orchestrator)
  ├─ useStepGroups     → manages collections of step pipelines
  ├─ useSteps          → manages steps within active group
  ├─ useLibrary        → manages reusable step templates
  ├─ usePipeline       → executes transformations (input → output)
  └─ useSearch         → filters groups/steps/library by search terms
```

### State Management
- **No external state library**: All state managed via React hooks
- **Persistence**: Entire app state serialized to localStorage as `StoredState` (groups, steps, library, selections)
- **Storage keys**: Defined in `src/utils/constants.ts` with versioning support
- **Layout state**: Panel dimensions (sidebar width, library width, editor height) persisted separately

### Step Execution Environment
Steps execute in a sandboxed JavaScript context via `new Function()`:
- **Available globals**: `input` (string), `helpers` (utilities object)
- **Type hints**: Monaco editor configured with TypeScript definitions from `HELPERS_LIB` constant
- **Error handling**: Execution stops at first error, showing failed step and message
- **Helpers**: Currently provides `upper`, `lower`, `trim` (defined in `src/utils/helpers.ts`)

### Component Architecture
- **App.tsx**: Monolithic orchestrator component (1082 lines) that manages all UI state and coordinates hooks
- **Custom hooks** (`src/hooks/`): Extract business logic for groups, steps, library, pipeline, and search
- **Minimal components** (`src/components/`): Three presentational components for step items and droppable areas
- **Drag-and-drop**: Uses `@dnd-kit` for sortable steps and drag-to-library functionality

### Key Data Types (`src/types.ts`)
- `Step`: Individual transformation with id, title, code, muted flag, timestamps
- `StepGroup`: Named collection of steps with timestamps
- `LibraryStep`: Reusable step template (like Step but without muted flag)
- `StoredState`: Complete serializable app state (version 1)
- `RunScope`: Pipeline execution scope ('all' | 'from' | 'to') - currently locked to 'all'

## Important Patterns

### Monaco Editor Setup
The Monaco editor is configured once via `beforeMount` callback with a `didInitMonaco` ref to prevent re-initialization. TypeScript definitions for the step execution environment are injected via `addExtraLib()`.

### Debounced Pipeline Execution
Pipeline auto-runs after `BUBBLE_DELAY` (20ms) whenever input, steps, or scope changes. This is managed in `usePipeline.ts` via a `useEffect` with cleanup.

### Deletion Animation
Step deletion uses a two-phase process: mark as deleting (for CSS transition), then remove after animation completes. Tracked in `deletingStepIds` object.

### Resizable Panels
Three-column layout (sidebar | main | library) with draggable splitters. Resize state persists to localStorage. On narrow screens (<1024px), columns stack vertically.

### Drag-and-Drop Modes
- **Reorder steps**: Drag within step list (uses sortable context)
- **Save to library**: Drag step to library panel (uses droppable context)
- **Add from library**: Drag library item to step list (native drag-and-drop with JSON data transfer)
- **Reorder library**: Drag within library list (uses text/plain data transfer with `LIB_REORDER:` prefix)

## Development Notes

### Working with Steps
When adding step features, remember that steps execute sequentially and synchronously. Each step's return value becomes the next step's input. Muted steps are skipped entirely during execution.

### Adding Helper Functions
To add helpers available in step code:
1. Add function to `helpers` object in `src/utils/helpers.ts`
2. Update TypeScript definition in `HELPERS_LIB` constant in `src/utils/constants.ts`
3. Monaco editor will provide autocomplete for the new helper

### Storage Schema Changes
If modifying `StoredState` structure, increment `STORAGE_VERSION` and add migration logic in `loadStoredState()` (`src/utils/storage.ts`).

### Layout Customization
Panel dimensions and split positions are controlled by CSS custom properties (`--sidebar-w`, `--library-w`) set inline on the app container. Minimum dimensions are enforced during resize.
