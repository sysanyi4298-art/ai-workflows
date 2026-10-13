#!/usr/bin/env python3
"""Prepare candidate intents and run the v2.1 cannibalization gate locally."""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from typing import NamedTuple


PROJECT_ROOT = Path(__file__).resolve().parents[4]
FIELDS = ["primary_keyword", "secondary_keywords", "intent", "cluster", "candidate_origin", "priority"]
OUTPUT_FIELDS = FIELDS + [
    "decision", "overlap_score", "existing_path", "existing_primary_keyword",
    "existing_intent", "reason",
]


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "").casefold()
    return " ".join("".join(ch if unicodedata.category(ch)[0] in {"L", "N"} else " " for ch in value).split())


def ngrams(value: str, size: int = 2) -> set[str]:
    compact = normalize(value).replace(" ", "")
    if len(compact) < size:
        return {compact} if compact else set()
    return {compact[index:index + size] for index in range(len(compact) - size + 1)}


def similarity(left: str, right: str) -> float:
    a, b = normalize(left), normalize(right)
    if not a or not b:
        return 0.0
    seq = SequenceMatcher(None, a, b).ratio()
    ag, bg = ngrams(a), ngrams(b)
    dice = 2 * len(ag & bg) / (len(ag) + len(bg)) if ag and bg else 0.0
    return round(max(seq, dice), 4)


def entity(value: str) -> str:
    key = normalize(value)
    if "claude code" in key or "claudecode" in key:
        return "claude-code"
    if "codex" in key:
        return "codex"
    return ""


def parse_list(value: str) -> list[str]:
    raw = (value or "").strip().strip("[]")
    return [part.strip().strip("'\"") for part in re.split(r"[|,;；]", raw) if part.strip()]


def frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end < 0:
        return {}
    data: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip()
    h1 = re.search(r"^#\s+(.+)$", text[end + 4:], re.MULTILINE)
    data["h1"] = h1.group(1).strip() if h1 else ""
    return data


class Existing(NamedTuple):
    path: str
    primary_keyword: str
    secondary_keywords: list[str]
    intent: str
    slug: str
    h1: str
    cluster: str


def existing_content(root: Path) -> list[Existing]:
    paths: list[Path] = []
    for directory in (
        Path("文稿/seo_contect/00_待处理"),
        Path("文稿/seo_contect/01_SEO筛选/briefs"),
        Path("文稿/seo_contect/02_文章初稿"),
        Path("文稿/seo_contect/03_Khazix成稿"),
        Path("文稿/seo_contect/05_最终成品"),
    ):
        base = root / directory
        if base.exists():
            paths.extend(base.rglob("*.md"))
    seen = set()
    items: list[Existing] = []
    for path in sorted(paths):
        data = frontmatter(path.read_text(encoding="utf-8", errors="replace"))
        if not data.get("primary_keyword") and not data.get("intent"):
            continue
        key = (data.get("article_id", ""), data.get("primary_keyword", ""), data.get("intent", ""))
        if key in seen:
            continue
        seen.add(key)
        items.append(Existing(
            str(path.relative_to(root)),
            data.get("primary_keyword", ""),
            parse_list(data.get("secondary_keywords", "")),
            data.get("intent", ""),
            data.get("slug", ""),
            data.get("h1", ""),
            data.get("cluster", ""),
        ))
    return items


def read_candidates(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = [field for field in FIELDS if field not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"{path} missing fields: {', '.join(missing)}")
        return [{key: (value or "").strip() for key, value in row.items()} for row in reader if row.get("primary_keyword")]


def candidate_score(candidate: dict[str, str], item: Existing) -> tuple[float, str]:
    candidate_entity = entity(candidate["primary_keyword"])
    existing_entity = entity(item.primary_keyword)
    if candidate_entity and existing_entity and candidate_entity != existing_entity:
        return 0.0, "different_product_entity"
    owned = {normalize(item.primary_keyword), *(normalize(value) for value in item.secondary_keywords)}
    if normalize(candidate["primary_keyword"]) in owned:
        return 1.0, "keyword_already_owned"
    keyword_score = max(
        [similarity(candidate["primary_keyword"], item.primary_keyword)]
        + [similarity(candidate["primary_keyword"], value) for value in item.secondary_keywords]
    )
    intent_score = similarity(candidate["intent"], item.intent)
    h1_score = similarity(candidate["primary_keyword"], item.h1)
    cluster_score = similarity(candidate["cluster"], item.cluster)
    combined = max(keyword_score, 0.55 * intent_score + 0.25 * keyword_score + 0.20 * cluster_score, h1_score)
    return round(combined, 4), "semantic_overlap"


def decide(candidate: dict[str, str], items: list[Existing]) -> dict[str, str]:
    ranked = []
    for item in items:
        score, reason = candidate_score(candidate, item)
        ranked.append((score, reason, item))
    score, reason, item = max(ranked, key=lambda row: row[0], default=(0.0, "no_existing_content", None))
    if item is None or score < 0.72:
        decision = "CREATE_NEW"
        reason = "NO_OWNED_INTENT_ABOVE_THRESHOLD"
    elif score >= 0.98:
        decision = "UPDATE_EXISTING"
        reason = "PRIMARY_OR_SECONDARY_KEYWORD_ALREADY_OWNED"
    elif score >= 0.84:
        decision = "MERGE"
        reason = "HIGH_SEARCH_INTENT_OVERLAP"
    else:
        decision = "REPLACE_WITH_NEXT_CANDIDATE"
        reason = "POSSIBLE_CANNIBALIZATION_REQUIRES_HUMAN_REVIEW"
    return {
        **candidate,
        "decision": decision,
        "overlap_score": f"{score:.4f}",
        "existing_path": item.path if item else "",
        "existing_primary_keyword": item.primary_keyword if item else "",
        "existing_intent": item.intent if item else "",
        "reason": reason,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output-csv", type=Path, required=True)
    parser.add_argument("--output-json", type=Path, required=True)
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT)
    args = parser.parse_args(argv)
    candidates = read_candidates(args.input)
    existing = existing_content(args.project_root)
    decisions = [decide(candidate, existing) for candidate in candidates]
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    with args.output_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows({field: row.get(field, "") for field in OUTPUT_FIELDS} for row in decisions)
    summary = {
        "candidate_count": len(candidates),
        "existing_metadata_count": len(existing),
        "decisions": {
            decision: sum(row["decision"] == decision for row in decisions)
            for decision in ["CREATE_NEW", "MERGE", "UPDATE_EXISTING", "REPLACE_WITH_NEXT_CANDIDATE"]
        },
        "rows": decisions,
    }
    args.output_json.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in summary.items() if key != "rows"}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
