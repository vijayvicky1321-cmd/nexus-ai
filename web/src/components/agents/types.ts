export type AgentRunStatus = "planning" | "running" | "done" | "error";

export type AgentRunSummary = {
  id: string;
  goal: string;
  status: AgentRunStatus;
  created_at?: string;
};

export type StepResult = {
  step: string;
  result: string;
};

export type AgentRunDetail = {
  id: string;
  goal: string;
  status: AgentRunStatus;
  plan: string[] | null;
  step_results: StepResult[];
  final_summary: string | null;
  created_at?: string;
};

export type AgentEvent =
  | { type: "plan_ready"; steps: string[] }
  | { type: "step_started"; index: number; step: string }
  | { type: "step_delta"; index: number; delta: string }
  | { type: "step_done"; index: number; result: string }
  | { type: "summary_delta"; delta: string }
  | { type: "done"; run_id: string }
  | { type: "error"; message: string };
