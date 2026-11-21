"""Sustainability360 backend — FastAPI.

Rebuilt to match every endpoint the React frontend calls (all routes live under /api).
Run:  uvicorn server:app --reload --port 8001
"""
import json
import os
import re
import secrets
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import bcrypt  # noqa: E402
import httpx  # noqa: E402
import jwt  # noqa: E402
from fastapi import APIRouter, Body, Depends, FastAPI, HTTPException, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import Response  # noqa: E402

import ai  # noqa: E402
import db  # noqa: E402
from reports import build_docx, build_pdf, build_qr, build_xlsx  # noqa: E402
from sasb_data import SASB_BY_ID, SASB_INDUSTRIES  # noqa: E402

JWT_SECRET = os.environ.get("JWT_SECRET") or "change-me-" + "dev-secret"
JWT_HOURS = 8
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
ROLES = ["super_admin", "company_admin", "consultant", "auditor", "data_entry", "supplier", "viewer"]
ADMINS = ["super_admin", "company_admin"]
WRITERS = ["super_admin", "company_admin", "consultant", "data_entry", "supplier"]

app = FastAPI(title="Sustainability360 API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
api = APIRouter(prefix="/api")

# --------------------------------------------------------------------------- helpers

PROTECTED_FIELDS = {"id", "company_id", "created_at", "updated_at", "created_by", "results", "slug"}


def clean(body: dict) -> dict:
    return {k: v for k, v in (body or {}).items() if k not in PROTECTED_FIELDS}


def public_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k != "password_hash"}


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def check_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except ValueError:
        return False


def make_token(user: dict) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_HOURS)
    return jwt.encode({"sub": user["id"], "exp": exp}, JWT_SECRET, algorithm="HS256")


def current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Session expired — please sign in again")
    user = db.find_one("users", {"id": payload["sub"]})
    if not user or not user.get("active", True):
        raise HTTPException(401, "Account disabled")
    return user


def require(*roles):
    def dep(user: dict = Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "You don't have permission for this action")
        return user
    return dep


def scope(user: dict) -> dict:
    return {} if user["role"] == "super_admin" else {"company_id": user.get("company_id")}


def get_owned(collection: str, doc_id: str, user: dict) -> dict:
    doc = db.find_one(collection, {"id": doc_id})
    if not doc or (user["role"] != "super_admin" and doc.get("company_id") != user.get("company_id")):
        raise HTTPException(404, "Not found")
    return doc


def get_by_id(collection: str, doc_id: str) -> dict:
    doc = db.find_one(collection, {"id": doc_id})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


def audit(user: dict | None, action: str, resource: str, resource_id: str | None = None, details: dict | None = None):
    db.insert("audit_logs", {
        "timestamp": db.now_iso(), "user_id": user and user["id"], "user_email": user and user["email"],
        "company_id": user and user.get("company_id"), "action": action, "resource": resource,
        "resource_id": resource_id, "details": details,
    })


def file_response(data: bytes, filename: str, media: str) -> Response:
    return Response(data, media_type=media, headers={"Content-Disposition": f'inline; filename="{filename}"'})


def note_export(doc: dict, kind: str):
    db.insert("exports", {"company_id": doc.get("company_id"), "resource": kind, "resource_id": doc["id"]})


PDF = "application/pdf"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def fname(title: str, ext: str) -> str:
    return (re.sub(r"[^A-Za-z0-9]+", "_", title or "report").strip("_") or "report") + "." + ext


def num(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


# --------------------------------------------------------------------------- plans

PLANS = [
    {"id": "free_demo", "name": "Free Demo", "price": 0, "users": 2, "projects": 1, "reports": 3, "storage_gb": 1, "modules": ["lca", "esg"]},
    {"id": "consultant", "name": "Consultant", "price": 49, "users": 3, "projects": 10, "reports": 25, "storage_gb": 10, "modules": ["lca", "esg", "carbon", "ai"]},
    {"id": "company", "name": "Company", "price": 199, "users": 15, "projects": 50, "reports": 200, "storage_gb": 50, "modules": ["all"]},
    {"id": "enterprise", "name": "Enterprise", "price": 799, "users": -1, "projects": -1, "reports": -1, "storage_gb": 500, "modules": ["all"]},
    {"id": "auditor", "name": "Auditor", "price": 99, "users": 5, "projects": -1, "reports": 50, "storage_gb": 20, "modules": ["audit", "lca", "esg", "traceability"]},
]
PLAN_BY_ID = {p["id"]: p for p in PLANS}

# --------------------------------------------------------------------------- startup


@app.on_event("startup")
def seed():
    email = os.environ.get("ADMIN_EMAIL", "admin@sustainability360.local").lower()
    if not db.find_one("users", {"email": email}):
        db.insert("users", {
            "name": "Super Admin", "email": email, "password_hash": hash_pw(os.environ.get("ADMIN_PASSWORD", "admin123")),
            "role": "super_admin", "company_id": None, "active": True,
        })
        print(f"[seed] super admin created: {email}")


# --------------------------------------------------------------------------- auth


@api.post("/auth/register")
def register(body: dict = Body(...)):
    name, email, pw = (body.get("name") or "").strip(), (body.get("email") or "").strip().lower(), body.get("password") or ""
    if not name or not email or len(pw) < 6:
        raise HTTPException(400, "Name, email and a password of at least 6 characters are required")
    if db.find_one("users", {"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    join_code = (body.get("company_id") or "").strip()
    if join_code:
        company = db.find_one("companies", {"id": join_code})
        if not company:
            raise HTTPException(404, "Invalid workspace join code")
        if db.find_one("join_requests", {"email": email, "status": "pending"}):
            raise HTTPException(400, "A request for this email is already pending")
        req = db.insert("join_requests", {"company_id": join_code, "name": name, "email": email,
                                          "password_hash": hash_pw(pw), "status": "pending"})
        audit({"id": None, "email": email, "company_id": join_code}, "join_request", "company", join_code)
        return {"pending_approval": True, "request_id": req["id"]}
    company = db.insert("companies", {"name": f"{name}'s workspace", "industry": "", "country": "",
                                      "contact_email": email, "plan": "free_demo", "active": True})
    user = db.insert("users", {"name": name, "email": email, "password_hash": hash_pw(pw),
                               "role": "company_admin", "company_id": company["id"], "active": True})
    audit(user, "register", "user", user["id"])
    return {"access_token": make_token(user), "user": public_user(user)}


@api.post("/auth/login")
def login(body: dict = Body(...)):
    email = (body.get("email") or "").strip().lower()
    user = db.find_one("users", {"email": email})
    if not user or not check_pw(body.get("password") or "", user["password_hash"]):
        if db.find_one("join_requests", {"email": email, "status": "pending"}):
            raise HTTPException(403, "Your access request is still awaiting admin approval")
        raise HTTPException(401, "Invalid email or password")
    if not user.get("active", True):
        raise HTTPException(403, "Your account has been deactivated")
    audit(user, "login", "auth")
    return {"access_token": make_token(user), "user": public_user(user)}


@api.get("/auth/me")
def me(user: dict = Depends(current_user)):
    return public_user(user)


@api.post("/auth/logout")
def logout(user: dict = Depends(current_user)):
    audit(user, "logout", "auth")
    return {"ok": True}


@api.post("/auth/forgot-password")
def forgot_password(body: dict = Body(...)):
    user = db.find_one("users", {"email": (body.get("email") or "").strip().lower()})
    if user:
        token = secrets.token_urlsafe(32)
        db.insert("password_resets", {"token": token, "user_id": user["id"], "used": False,
                                      "expires": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()})
        # No email service is configured: the link is printed in the backend terminal.
        print(f"[password reset] {user['email']}: {FRONTEND_URL}/reset-password?token={token}")
    return {"ok": True}


@api.post("/auth/reset-password")
def reset_password(body: dict = Body(...)):
    rec = db.find_one("password_resets", {"token": body.get("token") or "", "used": False})
    if not rec or rec["expires"] < db.now_iso():
        raise HTTPException(400, "This reset link is invalid or has expired")
    if len(body.get("password") or "") < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    db.update("users", rec["user_id"], {"password_hash": hash_pw(body["password"])})
    db.update("password_resets", rec["id"], {"used": True})
    return {"ok": True}


# --------------------------------------------------------------------------- companies & users


@api.get("/companies")
def list_companies(user: dict = Depends(current_user)):
    if user["role"] == "super_admin":
        return db.find("companies")
    c = db.find_one("companies", {"id": user.get("company_id")}) if user.get("company_id") else None
    return [c] if c else []


@api.post("/companies")
def create_company(body: dict = Body(...), user: dict = Depends(require("super_admin"))):
    if not (body.get("name") or "").strip():
        raise HTTPException(400, "Company name is required")
    c = db.insert("companies", {**clean(body), "plan": body.get("plan") or "free_demo", "active": True})
    audit(user, "create", "company", c["id"], {"name": c["name"]})
    return c


@api.delete("/companies/{cid}")
def delete_company(cid: str, user: dict = Depends(require("super_admin"))):
    if not db.delete("companies", cid):
        raise HTTPException(404, "Not found")
    audit(user, "delete", "company", cid)
    return {"ok": True}


@api.get("/users")
def list_users(user: dict = Depends(require(*ADMINS))):
    return [public_user(u) for u in db.find("users", scope(user))]


@api.post("/users")
def create_user(body: dict = Body(...), user: dict = Depends(require(*ADMINS))):
    email = (body.get("email") or "").strip().lower()
    if not body.get("name") or not email or len(body.get("password") or "") < 6:
        raise HTTPException(400, "Name, email and a temporary password (6+ chars) are required")
    if db.find_one("users", {"email": email}):
        raise HTTPException(400, "A user with this email already exists")
    role = body.get("role") or "viewer"
    if role not in ROLES or (role == "super_admin" and user["role"] != "super_admin"):
        raise HTTPException(400, "Invalid role")
    company_id = body.get("company_id") if user["role"] == "super_admin" else user.get("company_id")
    u = db.insert("users", {"name": body["name"], "email": email, "password_hash": hash_pw(body["password"]),
                            "role": role, "company_id": company_id, "active": True})
    audit(user, "create", "user", u["id"], {"email": email, "role": role})
    return public_user(u)


@api.put("/users/{uid}")
def update_user(uid: str, body: dict = Body(...), user: dict = Depends(require(*ADMINS))):
    target = get_owned("users", uid, user)
    if target["id"] == user["id"] and body.get("active") is False:
        raise HTTPException(400, "You can't deactivate your own account")
    changes = {k: body[k] for k in ("name", "role", "active") if k in body}
    if "role" in changes and (changes["role"] not in ROLES or (changes["role"] == "super_admin" and user["role"] != "super_admin")):
        raise HTTPException(400, "Invalid role")
    audit(user, "update", "user", uid, changes)
    return public_user(db.update("users", uid, changes))


@api.delete("/users/{uid}")
def delete_user(uid: str, user: dict = Depends(require(*ADMINS))):
    get_owned("users", uid, user)
    if uid == user["id"]:
        raise HTTPException(400, "You can't delete your own account")
    db.delete("users", uid)
    audit(user, "delete", "user", uid)
    return {"ok": True}


@api.get("/join-requests")
def list_join_requests(user: dict = Depends(require(*ADMINS))):
    return [{k: v for k, v in r.items() if k != "password_hash"} for r in db.find("join_requests", {**scope(user), "status": "pending"})]


@api.get("/join-requests/count")
def count_join_requests(user: dict = Depends(require(*ADMINS))):
    return {"count": db.count("join_requests", {**scope(user), "status": "pending"})}


@api.post("/join-requests/{rid}/approve")
def approve_join(rid: str, body: dict = Body(default={}), user: dict = Depends(require(*ADMINS))):
    req = get_owned("join_requests", rid, user)
    if req["status"] != "pending":
        raise HTTPException(400, "Request already handled")
    role = (body or {}).get("role") or "viewer"
    if role not in ROLES or role == "super_admin":
        raise HTTPException(400, "Invalid role")
    if db.find_one("users", {"email": req["email"]}):
        raise HTTPException(400, "A user with this email already exists")
    u = db.insert("users", {"name": req["name"], "email": req["email"], "password_hash": req["password_hash"],
                            "role": role, "company_id": req["company_id"], "active": True})
    db.update("join_requests", rid, {"status": "approved", "decided_by": user["id"]})
    audit(user, "approve", "join_request", rid, {"email": req["email"], "role": role})
    return public_user(u)


@api.post("/join-requests/{rid}/reject")
def reject_join(rid: str, user: dict = Depends(require(*ADMINS))):
    get_owned("join_requests", rid, user)
    db.update("join_requests", rid, {"status": "rejected", "decided_by": user["id"]})
    audit(user, "reject", "join_request", rid)
    return {"ok": True}


# --------------------------------------------------------------------------- region settings

DEFAULT_REGION = {"region": "global", "label": "Global", "currency": "USD", "locale": "en-US", "units": "metric", "framework": "GRI"}


@api.get("/settings/region")
def get_region(user: dict = Depends(current_user)):
    s = db.find_one("region_settings", {"user_id": user["id"]})
    return {**DEFAULT_REGION, **({k: v for k, v in s.items() if k in DEFAULT_REGION} if s else {})}


@api.put("/settings/region")
def put_region(body: dict = Body(...), user: dict = Depends(current_user)):
    data = {k: body[k] for k in DEFAULT_REGION if k in body}
    if data.get("units") not in (None, "metric", "imperial"):
        raise HTTPException(400, "Units must be metric or imperial")
    s = db.find_one("region_settings", {"user_id": user["id"]})
    if s:
        db.update("region_settings", s["id"], data)
    else:
        db.insert("region_settings", {"user_id": user["id"], **data})
    audit(user, "update", "region_settings", None, data)
    return get_region(user)


# --------------------------------------------------------------------------- generic CRUD factory


def owned_list(collection: str, user: dict) -> list:
    return db.find(collection, scope(user))


def create_doc(collection: str, body: dict, user: dict, extra: dict | None = None) -> dict:
    if user["role"] not in WRITERS:
        raise HTTPException(403, "Your role is read-only")
    doc = db.insert(collection, {**clean(body), **(extra or {}), "company_id": user.get("company_id"), "created_by": user["id"]})
    audit(user, "create", collection, doc["id"], {"title": doc.get("title") or doc.get("product_name") or doc.get("name")})
    return doc


def update_doc(collection: str, doc_id: str, body: dict, user: dict, extra: dict | None = None) -> dict:
    if user["role"] not in WRITERS:
        raise HTTPException(403, "Your role is read-only")
    get_owned(collection, doc_id, user)
    doc = db.update(collection, doc_id, {**clean(body), **(extra or {})})
    audit(user, "update", collection, doc_id)
    return doc


# --------------------------------------------------------------------------- LCA

ENERGY_TO_MJ = {"mj": 1, "kwh": 3.6, "mwh": 3600, "gj": 1000, "kj": 0.001, "btu": 0.001055}
WATER_TO_M3 = {"m3": 1, "m³": 1, "l": 0.001, "litre": 0.001, "liter": 0.001, "kl": 1, "ml": 1e-6, "gal": 0.003785}
MASS_TO_KG = {"kg": 1, "g": 0.001, "t": 1000, "tonne": 1000, "ton": 1000, "mt": 1000, "lb": 0.4536}


def _conv(item, table):
    return num(item.get("quantity")) * table.get((item.get("unit") or "").strip().lower(), 1)


def calc_lca(inv: dict) -> dict:
    inv = inv or {}
    rows = [it for cat in inv.values() for it in (cat or [])]
    return {
        "carbon_footprint": round(sum(num(it.get("quantity")) * num(it.get("ef")) for it in rows), 4),
        "energy_footprint": round(sum(_conv(it, ENERGY_TO_MJ) for it in inv.get("energy", []) + inv.get("fuel", [])), 4),
        "water_footprint": round(sum(_conv(it, WATER_TO_M3) for it in inv.get("water", [])), 4),
        "material_intensity": round(sum(_conv(it, MASS_TO_KG) for it in inv.get("raw_materials", []) + inv.get("packaging", [])), 4),
        "waste_intensity": round(sum(_conv(it, MASS_TO_KG) for it in inv.get("waste", [])), 4),
        "breakdown": {cat: round(sum(num(i.get("quantity")) * num(i.get("ef")) for i in (items or [])), 4) for cat, items in inv.items()},
        "calculated_at": db.now_iso(),
    }


@api.get("/lca")
def list_lca(user: dict = Depends(current_user)):
    return owned_list("lca_studies", user)


@api.post("/lca")
def create_lca(body: dict = Body(...), user: dict = Depends(current_user)):
    return create_doc("lca_studies", body, user, {"results": calc_lca(body.get("inventory"))})


@api.put("/lca/{sid}")
def update_lca(sid: str, body: dict = Body(...), user: dict = Depends(current_user)):
    return update_doc("lca_studies", sid, body, user, {"results": calc_lca(body.get("inventory"))})


def lca_blocks(s: dict) -> list:
    r = s.get("results") or {}
    blocks = [
        ("h", "1. Goal & scope"),
        ("kv", [("Product", s.get("product_name")), ("Functional unit", s.get("functional_unit")),
                ("System boundary", (s.get("system_boundary") or "").replace("_", " ")), ("Data quality", s.get("data_quality")),
                ("Allocation method", s.get("allocation_method"))]),
        ("p", f"Goal: {s.get('goal') or '—'}"), ("p", f"Scope: {s.get('scope') or '—'}"),
        ("p", f"Process: {s.get('process_description') or '—'}"),
        ("h", "2. Life cycle inventory"),
    ]
    rows = [["Category", "Name", "Quantity", "Unit", "Emission factor", "kg CO2e"]]
    for cat, items in (s.get("inventory") or {}).items():
        for it in items or []:
            rows.append([cat.replace("_", " "), it.get("name"), it.get("quantity"), it.get("unit"), it.get("ef"),
                         round(num(it.get("quantity")) * num(it.get("ef")), 3)])
    blocks.append(("table", rows) if len(rows) > 1 else ("p", "No inventory entries."))
    blocks += [
        ("h", "3. Impact assessment (LCIA)"),
        ("kv", [("Carbon footprint (kg CO2e)", r.get("carbon_footprint")), ("Energy (MJ)", r.get("energy_footprint")),
                ("Water (m³)", r.get("water_footprint")), ("Materials (kg)", r.get("material_intensity")),
                ("Waste (kg)", r.get("waste_intensity"))]),
        ("h", "4. Interpretation, assumptions & limitations"), ("p", s.get("assumptions") or "—"),
    ]
    return blocks


@api.get("/lca/{sid}/report.pdf")
def lca_pdf(sid: str):
    s = get_by_id("lca_studies", sid)
    note_export(s, "lca_pdf")
    return file_response(build_pdf(s.get("title") or "LCA Study", "LCA report · ISO 14040 / 14044", lca_blocks(s)), fname(s.get("title"), "pdf"), PDF)


@api.get("/lca/{sid}/report.docx")
def lca_docx(sid: str):
    s = get_by_id("lca_studies", sid)
    note_export(s, "lca_docx")
    return file_response(build_docx(s.get("title") or "LCA Study", "LCA report · ISO 14040 / 14044", lca_blocks(s)), fname(s.get("title"), "docx"), DOCX)


@api.get("/lca/{sid}/report.xlsx")
def lca_xlsx(sid: str):
    s = get_by_id("lca_studies", sid)
    note_export(s, "lca_xlsx")
    inv = [["Category", "Name", "Quantity", "Unit", "Emission factor", "kg CO2e"]]
    for cat, items in (s.get("inventory") or {}).items():
        for it in items or []:
            inv.append([cat, it.get("name"), num(it.get("quantity")), it.get("unit"), num(it.get("ef")), num(it.get("quantity")) * num(it.get("ef"))])
    r = s.get("results") or {}
    res = [["Indicator", "Value"]] + [[k, v] for k, v in r.items() if not isinstance(v, dict)]
    meta = [["Field", "Value"]] + [[k, s.get(k)] for k in ("title", "product_name", "functional_unit", "system_boundary", "data_quality", "goal", "scope")]
    return file_response(build_xlsx({"Summary": meta, "Inventory": inv, "Results": res}), fname(s.get("title"), "xlsx"), XLSX)


# --------------------------------------------------------------------------- ESG

@api.get("/esg")
def list_esg(user: dict = Depends(current_user)):
    return owned_list("esg_reports", user)


@api.post("/esg")
def create_esg(body: dict = Body(...), user: dict = Depends(current_user)):
    return create_doc("esg_reports", {"status": "draft", **body}, user)


@api.put("/esg/{rid}")
def update_esg(rid: str, body: dict = Body(...), user: dict = Depends(current_user)):
    sections = body.get("sections") or {}
    status = "complete" if sections and all((v or "").strip() for v in sections.values()) else "draft"
    return update_doc("esg_reports", rid, {**body, "status": status}, user)


def esg_blocks(r: dict) -> list:
    blocks = [("kv", [("Framework", r.get("framework")), ("Reporting period", r.get("period")), ("Status", r.get("status"))])]
    for k, v in (r.get("sections") or {}).items():
        blocks += [("h", k.replace("_", " ").title()), ("p", v or "Not yet disclosed.")]
    sv = db.find_one("sasb_values", {"report_id": r["id"]})
    if sv and sv.get("industry_id") in SASB_BY_ID:
        ind = SASB_BY_ID[sv["industry_id"]]
        rows = [["Code", "Metric", "Unit", "Value"]] + [
            [mt["code"], mt["name"], mt["unit"], (sv.get("values") or {}).get(f"{mt['code']}__{i}")] for i, mt in enumerate(ind["metrics"])]
        blocks += [("h", f"SASB · {ind['name']}"), ("table", rows)]
    return blocks


@api.get("/esg/{rid}/report.pdf")
def esg_pdf(rid: str):
    r = get_by_id("esg_reports", rid)
    note_export(r, "esg_pdf")
    return file_response(build_pdf(r.get("title") or "ESG Report", f"{r.get('framework', '')} sustainability report", esg_blocks(r)), fname(r.get("title"), "pdf"), PDF)


@api.get("/esg/{rid}/report.xlsx")
def esg_xlsx(rid: str):
    r = get_by_id("esg_reports", rid)
    note_export(r, "esg_xlsx")
    rows = [["Section", "Disclosure"]] + [[k, v] for k, v in (r.get("sections") or {}).items()]
    sheets = {"Disclosures": rows}
    sv = db.find_one("sasb_values", {"report_id": rid})
    if sv and sv.get("industry_id") in SASB_BY_ID:
        ind = SASB_BY_ID[sv["industry_id"]]
        sheets["SASB"] = [["Code", "Metric", "Category", "Unit", "Value"]] + [
            [mt["code"], mt["name"], mt["category"], mt["unit"], (sv.get("values") or {}).get(f"{mt['code']}__{i}")] for i, mt in enumerate(ind["metrics"])]
    return file_response(build_xlsx(sheets), fname(r.get("title"), "xlsx"), XLSX)


@api.get("/sasb/industries")
def sasb_industries(user: dict = Depends(current_user)):
    return [{"id": i["id"], "name": i["name"], "metric_count": len(i["metrics"])} for i in SASB_INDUSTRIES]


@api.get("/sasb/industries/{iid}")
def sasb_industry(iid: str, user: dict = Depends(current_user)):
    if iid not in SASB_BY_ID:
        raise HTTPException(404, "Unknown SASB industry")
    return SASB_BY_ID[iid]


@api.get("/sasb/values/{rid}")
def sasb_values(rid: str, user: dict = Depends(current_user)):
    get_owned("esg_reports", rid, user)
    v = db.find_one("sasb_values", {"report_id": rid})
    return {"industry_id": v.get("industry_id") if v else "", "values": v.get("values", {}) if v else {}}


@api.put("/sasb/values/{rid}")
def put_sasb_values(rid: str, body: dict = Body(...), user: dict = Depends(current_user)):
    rep = get_owned("esg_reports", rid, user)
    data = {"industry_id": body.get("industry_id") or "", "values": body.get("values") or {}}
    v = db.find_one("sasb_values", {"report_id": rid})
    if v:
        db.update("sasb_values", v["id"], data)
    else:
        db.insert("sasb_values", {"report_id": rid, "company_id": rep.get("company_id"), **data})
    audit(user, "update", "sasb_values", rid)
    return data


# --------------------------------------------------------------------------- traceability

@api.get("/farms")
def list_farms(user: dict = Depends(current_user)):
    return owned_list("farms", user)


@api.post("/farms")
def create_farm(body: dict = Body(...), user: dict = Depends(current_user)):
    if not (body.get("farmer_name") or "").strip():
        raise HTTPException(400, "Farmer name is required")
    return create_doc("farms", body, user)


@api.delete("/farms/{fid}")
def delete_farm(fid: str, user: dict = Depends(current_user)):
    get_owned("farms", fid, user)
    db.delete("farms", fid)
    audit(user, "delete", "farms", fid)
    return {"ok": True}


@api.get("/farms/{fid}/records")
def farm_records(fid: str, user: dict = Depends(current_user)):
    get_owned("farms", fid, user)
    return db.find("farm_records", {"farm_id": fid}, sort="date")


@api.post("/farms/{fid}/records")
def add_farm_record(fid: str, body: dict = Body(...), user: dict = Depends(current_user)):
    farm = get_owned("farms", fid, user)
    return create_doc("farm_records", {**body, "farm_id": farm["id"]}, user)


@api.get("/batches")
def list_batches(user: dict = Depends(current_user)):
    return owned_list("batches", user)


@api.post("/batches")
def create_batch(body: dict = Body(...), user: dict = Depends(current_user)):
    if not (body.get("product_name") or "").strip():
        raise HTTPException(400, "Product name is required")
    if body.get("farm_id"):
        get_owned("farms", body["farm_id"], user)
    return create_doc("batches", body, user)


@api.get("/batches/{bid}/qr.png")
def batch_qr(bid: str):
    get_by_id("batches", bid)
    return Response(build_qr(f"{FRONTEND_URL}/trace/{bid}"), media_type="image/png")


@api.get("/batches/{bid}/audit.pdf")
def batch_audit(bid: str):
    b = get_by_id("batches", bid)
    note_export(b, "batch_audit")
    farm = db.find_one("farms", {"id": b.get("farm_id")}) if b.get("farm_id") else None
    blocks = [
        ("h", "Batch details"),
        ("kv", [("Batch ID", b["id"]), ("Product", b.get("product_name")), ("Quantity", f"{b.get('quantity') or '—'} {b.get('unit') or ''}"),
                ("Harvest date", b.get("harvest_date")), ("Processing unit", b.get("processing_unit")),
                ("Storage", b.get("storage_location")), ("Transport", b.get("transport_info")), ("Buyer", b.get("buyer")),
                ("Certification", b.get("certification_status")), ("Sustainability score", b.get("sustainability_score")),
                ("Carbon footprint (kg CO2e)", b.get("carbon_footprint"))]),
    ]
    if farm:
        loc = farm.get("location") or {}
        blocks += [("h", "Origin farm"), ("kv", [("Farmer", farm.get("farmer_name")), ("Farm", farm.get("farm_name")), ("Crop", farm.get("crop")),
                                                  ("Area (ha)", farm.get("area_hectares")), ("Certification", farm.get("certification")),
                                                  ("Location", f"{loc.get('lat')}, {loc.get('lng')}" if loc.get("lat") is not None else None)])]
        recs = db.find("farm_records", {"farm_id": farm["id"]}, sort="date")
        if recs:
            blocks += [("h", "Field records"), ("table", [["Date", "Type", "Description", "Qty"]] + [
                [r.get("date"), r.get("record_type"), r.get("description"), f"{r.get('quantity') or ''} {r.get('unit') or ''}"] for r in recs])]
    blocks += [("h", "Verification"), ("p", f"Public verification page: {FRONTEND_URL}/trace/{b['id']}")]
    return file_response(build_pdf(f"Traceability audit — {b.get('product_name')}", "Farm-to-buyer chain of custody", blocks), f"batch_{b['id'][:8]}_audit.pdf", PDF)


@api.get("/trace/public/{bid}")
def public_trace(bid: str):
    b = get_by_id("batches", bid)
    farm = db.find_one("farms", {"id": b.get("farm_id")}) if b.get("farm_id") else None
    hide = {"company_id", "created_by"}
    return {"batch": {k: v for k, v in b.items() if k not in hide},
            "farm": {k: v for k, v in farm.items() if k not in hide} if farm else None}


# --------------------------------------------------------------------------- carbon

@api.get("/carbon")
def list_carbon(user: dict = Depends(current_user)):
    return owned_list("carbon_projects", user)


@api.post("/carbon")
def create_carbon(body: dict = Body(...), user: dict = Depends(current_user)):
    return create_doc("carbon_projects", {"verification_status": "draft", **body}, user)


@api.put("/carbon/{pid}")
def update_carbon(pid: str, body: dict = Body(...), user: dict = Depends(current_user)):
    return update_doc("carbon_projects", pid, body, user)


CARBON_TEXT = [("project_proponent", "Project proponent"), ("methodology", "Methodology"), ("baseline_scenario", "Baseline scenario"),
               ("additionality", "Additionality"), ("project_boundary", "Project boundary"), ("leakage_risk", "Leakage risk"),
               ("permanence_risk", "Permanence risk"), ("monitoring_plan", "Monitoring plan"), ("mrv_plan", "MRV plan"),
               ("stakeholder_consultation", "Stakeholder consultation"), ("safeguards", "Safeguards"), ("risk_assessment", "Risk assessment")]
CARBON_NUM = [("estimated_reductions_tco2e", "Estimated reductions (tCO2e)"), ("carbon_stock", "Carbon stock"),
              ("soil_carbon", "Soil carbon"), ("biomass", "Biomass"), ("re_savings", "RE / energy savings")]


@api.get("/carbon/{pid}/pdd.pdf")
def carbon_pdd(pid: str):
    p = get_by_id("carbon_projects", pid)
    note_export(p, "carbon_pdd")
    loc = p.get("location") or {}
    blocks = [("kv", [("Standard", p.get("standard")), ("Sector", p.get("sector")), ("Verification status", p.get("verification_status")),
                      ("Location", f"{loc.get('lat')}, {loc.get('lng')}" if loc.get("lat") is not None else None),
                      ("SDG co-benefits", ", ".join(p.get("sdg_co_benefits") or []))])]
    for k, label in CARBON_TEXT:
        blocks += [("h", label), ("p", p.get(k))]
    blocks += [("h", "Quantification"), ("kv", [(label, p.get(k)) for k, label in CARBON_NUM])]
    return file_response(build_pdf(p.get("title") or "Carbon project", f"{p.get('standard', '')} Project Design Document", blocks), fname(p.get("title"), "pdf"), PDF)


@api.get("/carbon/{pid}/report.xlsx")
def carbon_xlsx(pid: str):
    p = get_by_id("carbon_projects", pid)
    note_export(p, "carbon_xlsx")
    rows = [["Field", "Value"], ["Title", p.get("title")], ["Standard", p.get("standard")], ["Sector", p.get("sector")]]
    rows += [[label, p.get(k)] for k, label in CARBON_NUM + CARBON_TEXT]
    return file_response(build_xlsx({"Project": rows}), fname(p.get("title"), "xlsx"), XLSX)


# --------------------------------------------------------------------------- geo & map

@api.get("/geo")
def list_geo(user: dict = Depends(current_user)):
    return owned_list("geo", user)


@api.post("/geo")
def create_geo(body: dict = Body(...), user: dict = Depends(current_user)):
    if body.get("type") not in ("point", "polygon"):
        raise HTTPException(400, "type must be point or polygon")
    return create_doc("geo", body, user)


def _loc(d):
    loc = d.get("location") or {}
    return (loc.get("lat"), loc.get("lng")) if loc.get("lat") is not None and loc.get("lng") is not None else None


@api.get("/map/markers")
def map_markers(user: dict = Depends(current_user)):
    out = []
    for f in owned_list("farms", user):
        if (ll := _loc(f)):
            out.append({"id": f["id"], "type": "farm", "name": f.get("farm_name") or f.get("farmer_name"), "subtitle": f.get("crop"), "lat": ll[0], "lng": ll[1]})
    for p in owned_list("carbon_projects", user):
        if (ll := _loc(p)):
            out.append({"id": p["id"], "type": "carbon", "name": p.get("title"), "subtitle": p.get("standard"), "lat": ll[0], "lng": ll[1]})
    for s in owned_list("lca_studies", user):
        if (ll := _loc(s)):
            out.append({"id": s["id"], "type": "lca", "name": s.get("title"), "subtitle": s.get("product_name"), "lat": ll[0], "lng": ll[1]})
    for g in owned_list("geo", user):
        c = g.get("coordinates") or {}
        if g.get("type") == "point" and c.get("lat") is not None:
            out.append({"id": g["id"], "type": "geo", "name": g.get("name"), "subtitle": "Saved point", "lat": c["lat"], "lng": c["lng"]})
    return out


# --------------------------------------------------------------------------- dashboard

def _month_series(docs):
    c = Counter((d.get("created_at") or "")[:7] for d in docs)
    return [{"month": m, "value": v} for m, v in sorted(c.items()) if m]


@api.get("/dashboard/stats")
def dashboard_stats(user: dict = Depends(current_user)):
    sc = scope(user)
    lca, esg, carbon = db.find("lca_studies", sc), db.find("esg_reports", sc), db.find("carbon_projects", sc)
    gaps = sum(1 for s in lca if not any((s.get("inventory") or {}).values()))
    gaps += sum(1 for r in esg for v in (r.get("sections") or {}).values() if not (v or "").strip())
    return {
        "companies": len(list_companies(user)),
        "projects": len(lca) + len(carbon) + db.count("geo", sc),
        "lca_studies": len(lca), "esg_reports": len(esg),
        "traceability_batches": db.count("batches", sc), "carbon_projects": len(carbon),
        "data_gaps": gaps,
        "reports_generated": db.count("exports", sc) + db.count("flagship_reports", sc),
    }


@api.get("/dashboard/series")
def dashboard_series(user: dict = Depends(current_user)):
    sc = scope(user)
    return {"LCA": _month_series(db.find("lca_studies", sc)), "ESG": _month_series(db.find("esg_reports", sc)),
            "Batches": _month_series(db.find("batches", sc)), "Carbon": _month_series(db.find("carbon_projects", sc))}


@api.get("/audit-logs")
def audit_logs(limit: int = 200, user: dict = Depends(require("super_admin", "company_admin", "auditor"))):
    return db.find("audit_logs", scope(user), sort="timestamp", limit=min(limit, 1000))


# --------------------------------------------------------------------------- AI drafter

CONTEXT_COLLECTION = {"lca": "lca_studies", "esg": "esg_reports", "traceability": "batches", "carbon_pdd": "carbon_projects", "mrv": "carbon_projects"}
REPORT_LABELS = {"lca": "ISO 14044 LCA report", "esg": "ESG / sustainability report", "traceability": "traceability audit report",
                 "carbon_pdd": "carbon Project Design Document (PDD)", "mrv": "MRV (monitoring, reporting & verification) report",
                 "gap_analysis": "data and disclosure gap analysis", "exec_summary": "executive summary",
                 "board_outline": "board presentation outline"}


def _template_draft(rtype: str, ctx: dict | None, notes: str) -> str:
    label = REPORT_LABELS.get(rtype, rtype)
    lines = [f"# {label.title()}", ""]
    if ctx:
        lines += ["## Source data", ""] + [f"- **{k.replace('_', ' ')}**: {v}" for k, v in ctx.items()
                                            if k not in ("id", "company_id", "created_by") and v not in (None, "", [], {}) and not isinstance(v, (dict, list))]
        lines.append("")
    sections = {
        "lca": ["Goal and scope", "Life cycle inventory", "Impact assessment", "Interpretation", "Limitations"],
        "esg": ["About this report", "Governance", "Environment", "Social", "Targets and next steps"],
        "traceability": ["Batch summary", "Origin and farm practices", "Chain of custody", "Certification status", "Findings"],
        "carbon_pdd": ["Project description", "Baseline scenario", "Additionality", "Leakage and permanence", "Monitoring plan", "Safeguards"],
        "mrv": ["Monitoring period", "Parameters monitored", "Emission reductions achieved", "QA/QC", "Verification readiness"],
        "gap_analysis": ["Current state", "Missing data points", "Framework requirements not yet met", "Prioritised actions"],
        "exec_summary": ["Headline results", "Key risks", "Opportunities", "Recommended decisions"],
        "board_outline": ["Slide 1 – Context", "Slide 2 – Performance", "Slide 3 – Risks", "Slide 4 – Roadmap", "Slide 5 – Decisions requested"],
    }.get(rtype, ["Introduction", "Analysis", "Conclusion"])
    for s in sections:
        lines += [f"## {s}", "[Draft this section using the source data above. Mark any missing figures as data gaps.]", ""]
    if notes:
        lines += ["## Author notes", notes, ""]
    lines += ["---", "_Offline template — add an AI API key in backend/.env to generate full prose._"]
    return "\n".join(lines)


@api.post("/ai/draft")
def ai_draft(body: dict = Body(...), user: dict = Depends(current_user)):
    rtype, provider = body.get("report_type") or "exec_summary", body.get("provider") or "anthropic"
    ctx = None
    if body.get("context_id") and rtype in CONTEXT_COLLECTION:
        ctx = get_owned(CONTEXT_COLLECTION[rtype], body["context_id"], user)
    prompt = (f"Draft a complete {REPORT_LABELS.get(rtype, rtype)} in Markdown.\n\n"
              f"Source data (JSON):\n{json.dumps(ctx, default=str)[:12000] if ctx else 'No specific record selected — write a structured template with clear placeholders.'}\n\n"
              f"Author notes: {body.get('user_notes') or 'none'}")
    try:
        text, model = ai.generate(provider, prompt)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"AI provider error: {e}")
    draft = text or _template_draft(rtype, ctx, body.get("user_notes") or "")
    audit(user, "ai_draft", "ai", None, {"report_type": rtype, "model": model})
    return {"draft": draft, "model": model}


# --------------------------------------------------------------------------- flagship report

NARRATIVE_KEYS = ["cover_tagline", "letter_title", "letter", "highlights_title", "highlights_intro", "environment_title", "environment",
                  "carbon_title", "carbon", "supply_title", "supply", "social_title", "social", "sdg_title", "sdg", "forward_title", "forward"]


def aggregates(sc: dict) -> dict:
    lca, batches, carbon = db.find("lca_studies", sc), db.find("batches", sc), db.find("carbon_projects", sc)
    r = lambda k: round(sum(num((s.get("results") or {}).get(k)) for s in lca), 2)  # noqa: E731
    return {"total_co2e": r("carbon_footprint"), "total_energy": r("energy_footprint"), "total_water": r("water_footprint"),
            "lca_count": len(lca), "esg_count": db.count("esg_reports", sc), "batch_count": len(batches),
            "farm_count": db.count("farms", sc), "carbon_count": len(carbon),
            "carbon_reductions": round(sum(num(p.get("estimated_reductions_tco2e")) for p in carbon), 2)}


def _template_narrative(rep: dict, a: dict, company: str) -> dict:
    return {
        "cover_tagline": f"{company}'s sustainability performance and progress for {rep.get('period')}.",
        "letter_title": "A year of measurable progress",
        "letter": (rep.get("ceo_note_input") or f"This report sets out how {company} measured, managed and reduced its environmental footprint during {rep.get('period')}.")
        + "\n\n> What gets measured gets managed.",
        "highlights_title": "The year in numbers",
        "highlights_intro": f"We completed {a['lca_count']} life cycle assessments, published {a['esg_count']} ESG disclosures, traced {a['batch_count']} product batches from {a['farm_count']} farms and developed {a['carbon_count']} carbon projects.",
        "environment_title": "Measuring our footprint",
        "environment": f"Across our assessed products, the measured footprint totals {a['total_co2e']} kg CO₂e, {a['total_energy']} MJ of energy and {a['total_water']} m³ of water. These figures come from ISO 14040/44-aligned studies and will be expanded as more products are assessed.",
        "carbon_title": "Our carbon strategy",
        "carbon": f"Our carbon project pipeline is expected to deliver {a['carbon_reductions']} tCO₂e of emission reductions, developed under internationally recognised standards with dedicated monitoring, reporting and verification plans.",
        "supply_title": "A traceable supply chain",
        "supply": f"{a['batch_count']} batches can be traced back to their farm of origin through QR-verified public pages, giving buyers evidence of provenance, certification and field practices.",
        "social_title": "People and governance",
        "social": "Sustainability data is governed through role-based access, an immutable audit trail and documented approval workflows.",
        "sdg_title": "Contribution to the SDGs",
        "sdg": "Our work contributes most directly to SDG 2 (Zero Hunger), SDG 12 (Responsible Consumption and Production) and SDG 13 (Climate Action).",
        "forward_title": "Looking forward",
        "forward": "Next year we will close the remaining data gaps, extend LCA coverage across our portfolio and set science-based reduction targets.",
    }


def build_flagship(rep: dict, user: dict) -> dict:
    sc = {"company_id": rep.get("company_id")}
    a = aggregates(sc)
    company = (db.find_one("companies", {"id": rep.get("company_id")}) or {}).get("name") or "Sustainability360"
    lang = rep.get("language") or "en"
    prompt = (f"Write a flagship annual sustainability report narrative for {company}, period {rep.get('period')}, "
              f"in language code '{lang}'. Headline: {rep.get('headline') or 'none'}. CEO notes: {rep.get('ceo_note_input') or 'none'}.\n"
              f"Use ONLY these aggregated figures: {json.dumps(a)}.\n"
              f"Return ONLY a JSON object with these string keys: {', '.join(NARRATIVE_KEYS)}. "
              "Body fields should be 2-4 paragraphs separated by blank lines; a paragraph starting with '> ' is rendered as a pull quote.")
    narrative, model = None, "offline-template"
    try:
        text, model = ai.generate(rep.get("provider") or "anthropic", prompt)
        narrative = ai.parse_json(text) if text else None
    except httpx.HTTPError as e:
        print(f"[flagship] AI provider failed, using template: {e}")
    if not narrative:
        narrative, model = _template_narrative(rep, a, company), "offline-template"
    return {"aggregates": a, "narrative": narrative, "model": model, "company_name": company, "status": "published"}


@api.get("/flagship-reports")
def list_flagship(user: dict = Depends(current_user)):
    return owned_list("flagship_reports", user)


@api.post("/flagship-reports")
def create_flagship(body: dict = Body(...), user: dict = Depends(current_user)):
    if not (body.get("title") or "").strip():
        raise HTTPException(400, "Title is required")
    slug = (re.sub(r"[^a-z0-9]+", "-", body["title"].lower()).strip("-")[:40] or "report") + "-" + secrets.token_hex(3)
    rep = create_doc("flagship_reports", body, user, {"slug": slug, "status": "generating"})
    return db.update("flagship_reports", rep["id"], build_flagship(rep, user))


@api.post("/flagship-reports/{rid}/regenerate")
def regenerate_flagship(rid: str, user: dict = Depends(current_user)):
    rep = get_owned("flagship_reports", rid, user)
    audit(user, "regenerate", "flagship_reports", rid)
    return db.update("flagship_reports", rid, build_flagship(rep, user))


@api.delete("/flagship-reports/{rid}")
def delete_flagship(rid: str, user: dict = Depends(current_user)):
    get_owned("flagship_reports", rid, user)
    db.delete("flagship_reports", rid)
    audit(user, "delete", "flagship_reports", rid)
    return {"ok": True}


def flagship_pdf_bytes(rep: dict) -> bytes:
    n, a = rep.get("narrative") or {}, rep.get("aggregates") or {}
    blocks = [("p", rep.get("headline") or n.get("cover_tagline")),
              ("kv", [("Total CO2e (kg)", a.get("total_co2e")), ("Energy (MJ)", a.get("total_energy")), ("Water (m³)", a.get("total_water")),
                      ("LCA studies", a.get("lca_count")), ("Batches traced", a.get("batch_count")), ("Carbon (tCO2e)", a.get("carbon_reductions"))])]
    for i, (tk, bk) in enumerate([("letter_title", "letter"), ("highlights_title", "highlights_intro"), ("environment_title", "environment"),
                                  ("carbon_title", "carbon"), ("supply_title", "supply"), ("social_title", "social"),
                                  ("sdg_title", "sdg"), ("forward_title", "forward")], 1):
        blocks.append(("h", f"{i:02d} / {n.get(tk) or '—'}"))
        blocks += [("p", p.lstrip("> ")) for p in (n.get(bk) or "—").split("\n\n")]
    return build_pdf(rep.get("title") or "Sustainability Report", f"{rep.get('company_name', '')} · {rep.get('period', '')}", blocks)


@api.get("/flagship-reports/{rid}/render.pdf")
def flagship_pdf(rid: str):
    rep = get_by_id("flagship_reports", rid)
    note_export(rep, "flagship_pdf")
    return file_response(flagship_pdf_bytes(rep), fname(rep.get("title"), "pdf"), PDF)


@api.get("/r/{slug}")
def public_flagship(slug: str):
    rep = db.find_one("flagship_reports", {"slug": slug})
    if not rep:
        raise HTTPException(404, "Report not found")
    return {k: v for k, v in rep.items() if k not in ("company_id", "created_by", "ceo_note_input")}


@api.get("/r/{slug}/pdf")
def public_flagship_pdf(slug: str):
    rep = db.find_one("flagship_reports", {"slug": slug})
    if not rep:
        raise HTTPException(404, "Report not found")
    return file_response(flagship_pdf_bytes(rep), fname(rep.get("title"), "pdf"), PDF)


# --------------------------------------------------------------------------- plans & billing

def company_plan(user: dict) -> str:
    c = db.find_one("companies", {"id": user.get("company_id")}) if user.get("company_id") else None
    return (c or {}).get("plan") or ("enterprise" if user["role"] == "super_admin" else "free_demo")


def set_plan(user: dict, plan: str):
    if user.get("company_id"):
        db.update("companies", user["company_id"], {"plan": plan})
    audit(user, "plan_change", "billing", None, {"plan": plan})


@api.get("/plans")
def plans():
    return PLANS


@api.get("/billing/usage")
def billing_usage(user: dict = Depends(current_user)):
    sc, plan = scope(user), company_plan(user)
    return {"plan": plan, "limits": PLAN_BY_ID.get(plan, PLANS[0]),
            "used": {"users": db.count("users", sc), "projects": db.count("lca_studies", sc) + db.count("carbon_projects", sc),
                     "reports": db.count("esg_reports", sc) + db.count("flagship_reports", sc)}}


@api.post("/billing/checkout-session")
def checkout(body: dict = Body(...), user: dict = Depends(require(*ADMINS))):
    plan = PLAN_BY_ID.get(body.get("plan"))
    if not plan:
        raise HTTPException(400, "Unknown plan")
    origin = (body.get("origin_url") or FRONTEND_URL).rstrip("/")
    if plan["price"] == 0:
        set_plan(user, plan["id"])
        return {"url": f"{origin}/billing/success?plan={plan['id']}"}
    stripe_key = os.environ.get("STRIPE_API_KEY")
    if stripe_key:
        r = httpx.post("https://api.stripe.com/v1/checkout/sessions", auth=(stripe_key, ""), timeout=30, data={
            "mode": "payment", "success_url": f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{origin}/billing/cancel",
            "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][unit_amount]": int(plan["price"] * 100),
            "line_items[0][price_data][product_data][name]": f"Sustainability360 {plan['name']} (monthly)",
            "line_items[0][quantity]": 1, "metadata[plan]": plan["id"], "metadata[user_id]": user["id"],
        })
        if r.status_code >= 400:
            raise HTTPException(502, f"Stripe error: {r.text[:200]}")
        s = r.json()
        db.insert("billing_sessions", {"id": s["id"], "plan": plan["id"], "user_id": user["id"], "stripe": True, "applied": False})
        return {"url": s["url"], "session_id": s["id"]}
    # Demo mode (no STRIPE_API_KEY): payment is simulated as successful.
    sid = "demo_" + secrets.token_hex(8)
    db.insert("billing_sessions", {"id": sid, "plan": plan["id"], "user_id": user["id"], "stripe": False, "applied": True,
                                   "payment_status": "paid", "status": "complete", "amount_total": int(plan["price"] * 100), "currency": "usd"})
    set_plan(user, plan["id"])
    return {"url": f"{origin}/billing/success?session_id={sid}", "session_id": sid}


@api.get("/billing/session/{sid}")
def billing_session(sid: str, user: dict = Depends(current_user)):
    s = db.find_one("billing_sessions", {"id": sid})
    if not s or s["user_id"] != user["id"]:
        raise HTTPException(404, "Session not found")
    if s.get("stripe"):
        r = httpx.get(f"https://api.stripe.com/v1/checkout/sessions/{sid}", auth=(os.environ.get("STRIPE_API_KEY", ""), ""), timeout=30)
        r.raise_for_status()
        d = r.json()
        if d.get("payment_status") == "paid" and not s.get("applied"):
            set_plan(user, s["plan"])
            db.update("billing_sessions", sid, {"applied": True})
        return {"payment_status": d.get("payment_status"), "status": d.get("status"), "amount_total": d.get("amount_total"), "currency": d.get("currency")}
    return {k: s.get(k) for k in ("payment_status", "status", "amount_total", "currency")}


@api.get("/")
def root():
    return {"app": "Sustainability360", "status": "ok"}


app.include_router(api)
