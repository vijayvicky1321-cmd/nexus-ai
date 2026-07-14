import json
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.auth import AuthContext, get_current_user
from app.core.scoping import scope_query
from app.models.agents import AgentRunDetail, AgentRunSummary, CreateAgentRunRequest
from app.services.openai_client import stream_chat_response
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/agents", tags=["agents"])

PLANNING_INSTRUCTIONS = (
    "You are a planning assistant. Given a goal, break it down into a short "
    "ordered list of 3 to 6 concrete, actionable steps that together achieve "
    "the goal. Respond ONLY with a numbered list in exactly this format, one "
    "step per line, no preamble or extra commentary:\n1. <step>\n2. <step>\n..."
)


def parse_numbered_steps(text: str) -> list[str]:
    steps = [s.strip() for s in re.findall(r"^\s*\d+[.)]\s*(.+)$", text, re.MULTILINE)]
    steps = [s for s in steps if s]
    if steps:
        return steps
    fallback = text.strip()
    return [fallback] if fallback else []


def _build_step_prompt(goal: str, index: int, total: int, step: str, prior: list[dict]) -> str:
    if prior:
        prior_text = "\n".join(f"{i + 1}. {p['step']} -> {p['result']}" for i, p in enumerate(prior))
    else:
        prior_text = "(none yet)"
    return (
        f"You are executing step {index + 1} of {total} of a plan to achieve this goal: {goal}\n\n"
        f"This step is: {step}\n\n"
        f"Prior steps and their results:\n{prior_text}\n\n"
        "Complete this step and give a clear, concrete result."
    )


def _build_summary_prompt(goal: str, step_results: list[dict]) -> str:
    steps_text = "\n".join(f"{i + 1}. {p['step']} -> {p['result']}" for i, p in enumerate(step_results))
    return (
        "Here is a completed plan and the results of each step. Write a clear, "
        "well-organized final summary of the overall outcome.\n\n"
        f"Goal: {goal}\n\nSteps and results:\n{steps_text}"
    )


async def _get_run_or_404(sb, run_id: str, auth: AuthContext) -> dict:
    res = (
        scope_query(sb.table("agent_runs").select("*"), auth)
        .eq("id", run_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Run not found")
    return res.data[0]


@router.get("/runs", response_model=list[AgentRunSummary])
async def list_runs(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("agent_runs").select("id, goal, status, created_at"), auth)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.get("/runs/{run_id}", response_model=AgentRunDetail)
async def get_run(run_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    run = await _get_run_or_404(sb, run_id, auth)
    return run


@router.delete("/runs/{run_id}")
async def delete_run(run_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    await _get_run_or_404(sb, run_id, auth)
    sb.table("agent_runs").delete().eq("id", run_id).execute()
    return {"status": "deleted"}


@router.post("/runs")
async def create_run(body: CreateAgentRunRequest, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    run_id = str(uuid.uuid4())
    goal = body.goal
    row = {
        "id": run_id,
        "user_id": auth.user_id,
        "org_id": auth.org_id,
        "goal": goal,
        "status": "planning",
    }
    sb.table("agent_runs").insert(row).execute()

    async def event_generator():
        try:
            plan_text = ""
            async for delta in stream_chat_response(
                [{"role": "user", "content": goal}], instructions=PLANNING_INSTRUCTIONS
            ):
                plan_text += delta

            steps = parse_numbered_steps(plan_text)
            if not steps:
                raise ValueError("Planning produced no usable steps")

            sb.table("agent_runs").update({"plan": steps, "status": "running"}).eq(
                "id", run_id
            ).execute()
            yield {"event": "message", "data": json.dumps({"type": "plan_ready", "steps": steps})}

            step_results: list[dict] = []
            for i, step in enumerate(steps):
                yield {
                    "event": "message",
                    "data": json.dumps({"type": "step_started", "index": i, "step": step}),
                }

                prompt = _build_step_prompt(goal, i, len(steps), step, step_results)
                result_text = ""
                async for delta in stream_chat_response([{"role": "user", "content": prompt}]):
                    result_text += delta
                    yield {
                        "event": "message",
                        "data": json.dumps({"type": "step_delta", "index": i, "delta": delta}),
                    }

                step_results.append({"step": step, "result": result_text})
                sb.table("agent_runs").update({"step_results": step_results}).eq(
                    "id", run_id
                ).execute()
                yield {
                    "event": "message",
                    "data": json.dumps(
                        {"type": "step_done", "index": i, "result": result_text}
                    ),
                }

            summary_prompt = _build_summary_prompt(goal, step_results)
            final_summary = ""
            async for delta in stream_chat_response([{"role": "user", "content": summary_prompt}]):
                final_summary += delta
                yield {"event": "message", "data": json.dumps({"type": "summary_delta", "delta": delta})}

            sb.table("agent_runs").update(
                {"final_summary": final_summary, "status": "done"}
            ).eq("id", run_id).execute()
            yield {"event": "message", "data": json.dumps({"type": "done", "run_id": run_id})}
        except Exception as exc:  # noqa: BLE001
            sb.table("agent_runs").update({"status": "error"}).eq("id", run_id).execute()
            yield {"event": "message", "data": json.dumps({"type": "error", "message": str(exc)})}

    return EventSourceResponse(event_generator())
