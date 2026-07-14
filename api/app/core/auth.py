from dataclasses import dataclass

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import Settings, get_settings
from app.services.supabase_client import get_supabase

bearer_scheme = HTTPBearer(auto_error=False)

_jwks_cache: dict | None = None


@dataclass
class AuthContext:
    user_id: str
    org_id: str | None


def _get_jwks(settings: Settings) -> dict:
    # Clerk rotates signing keys rarely; a process-lifetime cache avoids a
    # network round trip on every request without needing a TTL.
    global _jwks_cache
    if _jwks_cache is None:
        resp = httpx.get(settings.clerk_jwks_url, timeout=5.0)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthContext:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    token = credentials.credentials

    if settings.environment == "development" and not settings.clerk_jwks_url:
        # Allows local frontend/backend wiring before Clerk env vars are filled in.
        unverified = jwt.get_unverified_claims(token)
        auth = AuthContext(
            user_id=unverified.get("sub", "dev-user"),
            org_id=unverified.get("org_id"),
        )
        _sync_user(auth)
        return auth

    try:
        jwks = _get_jwks(settings)
        claims = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer or None,
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject")

    auth = AuthContext(user_id=user_id, org_id=claims.get("org_id"))
    _sync_user(auth)
    return auth


def _sync_user(auth: AuthContext) -> None:
    # Clerk owns identity; we only learn a user exists when their token first
    # hits our API, so upsert here to satisfy the users FK before any query runs.
    get_supabase().table("users").upsert(
        {"id": auth.user_id, "org_id": auth.org_id}
    ).execute()
