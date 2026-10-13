#!/usr/bin/env python3
"""Read-only, bounded retrieval of local Codex user/assistant messages."""
import argparse
import json
import re
import sqlite3
from pathlib import Path

ROOT = Path.home() / '.codex'

def threads():
    databases = sorted(ROOT.glob('state_*.sqlite'), key=lambda p: p.stat().st_mtime, reverse=True)
    if not databases:
        raise SystemExit('No Codex history database found.')
    with sqlite3.connect(databases[0].as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        return [dict(r) for r in db.execute("SELECT id, title, cwd, updated_at, archived, rollout_path FROM threads WHERE source IN ('cli', 'vscode', 'appServer', 'unknown') ORDER BY updated_at DESC")]

def messages(row):
    path = Path(row['rollout_path']).resolve()
    if not path.is_relative_to(ROOT.resolve()) or not path.is_file():
        return []
    result = []
    with path.open(encoding='utf-8') as stream:
        for number, line in enumerate(stream, 1):
            try:
                event = json.loads(line)
            except (ValueError, UnicodeError):
                continue
            payload = event.get('payload') or {}
            if event.get('type') != 'response_item' or payload.get('type') != 'message':
                continue
            role = payload.get('role')
            if role not in ('user', 'assistant'):
                continue
            content = '\n'.join(c.get('text', '') for c in payload.get('content', []) if c.get('type') in ('input_text', 'output_text', 'text'))
            if not content.strip() or content.lstrip().startswith(('<environment_context>', '<external_codex_apps_')):
                continue
            # Persisted assistant commentary/final only; exclude reasoning.
            if role == 'assistant' and payload.get('channel') not in (None, 'final', 'commentary'):
                continue
            content = re.sub(r'\bsk-[A-Za-z0-9_-]{16,}\b', '[redacted credential]', content)
            result.append({'role': role, 'text': content, 'line': number})
    return result

def output(value):
    print(json.dumps(value, ensure_ascii=False, indent=2))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    search = sub.add_parser('search')
    search.add_argument('terms', nargs='+')
    search.add_argument('--limit', type=int, default=5)
    read = sub.add_parser('read')
    read.add_argument('id')
    read.add_argument('--limit', type=int, default=20)
    args = parser.parse_args()
    limit = max(1, min(args.limit, 50))
    rows = threads()
    if args.command == 'read':
        row = next((r for r in rows if r['id'] == args.id), None)
        if row is None:
            raise SystemExit('Thread not found.')
        msgs = messages(row)
        output({k: row[k] for k in ('id', 'title', 'cwd', 'updated_at', 'archived')} | {'messages': [m | {'text': m['text'][:6000]} for m in msgs[-limit:]], 'total_messages': len(msgs)})
        return
    terms = [t.casefold() for t in args.terms if t.strip()]
    if not terms:
        raise SystemExit('Provide a nonempty search term.')
    found = []
    for row in rows:
        msgs = messages(row)
        combined = row['title'].casefold() + '\n' + '\n'.join(m['text'].casefold() for m in msgs)
        score = sum(t in combined for t in terms)
        if not score:
            continue
        snippets = []
        for msg in reversed(msgs):
            positions = [msg['text'].casefold().find(t) for t in terms]
            positions = [p for p in positions if p >= 0]
            if positions:
                start = max(0, min(positions) - 100)
                snippets.append({'role': msg['role'], 'line': msg['line'], 'text': msg['text'][start:start+600]})
            if len(snippets) == 3:
                break
        found.append({k: row[k] for k in ('id', 'title', 'cwd', 'updated_at', 'archived')} | {'matched_terms': score, 'snippets': snippets})
    found.sort(key=lambda r: (r['matched_terms'], r['updated_at']), reverse=True)
    output({'matches': found[:limit], 'matching_threads': len(found), 'searched_threads': len(rows)})

if __name__ == '__main__':
    main()
