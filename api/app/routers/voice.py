import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import AuthContext, get_current_user
from app.core.config import get_settings

router = APIRouter(prefix="/voice", tags=["voice"])

OPENAI_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets"


@router.post("/session")
async def create_voice_session(auth: AuthContext = Depends(get_current_user)):
    # The browser talks to OpenAI directly over WebRTC for low-latency audio, so it
    # must never see the real API key. This mints a short-lived ephemeral token
    # instead, scoped to a single realtime session.
    settings = get_settings()

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            OPENAI_CLIENT_SECRETS_URL,
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "session": {
                    "type": "realtime",
                    "model": settings.openai_realtime_model,
                    "instructions": (
                        "You are a knowledgeable, articulate voice assistant. Give thorough "
                        "answers rather than terse one-liners.\n\n"
                        "When an answer has more than one distinct point (comparisons, steps, "
                        "reasons, examples), you MUST speak it as a clearly separated list, not "
                        "a single run-on paragraph. Say the number or label out loud for each "
                        "point — for example: 'There are three main differences. First, ... "
                        "Second, ... Third, ...' or 'One advantage is ... Another advantage is "
                        "...' — and pause briefly between points. Never merge more than one "
                        "distinct point into the same sentence.\n\n"
                        "Keep each point itself concise and concrete — specifics and examples, "
                        "not filler. Still sound natural and conversational, not like you're "
                        "reading a bulleted document aloud."
                    ),
                }
            },
        )

    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, f"Failed to create realtime session: {resp.text}")

    data = resp.json()

    return {
        "client_secret": data.get("value"),
        "expires_at": data.get("expires_at"),
        "model": settings.openai_realtime_model,
    }
