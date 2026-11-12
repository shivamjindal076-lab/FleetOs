// What to show while the fleet's details load, and what to say when saving to the database fails.

export type FleetLoadState =
  | { status: 'ready' }
  | { status: 'loading'; buttonLabel: string }
  | { status: 'error'; message: string };

export function fleetLoadState(input: { hasOrg: boolean; loading: boolean; error: string | null }): FleetLoadState {
  if (input.hasOrg) return { status: 'ready' };
  if (input.loading) return { status: 'loading', buttonLabel: 'Loading fleet details' };
  const reason = input.error?.trim().replace(/[.\s]+$/, '') || "Fleet details couldn't be loaded";
  return { status: 'error', message: `${reason}. Refresh the page.` };
}

// Database messages in plain words. Anything not recognised is shown as it came back.
export function plainDbError(message: string | null | undefined): string {
  const text = (message ?? '').trim();
  if (!text) return "The booking wasn't saved. Try again.";
  const lower = text.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return "You don't have permission to save this. Sign out, sign in as the owner and try again.";
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (lower.includes('foreign key')) {
    return 'The driver or fleet on this booking no longer exists. Refresh the page and try again.';
  }
  if (lower.includes('null value in column')) {
    return 'Something required is missing from this booking. Check the details and try again.';
  }
  if (lower.includes('jwt') && lower.includes('expired')) {
    return 'Your session has ended. Sign in again.';
  }
  return text;
}
