export const helpers = {
  upper: (value: string) => value.toUpperCase(),
  lower: (value: string) => value.toLowerCase(),
  trim: (value: string) => value.trim(),
}

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)
