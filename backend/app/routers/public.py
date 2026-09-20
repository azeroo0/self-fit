"""로그인 없이 보는 공유 리포트/영상. share_token 으로만 조회하며 인증 의존성이 없다."""

import mimetypes
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DbSession

from app.db import get_db
from app.services import recording_service as rec
from app.services import report_service
from app.services import session_service as svc

router = APIRouter(prefix="/api/public", tags=["public"])
DbDep = Annotated[DbSession, Depends(get_db)]


@router.get("/reports/{share_token}")
def public_report(share_token: str, db: DbDep):
    s = svc.get_session_by_share_token(db, share_token)
    summary = report_service.get_report(db, s.id)
    if summary is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "세션이 끝나지 않았습니다.")
    if summary.get("recording"):
        summary = {**summary, "recording": {**summary["recording"], "url": f"/api/public/recordings/{share_token}"}}
    return summary


@router.get("/recordings/{share_token}")
def public_recording(share_token: str, db: DbDep):
    s = svc.get_session_by_share_token(db, share_token)
    f = rec.playable_path(s.id)
    if f is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "녹화가 없습니다.")
    media_type = mimetypes.guess_type(f.name)[0] or "video/webm"
    return FileResponse(f, media_type=media_type, filename=None)
