from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    cors_origins: str = "http://localhost:3000"

    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimensions: int = 1536
    openai_vision_model: str = "gpt-4.1-mini"
    openai_realtime_model: str = "gpt-realtime-2.1"

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "pdf-documents"
    supabase_images_bucket: str = "images"
    supabase_code_bucket: str = "code-files"
    image_signed_url_ttl_seconds: int = 600

    clerk_secret_key: str = ""
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""

    chunk_size_chars: int = 1500
    chunk_overlap_chars: int = 200
    retrieval_top_k: int = 5
    full_text_context_char_limit: int = 300_000

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
