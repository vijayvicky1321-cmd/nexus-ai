from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    # Service-role key bypasses RLS; every query in this service must filter
    # by user_id/org_id explicitly since the database will not do it for us.
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
