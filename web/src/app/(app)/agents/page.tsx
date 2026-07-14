"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { apiFetch, readSSEStreamEvents } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { RunList } from "@/components/agents/run-list";
import { QuickActions } from "@/components/agents/quick-actions";
import { PromptInput } from "@/components/agents/prompt-input";
import { ProgressTimeline } from "@/components/agents/progress-timeline";
import { ResultsPanel } from "@/components/agents/results-panel";
import type { AgentEvent, AgentRunDetail, AgentRunSummary, StepResult } from "@/components/agents/types";

type LiveStep = {
  step: string;
  result: string;
  done: boolean;
};

export default function AgentsPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentRunDetail | null>(null);

  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [liveGoal, setLiveGoal] = useState<string | null>(null);
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);
  const [liveSummary, setLiveSummary] = useState("");
  const [liveError, setLiveError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadRuns = useCallback(async () => {
    const token = await getToken();
    const res = await apiFetch("/agents/runs", token);
    if (!res.ok) return;
    setRuns(await res.json());
  }, [getToken]);

  useEffect(() => {
    setActiveId(null);
    setDetail(null);
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  async function loadDetail(runId: string) {
    const token = await getToken();
    const res = await apiFetch(`/agents/runs/${runId}`, token);
    if (!res.ok) return;
    setDetail(await res.json());
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setLiveGoal(null);
    setLiveSteps([]);
    setLiveSummary("");
    setLiveError(null);
    loadDetail(id);
  }

  function handleStartNew() {
    setActiveId(null);
    setDetail(null);
    setGoal("");
    setLiveGoal(null);
    setLiveSteps([]);
    setLiveSummary("");
    setLiveError(null);
  }

  async function handleRun() {
    const trimmed = goal.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setActiveId(null);
    setDetail(null);
    setLiveGoal(trimmed);
    setLiveSteps([]);
    setLiveSummary("");
    setLiveError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getToken();
      const res = await apiFetch("/agents/runs", token, {
        method: "POST",
        body: JSON.stringify({ goal: trimmed }),
        signal: controller.signal,
      });

      await readSSEStreamEvents(res, (payload) => {
        const event = payload as AgentEvent;
        switch (event.type) {
          case "plan_ready":
            setLiveSteps(event.steps.map((step) => ({ step, result: "", done: false })));
            break;
          case "step_started":
            break;
          case "step_delta":
            setLiveSteps((prev) =>
              prev.map((s, i) => (i === event.index ? { ...s, result: s.result + event.delta } : s))
            );
            break;
          case "step_done":
            setLiveSteps((prev) =>
              prev.map((s, i) => (i === event.index ? { ...s, result: event.result, done: true } : s))
            );
            break;
          case "summary_delta":
            setLiveSummary((prev) => prev + event.delta);
            break;
          case "done":
            loadRuns();
            break;
          case "error":
            setLiveError(event.message);
            break;
        }
      });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setLiveError("Something went wrong while running this agent.");
      }
    } finally {
      abortRef.current = null;
      setSubmitting(false);
      setGoal("");
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleRegenerate() {
    const text = liveGoal ?? detail?.goal ?? "";
    if (!text.trim()) return;
    setGoal(text);
    // handleRun reads from `goal` state; queue the run on the next tick once state settles.
    setTimeout(() => handleRun(), 0);
  }

  const showLive = liveGoal !== null;
  const stepResults: StepResult[] = detail?.step_results ?? [];
  const planFromDetail = detail?.plan ?? [];
  const detailSteps: LiveStep[] = planFromDetail.map((step, i) => ({
    step,
    result: stepResults[i]?.result ?? "",
    done: Boolean(stepResults[i]),
  }));

  return (
    <div className="flex flex-1 overflow-hidden">
      <RunList runs={runs} activeId={activeId} onSelect={handleSelect} onCreate={handleStartNew} />

      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <AnimatePresence mode="wait">
            {!showLive && !detail && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-primary">
                      <Sparkles className="size-4 text-primary-foreground" />
                    </div>
                    <h1 className="text-lg font-semibold">AI Agents</h1>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Describe a goal in plain language. The agent will break it into steps,
                    execute each one, and produce a final summary.
                  </p>
                </div>

                <QuickActions onSelect={(prompt) => setGoal(prompt)} />

                <PromptInput goal={goal} onGoalChange={setGoal} onRun={handleRun} submitting={submitting} />
              </motion.div>
            )}

            {showLive && (
              <motion.div
                key="live"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-lg font-semibold">{liveGoal}</h1>
                  {submitting && (
                    <Button variant="destructive" size="sm" onClick={handleStop} className="shrink-0">
                      Stop
                    </Button>
                  )}
                </div>

                {liveError && (
                  <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                    {liveError}
                  </p>
                )}

                <ProgressTimeline
                  planning={submitting && liveSteps.length === 0}
                  steps={liveSteps}
                  summarizing={
                    submitting && liveSteps.length > 0 && liveSteps.every((s) => s.done) && !liveSummary
                  }
                  completed={!submitting && liveSteps.length > 0 && liveSteps.every((s) => s.done)}
                />

                {liveSummary && (
                  <ResultsPanel
                    goal={liveGoal ?? ""}
                    summary={liveSummary}
                    onRegenerate={handleRegenerate}
                    regenerating={submitting}
                  />
                )}
              </motion.div>
            )}

            {!showLive && detail && (
              <motion.div
                key="detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h1 className="text-lg font-semibold">{detail.goal}</h1>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{detail.status}</p>
                </div>

                <ProgressTimeline
                  planning={false}
                  steps={detailSteps}
                  summarizing={false}
                  completed={detail.status === "done"}
                />

                {detail.final_summary && (
                  <ResultsPanel
                    goal={detail.goal}
                    summary={detail.final_summary}
                    onRegenerate={handleRegenerate}
                    regenerating={submitting}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
