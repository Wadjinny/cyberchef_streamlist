export const BUBBLE_DELAY = 20
export const STORAGE_KEY = 'text-transformer-steps-v1'
export const STORAGE_VERSION = 1
export const EDITOR_SPLIT_STORAGE_KEY = 'text-transformer-editor-split-v1'
export const SIDEBAR_SPLIT_STORAGE_KEY = 'text-transformer-sidebar-split-v1'
export const LIBRARY_SPLIT_STORAGE_KEY = 'text-transformer-library-split-v1'
export const DEFAULT_CODE = `return input`
export const HELPERS_LIB = `type Helpers = {
  upper(value: string): string
  lower(value: string): string
  trim(value: string): string
}

declare const helpers: Helpers
declare const input: string
`
