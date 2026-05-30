export type RunStatus =
  | "COMPLETED"
  | "FAILED"
  | "RUNNING"
  | "QUEUED"
  | "CANCELLED"
  | "SKIPPED"
  | "WAITING";

export type TraceSpanStatus =
  | "COMPLETED"
  | "FAILED"
  | "RUNNING"
  | "QUEUED"
  | "WAITING"
  | "CANCELLED"
  | "SKIPPED";

export type StepOp =
  | "INVOKE"
  | "RUN"
  | "SLEEP"
  | "WAIT_FOR_EVENT"
  | "WAIT_FOR_SIGNAL"
  | "AI_GATEWAY";

export interface AppFunction {
  id: string;
  name: string;
  slug: string;
}

export interface App {
  id: string;
  name: string;
  functions: AppFunction[];
}

export interface FunctionRunV2 {
  id: string;
  appID: string;
  app: App;
  functionID: string;
  function: AppFunction;
  traceID: string;
  queuedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: RunStatus;
  eventName: string | null;
  isBatch: boolean;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface RunsConnection {
  edges: { cursor: string; node: FunctionRunV2 }[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface InvokeStepInfo {
  __typename: "InvokeStepInfo";
  functionID: string;
  runID: string | null;
  timedOut: boolean | null;
}

export interface RunStepInfo {
  __typename: "RunStepInfo";
  type: string | null;
}

export type StepInfo = InvokeStepInfo | RunStepInfo;

export interface StepError {
  message: string;
  name: string;
  stack: string | null;
}

export interface RunTraceSpanOutput {
  input: string | null; // JSON bytes — step/function input
  data: string | null;  // JSON bytes — step/function output
  error: StepError | null;
}

export interface TraceSpan {
  spanID: string;
  outputID: string | null;
  name: string;
  status: TraceSpanStatus;
  stepOp: StepOp | null;
  stepID: string | null;
  duration: number | null;
  queuedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  childrenSpans: TraceSpan[];
  isRoot: boolean;
  parentSpanID: string | null;
  stepInfo: StepInfo | null;
}

export interface Filters {
  appID: string | null;
  functionIDs: string[];
  from: string;
  until: string | null;
  status: RunStatus | null;
}
