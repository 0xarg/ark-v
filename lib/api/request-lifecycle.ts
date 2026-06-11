export const REQUEST_STATUSES = ['submitted', 'in_progress', 'in_review', 'completed'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted: ['in_progress'],
  in_progress: ['in_review'],
  in_review: ['completed', 'in_progress'],
  completed: [],
};

export function normalizeStatus(value: string): string {
  return value.trim().toLowerCase();
}

export function isAllowedStatus(value: string): value is RequestStatus {
  return REQUEST_STATUSES.includes(value as RequestStatus);
}

export function getAllowedStatuses(): RequestStatus[] {
  return [...REQUEST_STATUSES];
}

export function getInitialStatuses(): RequestStatus[] {
  return ['submitted'];
}

export function getAllowedNextStatuses(from: string | null): RequestStatus[] {
  if (!from) {
    return getInitialStatuses();
  }

  const normalized = normalizeStatus(from);
  if (!isAllowedStatus(normalized)) {
    return [];
  }

  return ALLOWED_TRANSITIONS[normalized];
}

export function isValidTransition(from: string | null, to: string): boolean {
  const normalizedTo = normalizeStatus(to);
  if (!isAllowedStatus(normalizedTo)) {
    return false;
  }

  if (!from) {
    return getInitialStatuses().includes(normalizedTo);
  }

  const normalizedFrom = normalizeStatus(from);
  if (!isAllowedStatus(normalizedFrom)) {
    return false;
  }

  return ALLOWED_TRANSITIONS[normalizedFrom].includes(normalizedTo);
}

