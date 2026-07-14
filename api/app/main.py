from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import admin, agents, billing, calendar, chat, coding, email, image, notes, org, pdf, tasks, voice

settings = get_settings()

app = FastAPI(title="Nexus AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Citations"],
)

app.include_router(chat.router)
app.include_router(pdf.router)
app.include_router(image.router)
app.include_router(billing.router)
app.include_router(org.router)
app.include_router(voice.router)
app.include_router(coding.router)
app.include_router(notes.router)
app.include_router(calendar.router)
app.include_router(tasks.router)
app.include_router(email.router)
app.include_router(agents.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
