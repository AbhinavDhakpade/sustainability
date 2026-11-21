"""Tiny document store on top of SQLite.

Every record is a JSON document kept in one table, grouped by collection.
This keeps the backend dependency-free (no MongoDB install needed) while
behaving like the document database the original app used.
"""
import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "sustainability360.db"))
_lock = threading.Lock()
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.execute(
    "CREATE TABLE IF NOT EXISTS docs (collection TEXT, id TEXT, data TEXT, PRIMARY KEY (collection, id))"
)
_conn.commit()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def _match(doc: dict, query: dict) -> bool:
    for k, v in query.items():
        if callable(v):
            if not v(doc.get(k)):
                return False
        elif doc.get(k) != v:
            return False
    return True


def find(collection: str, query: dict | None = None, sort: str = "created_at", desc: bool = True, limit: int | None = None) -> list[dict]:
    with _lock:
        rows = _conn.execute("SELECT data FROM docs WHERE collection=?", (collection,)).fetchall()
    docs = [json.loads(r[0]) for r in rows]
    if query:
        docs = [d for d in docs if _match(d, query)]
    if sort:
        docs.sort(key=lambda d: d.get(sort) or "", reverse=desc)
    return docs[:limit] if limit else docs


def find_one(collection: str, query: dict) -> dict | None:
    if set(query) == {"id"}:
        with _lock:
            row = _conn.execute("SELECT data FROM docs WHERE collection=? AND id=?", (collection, query["id"])).fetchone()
        return json.loads(row[0]) if row else None
    res = find(collection, query, sort=None)
    return res[0] if res else None


def count(collection: str, query: dict | None = None) -> int:
    return len(find(collection, query, sort=None))


def insert(collection: str, doc: dict) -> dict:
    doc = dict(doc)
    doc.setdefault("id", new_id())
    doc.setdefault("created_at", now_iso())
    with _lock:
        _conn.execute("INSERT INTO docs VALUES (?,?,?)", (collection, doc["id"], json.dumps(doc)))
        _conn.commit()
    return doc


def update(collection: str, doc_id: str, changes: dict) -> dict | None:
    doc = find_one(collection, {"id": doc_id})
    if not doc:
        return None
    doc.update(changes)
    doc["updated_at"] = now_iso()
    with _lock:
        _conn.execute("UPDATE docs SET data=? WHERE collection=? AND id=?", (json.dumps(doc), collection, doc_id))
        _conn.commit()
    return doc


def delete(collection: str, doc_id: str) -> bool:
    with _lock:
        cur = _conn.execute("DELETE FROM docs WHERE collection=? AND id=?", (collection, doc_id))
        _conn.commit()
    return cur.rowcount > 0
