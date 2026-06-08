const FINISHED_STATUS = 'finished';
const DISABLED_ACTIVATION_STATUS = 'disabled';

export const SUB_TASKS_TABLE = 'sub_tasks';
export const SUB_TASK_ASSIGNED_LINK_TABLE = 'sub_tasks_assigned_to_lnk';
export const USERS_TABLE = 'up_users';

export type KioskSubTaskRow = {
  documentId: string;
  name: string;
  index: number;
  status: string;
  activationStatus: 'locked' | 'unlocked' | 'disabled';
  qty: number;
  completedQty: number;
  sharingType: 'qty' | 'duration';
  timeSpent: number;
  startedAt: string | null;
};

type UserDocumentRef = {
  documentId?: string;
  document_id?: string;
};

type SubTaskDbRow = {
  document_id?: string;
  documentId?: string;
  name?: string;
  index?: number;
  status?: string;
  activation_status?: string;
  activationStatus?: string;
  qty?: number;
  sharing_type?: string;
  sharingType?: string;
  time_spent?: number;
  timeSpent?: number;
};

type OpenActivityRef = {
  subTaskId: number;
  timestamp: string;
};

export function readUserDocumentId(
  user: UserDocumentRef | null | undefined,
): string | null {
  if (!user) return null;
  const value = user.documentId ?? user.document_id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readActivationStatus(
  row: SubTaskDbRow,
): KioskSubTaskRow['activationStatus'] {
  const value = row.activationStatus ?? row.activation_status;
  if (value === 'unlocked' || value === 'disabled') return value;
  return 'locked';
}

export function isVisibleOnKiosk(activationStatus: string | undefined): boolean {
  return activationStatus !== DISABLED_ACTIVATION_STATUS;
}

export function mapSubTaskDbRow(
  row: SubTaskDbRow,
  startedAt: string | null = null,
  completedQty = 0,
): KioskSubTaskRow {
  const sharingType = row.sharingType ?? row.sharing_type;
  return {
    documentId: String(row.documentId ?? row.document_id ?? ''),
    name: String(row.name ?? ''),
    index: Number(row.index ?? 0),
    status: String(row.status ?? 'queued'),
    activationStatus: readActivationStatus(row),
    qty: Number(row.qty ?? 1),
    completedQty: Math.max(0, completedQty),
    sharingType: sharingType === 'qty' ? 'qty' : 'duration',
    timeSpent: Number(row.timeSpent ?? row.time_spent ?? 0),
    startedAt,
  };
}

export function filterKioskVisibleSubTasks<T extends { activationStatus?: string }>(
  rows: T[],
): T[] {
  return rows.filter((row) => isVisibleOnKiosk(row.activationStatus));
}

export function isActiveKioskSubTask(status: string | undefined): boolean {
  return status !== FINISHED_STATUS;
}

export function buildStartedAtBySubTaskId(
  activities: OpenActivityRef[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const activity of activities) {
    if (!map.has(activity.subTaskId)) {
      map.set(activity.subTaskId, activity.timestamp);
    }
  }
  return map;
}
