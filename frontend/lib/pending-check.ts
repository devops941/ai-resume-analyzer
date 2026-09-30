export interface PendingCheck {
  file: File;
  jobDescription: string;
}

// Module scope survives client-side navigation, so a check started on the home
// page can resume once the visitor signs in (a full reload clears it).
let pending: PendingCheck | null = null;

export function setPendingCheck(check: PendingCheck | null) {
  pending = check;
}

export function peekPendingCheck(): PendingCheck | null {
  return pending;
}

export function takePendingCheck(): PendingCheck | null {
  const current = pending;
  pending = null;
  return current;
}
