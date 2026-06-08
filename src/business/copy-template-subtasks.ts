const DEFAULT_QTY = 1;
const DEFAULT_MAX_WORKERS = 1;
const DEFAULT_INDEX = 0;
const DEFAULT_EXPECTED_TIME = 0;
const DEFAULT_TIME_SPENT = 0;
const DEFAULT_SHARING_TYPE = 'duration' as const;
const DEFAULT_STATUS = 'queued' as const;
const DEFAULT_ACTIVATION_STATUS = 'locked' as const;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type TemplateSubTaskComponent = {
  name?: string;
  qty?: number;
  sharingType?: 'qty' | 'duration';
  maxSameTimeWorkers?: number;
  index?: number;
  dependencies?: JsonValue;
  expectedTime?: number;
};

export type SubTaskCreateFromTemplate = {
  name: string;
  task: string;
  qty: number;
  sharingType: 'qty' | 'duration';
  maxSameTimeWorkers: number;
  index: number;
  dependencies: string[];
  status: typeof DEFAULT_STATUS;
  activationStatus: typeof DEFAULT_ACTIVATION_STATUS;
  expectedTime: number;
  timeSpent: number;
};

function toDependencyIds(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0,
  );
}

export function shouldCopyTemplateSubtasks(
  templateTaskCode: string | null | undefined,
): boolean {
  return typeof templateTaskCode === 'string' && templateTaskCode.trim().length > 0;
}

export function mapTemplateSubTasksToCreatePayloads(
  components: TemplateSubTaskComponent[] | null | undefined,
  taskDocumentId: string,
): SubTaskCreateFromTemplate[] {
  if (!Array.isArray(components)) return [];

  return components
    .filter((component) => {
      const name = component.name?.trim();
      return typeof name === 'string' && name.length > 0;
    })
    .map((component) => ({
      name: component.name!.trim(),
      task: taskDocumentId,
      qty: component.qty ?? DEFAULT_QTY,
      sharingType: component.sharingType ?? DEFAULT_SHARING_TYPE,
      maxSameTimeWorkers: component.maxSameTimeWorkers ?? DEFAULT_MAX_WORKERS,
      index: component.index ?? DEFAULT_INDEX,
      dependencies: toDependencyIds(component.dependencies),
      status: DEFAULT_STATUS,
      activationStatus: DEFAULT_ACTIVATION_STATUS,
      expectedTime: component.expectedTime ?? DEFAULT_EXPECTED_TIME,
      timeSpent: DEFAULT_TIME_SPENT,
    }));
}
