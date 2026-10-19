"""SQLite database connection, initialization, and parameterized query helpers."""
import sqlite3
from typing import Any, Dict, Iterable, List, Optional
from flask import g
from config import Config


def get_db() -> sqlite3.Connection:
    """Return a request-scoped SQLite connection with row factory and foreign keys enabled."""
    if "db" not in g:
        Config.ensure_directories()
        conn = sqlite3.connect(str(Config.DATABASE_PATH), detect_types=sqlite3.PARSE_DECLTYPES)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        g.db = conn
    return g.db


def close_db(_exc: Optional[BaseException] = None) -> None:
    """Close the request-scoped SQLite connection if open."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    """Initialize all SQLite tables and default settings from schema.sql."""
    Config.ensure_directories()
    schema_path = Config.SCHEMA_PATH
    schema_sql = schema_path.read_text(encoding="utf-8")
    conn = sqlite3.connect(str(Config.DATABASE_PATH))
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()


def query_all(sql: str, params: Iterable[Any] = ()) -> List[Dict[str, Any]]:
    """Execute a SELECT query with parameterized inputs and return a list of dicts."""
    cur = get_db().execute(sql, tuple(params))
    rows = cur.fetchall()
    return [dict(row) for row in rows]


def query_one(sql: str, params: Iterable[Any] = ()) -> Optional[Dict[str, Any]]:
    """Execute a SELECT query with parameterized inputs and return a single dict or None."""
    cur = get_db().execute(sql, tuple(params))
    row = cur.fetchone()
    return dict(row) if row is not None else None


def execute_sql(sql: str, params: Iterable[Any] = (), commit: bool = True) -> int:
    """Execute an INSERT/UPDATE/DELETE query and return lastrowid."""
    db = get_db()
    cur = db.execute(sql, tuple(params))
    if commit:
        db.commit()
    return cur.lastrowid or 0
