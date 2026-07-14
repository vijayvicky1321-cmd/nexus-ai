from datetime import datetime
from typing import Literal

from pydantic import BaseModel

AgentRunStatus = Literal["planning", "running", "done", "error"]


class AgentRunSummary(BaseModel):
    id: str
    goal: str
    status: AgentRunStatus
    created_at: datetime | None = None


class StepResult(BaseModel):
    step: str
    result: str


class AgentRunDetail(BaseModel):
    id: str
    goal: str
    status: AgentRunStatus
    plan: list[str] | None = None
    step_results: list[StepResult] = []
    final_summary: str | None = None
    created_at: datetime | None = None


class CreateAgentRunRequest(BaseModel):
    goal: str
