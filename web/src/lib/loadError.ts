// The sentence shown when a record cannot be loaded (spec 016). The status comes from an axios-style error.
export function loadErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
  if (status === 404) return "This item was not found. It may have been deleted, or the link may be wrong.";
  if (status === 403) return "You do not have permission to view this item.";
  if (status === 422) return "This item cannot be used in its current state.";
  return "This page could not be loaded. Please check your connection and try again.";
}
