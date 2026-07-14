from collections.abc import AsyncIterator
from functools import lru_cache

from openai import AsyncOpenAI

from app.core.config import get_settings


@lru_cache
def get_openai() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def stream_chat_response(
    messages: list[dict[str, str]],
    instructions: str | None = None,
) -> AsyncIterator[str]:
    client = get_openai()
    settings = get_settings()

    async with client.responses.stream(
        model=settings.openai_chat_model,
        instructions=instructions,
        input=messages,
    ) as stream:
        async for event in stream:
            if event.type == "response.output_text.delta":
                yield event.delta


async def stream_vision_response(
    question: str,
    image_url: str,
    instructions: str | None = None,
) -> AsyncIterator[str]:
    client = get_openai()
    settings = get_settings()

    async with client.responses.stream(
        model=settings.openai_vision_model,
        instructions=instructions,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": question},
                    {"type": "input_image", "detail": "auto", "image_url": image_url},
                ],
            }
        ],
    ) as stream:
        async for event in stream:
            if event.type == "response.output_text.delta":
                yield event.delta


async def embed_texts(texts: list[str]) -> list[list[float]]:
    client = get_openai()
    settings = get_settings()
    resp = await client.embeddings.create(
        model=settings.openai_embedding_model,
        input=texts,
        dimensions=settings.openai_embedding_dimensions,
    )
    return [item.embedding for item in resp.data]
