#!/usr/bin/env python3
"""Local v2.1 orchestration helpers for source resolution and budget accounting.

This module performs no network or browser automation. Browser evidence is
recorded by the caller as a compact artifact, then becomes the highest-priority
reusable tier here.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any


SKILL_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_CONFIG = SKILL_ROOT / "config" / "seo_budget.json"
PROJECT_GUARD = PROJECT_ROOT / "scripts" / "semrush_quota_guard.py"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_guard():
    spec = importlib.util.spec_from_file_location("seo_semrush_guard_v21", PROJECT_GUARD)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load Semrush guard: {PROJECT_GUARD}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def dated(path: Path, run_date: str) -> bool:
    if run_date in path.name:
        return True
    return datetime.fromtimestamp(path.stat().st_mtime).date().isoformat() == run_date


def artifact_rows(root: Path) -> list[dict[str, Any]]:
    if not root.exists():
        return []
    rows = []
    for path in sorted(item for item in root.rglob("*") if item.is_file() and item.name != ".gitkeep"):
        rows.append({
            "path": str(path.relative_to(PROJECT_ROOT)),
            "size": path.stat().st_size,
            "modified": datetime.fromtimestamp(path.stat().st_mtime).astimezone().isoformat(timespec="seconds"),
            "checksum": sha256(path),
        })
    return rows


def resolve_source(source: str, run_date: str) -> dict[str, Any]:
    source = source.casefold()
    browser_dir = PROJECT_ROOT / "data" / "seo" / "cache" / source / "browser"
    export_dir = PROJECT_ROOT / "data" / "raw" / source
    cache_dir = PROJECT_ROOT / "data" / "cache" / source

    browser = [row for row in artifact_rows(browser_dir) if run_date in row["path"]]
    exports = artifact_rows(export_dir)
    today_cache = [
        row for row in artifact_rows(cache_dir)
        if "/browser/" not in row["path"] and run_date in row["path"]
    ]
    historical = [
        row for row in artifact_rows(cache_dir)
        if row not in today_cache and row not in browser
    ]
    tiers = [
        ("authenticated_browser", browser),
        ("project_export", exports),
        ("today_cache", today_cache),
        ("historical_cache", historical),
    ]
    for tier, rows in tiers:
        if rows:
            return {
                "source": source,
                "run_date": run_date,
                "selected_tier": tier,
                "status": "AVAILABLE",
                "artifacts": rows,
                "checked_tiers": [name for name, _ in tiers],
            }
    return {
        "source": source,
        "run_date": run_date,
        "selected_tier": "DATA_MISSING",
        "status": "DATA_MISSING",
        "artifacts": [],
        "checked_tiers": [name for name, _ in tiers],
    }


def summarize_text(path: Path, max_lines: int = 120) -> dict[str, Any]:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    kept = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#") or stripped.startswith("- ") or stripped.startswith("* "):
            kept.append(stripped)
        if len(kept) >= max_lines:
            break
    return {
        "source_path": str(path.relative_to(PROJECT_ROOT)) if path.is_relative_to(PROJECT_ROOT) else str(path),
        "checksum": sha256(path),
        "source_lines": len(lines),
        "summary_lines": kept,
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }


def estimate_cost(
    action_type: str,
    database: str,
    keyword_count: int,
    query_type: str,
    history_path: Path,
) -> dict[str, Any]:
    guard = load_guard()
    rows = guard.read_csv(history_path)
    return guard.estimated_cost(rows, action_type, database, keyword_count, query_type)


def record_cost(
    history_path: Path,
    research_date: str,
    topic_id: str,
    quota_before: float,
    quota_after: float,
    action_type: str,
    keyword_count: int,
    database: str,
    query_type: str,
    notes: str,
) -> dict[str, Any]:
    if quota_after > quota_before:
        raise ValueError("quota_after cannot exceed quota_before")
    guard = load_guard()
    consumed = quota_before - quota_after
    row = {
        "research_date": research_date,
        "timestamp": datetime.now().astimezone().isoformat(timespec="seconds"),
        "topic_id": topic_id,
        "quota_before": quota_before,
        "action_type": action_type,
        "keyword_count": keyword_count,
        "database": database.upper(),
        "quota_after": quota_after,
        "quota_consumed": consumed,
        "notes": f"query_type={query_type.casefold()} {notes}".strip(),
    }
    guard.append_row(history_path, guard.HISTORY_FIELDS, row)
    return {"recorded": True, "quota_consumed": consumed, "row": row}


def read_usage(history_path: Path, research_date: str, topic_id: str) -> float:
    if not history_path.exists():
        return 0.0
    with history_path.open(encoding="utf-8-sig", newline="") as handle:
        rows = csv.DictReader(handle)
        return sum(
            float(row.get("quota_consumed") or 0)
            for row in rows
            if row.get("research_date") == research_date and row.get("topic_id") == topic_id
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    sub = parser.add_subparsers(dest="command", required=True)

    source = sub.add_parser("source-status")
    source.add_argument("--source", choices=["gsc", "trends", "serp", "semrush"], required=True)
    source.add_argument("--run-date", default=date.today().isoformat())

    summary = sub.add_parser("summarize")
    summary.add_argument("--input", type=Path, required=True)

    estimate = sub.add_parser("estimate-cost")
    estimate.add_argument("--history", type=Path, default=PROJECT_ROOT / "data/seo/semrush/quota_usage_history.csv")
    estimate.add_argument("--action-type", required=True)
    estimate.add_argument("--database", required=True)
    estimate.add_argument("--keyword-count", type=int, default=1)
    estimate.add_argument("--query-type", default="overview")

    usage = sub.add_parser("usage")
    usage.add_argument("--history", type=Path, default=PROJECT_ROOT / "data/seo/semrush/quota_usage_history.csv")
    usage.add_argument("--research-date", default=date.today().isoformat())
    usage.add_argument("--topic-id", required=True)

    record = sub.add_parser("record-cost")
    record.add_argument("--history", type=Path, default=PROJECT_ROOT / "data/seo/semrush/quota_usage_history.csv")
    record.add_argument("--research-date", default=date.today().isoformat())
    record.add_argument("--topic-id", required=True)
    record.add_argument("--quota-before", type=float, required=True)
    record.add_argument("--quota-after", type=float, required=True)
    record.add_argument("--action-type", required=True)
    record.add_argument("--keyword-count", type=int, required=True)
    record.add_argument("--database", required=True)
    record.add_argument("--query-type", default="overview")
    record.add_argument("--notes", default="")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    config = load_json(args.config)
    if args.command == "source-status":
        result = resolve_source(args.source, args.run_date)
        result["priority_contract"] = config["source_priority"]
    elif args.command == "summarize":
        result = summarize_text(args.input)
    elif args.command == "estimate-cost":
        result = estimate_cost(args.action_type, args.database, args.keyword_count, args.query_type, args.history)
    elif args.command == "usage":
        used = read_usage(args.history, args.research_date, args.topic_id)
        limits = config["semrush"]
        result = {
            "used": used,
            "soft_limit_reached": used >= limits["soft_limit"],
            "warning_reached": used >= limits["warning_threshold"],
            "hard_limit_reached": used >= limits["hard_limit"],
        }
    else:
        result = record_cost(
            args.history, args.research_date, args.topic_id,
            args.quota_before, args.quota_after, args.action_type,
            args.keyword_count, args.database, args.query_type, args.notes,
        )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
