"""리포트 공유 링크: 발급/재사용/취소, 공개 리포트·영상 조회 (인증 없이)."""

import uuid

from app.db import SessionLocal
from app.models import Session
from app.services import session_service as svc


def _start(sid):
    with SessionLocal() as db:
        svc.start_session(db, db.get(Session, uuid.UUID(sid)))


def test_share_link_created_and_reused(client):
    sid = client.post("/api/sessions", json={}).json()["id"]
    r1 = client.post(f"/api/sessions/{sid}/share")
    assert r1.status_code == 200
    token1 = r1.json()["share_token"]
    assert token1

    r2 = client.post(f"/api/sessions/{sid}/share")
    assert r2.status_code == 200
    assert r2.json()["share_token"] == token1  # 재발급 아님, 기존 값 유지


def test_other_user_cannot_create_share(client, other_client):
    sid = client.post("/api/sessions", json={}).json()["id"]
    assert other_client.post(f"/api/sessions/{sid}/share").status_code == 404


def test_public_report_via_share_token(client):
    sid = client.post("/api/sessions", json={}).json()["id"]
    client.post(f"/api/sessions/{sid}/finish")
    token = client.post(f"/api/sessions/{sid}/share").json()["share_token"]

    r = client.get(f"/api/public/reports/{token}")
    assert r.status_code == 200
    assert r.json()["session_id"] == sid


def test_public_report_unfinished_session_conflict(client):
    sid = client.post("/api/sessions", json={}).json()["id"]
    token = client.post(f"/api/sessions/{sid}/share").json()["share_token"]
    assert client.get(f"/api/public/reports/{token}").status_code == 409


def test_public_report_rewrites_recording_url(client):
    sid = client.post("/api/sessions", json={}).json()["id"]
    _start(sid)
    client.post(
        f"/api/sessions/{sid}/recording/chunks?seq=0",
        files={"chunk": ("0.webm", b"abc", "video/webm")},
    )
    client.post(f"/api/sessions/{sid}/finish")
    token = client.post(f"/api/sessions/{sid}/share").json()["share_token"]

    rep = client.get(f"/api/public/reports/{token}").json()
    assert rep["recording"]["url"] == f"/api/public/recordings/{token}"

    r = client.get(f"/api/public/recordings/{token}")
    assert r.status_code == 200 and r.content == b"abc"


def test_unknown_share_token_is_404(client):
    assert client.get("/api/public/reports/does-not-exist").status_code == 404
    assert client.get("/api/public/recordings/does-not-exist").status_code == 404


def test_revoke_share_link_invalidates_it(client):
    sid = client.post("/api/sessions", json={}).json()["id"]
    client.post(f"/api/sessions/{sid}/finish")
    token = client.post(f"/api/sessions/{sid}/share").json()["share_token"]
    assert client.get(f"/api/public/reports/{token}").status_code == 200

    assert client.delete(f"/api/sessions/{sid}/share").status_code == 204
    assert client.get(f"/api/public/reports/{token}").status_code == 404


def test_other_user_cannot_revoke_share(client, other_client):
    sid = client.post("/api/sessions", json={}).json()["id"]
    client.post(f"/api/sessions/{sid}/share")
    assert other_client.delete(f"/api/sessions/{sid}/share").status_code == 404
