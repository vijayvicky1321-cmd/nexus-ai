from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.core.auth import AuthContext, get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/")
async def billing_status(auth: AuthContext = Depends(get_current_user)):
    return JSONResponse(
        status_code=501,
        content={"error": "not_implemented", "message": "Stripe billing is not wired up yet."},
    )
