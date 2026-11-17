#!/usr/bin/env python3
"""
Export the Ornagai English -> Myanmar dictionary from MySQL into a Kobo
dictionary using dictgen (https://pgaskin.net/dictutil/dictgen/).

Source schema (database `ornagai_v3_app`):
    english_words            (id, word)
    english_word_data        (id, english_word_id, state, def, ipa, ipa_mm)
    english_word_data_examples (id, english_word_data_id, example)

One dictgen entry is produced per headword. Every sense of that headword is
rendered into a single raw-HTML body (same rendering as the StarDict export),
so a lookup of "run" shows both the verb and the noun senses together.

Pipeline:
    MySQL -> dictgen .df files (chunked) -> dictgen -> dicthtml.zip

Install dictgen on the device by copying dicthtml.zip to `.kobo/custom-dict/`
(firmware 4.23.15505+). The filename must stay `dicthtml.zip` there.

Usage:
    .venv/bin/python export_kobo.py
    .venv/bin/python export_kobo.py --limit 500 --out build/sample
    .venv/bin/python export_kobo.py --no-dictgen   # only write .df files
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import sys
import time
from collections import defaultdict
from datetime import date
from pathlib import Path

import pymysql

HERE = Path(__file__).resolve().parent
REPO = HERE.parent

# Inline tags that are allowed to survive as real markup. A few source
# definitions genuinely contain emphasis (e.g. "cobblers" has <em>...</em>),
# while others contain literal angle brackets (e.g. "angle bracket" has "<>").
# Everything outside this whitelist is escaped as text.
ALLOWED_TAGS = ("em", "i", "b", "strong", "u", "sub", "sup", "br")
_TAG_RE = re.compile(r"</?(?:" + "|".join(ALLOWED_TAGS) + r")\s*/?>", re.IGNORECASE)
_TAG_NAME_RE = re.compile(r"^</?([a-z]+)", re.IGNORECASE)
_VOID_TAGS = {"br"}


def load_env(path: Path) -> dict[str, str]:
    """Minimal .env reader: KEY=VALUE lines, optional quotes, # comments."""
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        values[key] = val
    return values


def escape_text(raw: str) -> str:
    """Escape a text run and turn its newlines into HTML line breaks."""
    return html.escape(raw, quote=False).replace("\n", "<br>")


def render_text(raw: str | None) -> str:
    """
    Render a source field as safe HTML.

    All text is escaped, except for a small whitelist of balanced inline tags
    which are passed through. If the whitelisted tags in a field are unbalanced
    the field is escaped completely, so broken markup never reaches the output.
    """
    if not raw:
        return ""
    text = raw.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return ""

    tags = list(_TAG_RE.finditer(text))
    if tags:
        stack: list[str] = []
        balanced = True
        for match in tags:
            token = match.group(0)
            name = _TAG_NAME_RE.match(token).group(1).lower()
            if name in _VOID_TAGS:
                continue
            if token.startswith("</"):
                if not stack or stack[-1] != name:
                    balanced = False
                    break
                stack.pop()
            else:
                stack.append(name)
        if stack:
            balanced = False
        if not balanced:
            return escape_text(text)

    parts: list[str] = []
    cursor = 0
    for match in tags:
        parts.append(escape_text(text[cursor : match.start()]))
        parts.append(match.group(0).lower())
        cursor = match.end()
    parts.append(escape_text(text[cursor:]))
    return "".join(parts)


def normalize_ipa(raw: str | None) -> str:
    """
    Strip any delimiters the source already put around the IPA.

    About 18k senses store "/.../" (a few use "[...]"), the rest store the bare
    transcription. Normalizing here lets the renderer add one consistent pair
    of slashes instead of producing "//...//".
    """
    if not raw:
        return ""
    text = raw.strip()
    while len(text) >= 2 and text[0] in "/[" and text[-1] in "/]":
        text = text[1:-1].strip()
    return text.strip("/[]").strip()


def clean_headword(raw: str) -> str:
    """
    Make a source word safe for a dictgen `@ ` headword line.

    The .df format is line-based, so newlines and other control characters
    must never appear in a headword.
    """
    text = re.sub(r"[\x00-\x1f\x7f]+", " ", raw or "")
    return re.sub(r"\s+", " ", text).strip()


def render_entry(senses: list[dict], examples: dict[int, list[str]]) -> str:
    """Build the HTML definition for one headword, or "" if it has no content."""
    blocks: list[str] = []
    numbered = len(senses) > 1

    for index, sense in enumerate(senses, start=1):
        state = render_text(sense.get("state"))
        ipa = render_text(normalize_ipa(sense.get("ipa")))
        ipa_mm = render_text(sense.get("ipa_mm"))
        definition = render_text(sense.get("def"))
        sense_examples = examples.get(sense["id"], [])

        header_parts = []
        if state:
            header_parts.append(f"<b>{state}</b>")
        if ipa:
            header_parts.append(f"<i>/{ipa}/</i>")
        if ipa_mm:
            header_parts.append(f"[{ipa_mm}]")

        lines: list[str] = []
        if header_parts:
            lines.append(" ".join(header_parts))
        if definition:
            prefix = f"{index}. " if numbered else ""
            lines.append(f"{prefix}{definition}")
        for example in sense_examples:
            rendered = render_text(example)
            if rendered:
                lines.append(f"<i>\u2022 {rendered}</i>")

        if lines:
            blocks.append("<br>".join(lines))

    return "<br><br>".join(blocks)


def fetch_senses(conn, word_ids: list[int]) -> dict[int, list[dict]]:
    grouped: dict[int, list[dict]] = defaultdict(list)
    if not word_ids:
        return grouped
    placeholders = ",".join(["%s"] * len(word_ids))
    with conn.cursor(pymysql.cursors.DictCursor) as cur:
        cur.execute(
            "SELECT id, english_word_id, state, def, ipa, ipa_mm "
            f"FROM english_word_data WHERE english_word_id IN ({placeholders}) "
            "ORDER BY english_word_id, id",
            word_ids,
        )
        for row in cur.fetchall():
            grouped[row["english_word_id"]].append(row)
    return grouped


def fetch_examples(conn, sense_ids: list[int]) -> dict[int, list[str]]:
    grouped: dict[int, list[str]] = defaultdict(list)
    if not sense_ids:
        return grouped
    placeholders = ",".join(["%s"] * len(sense_ids))
    with conn.cursor(pymysql.cursors.DictCursor) as cur:
        cur.execute(
            "SELECT english_word_data_id, example "
            f"FROM english_word_data_examples WHERE english_word_data_id IN ({placeholders}) "
            "ORDER BY english_word_data_id, id",
            sense_ids,
        )
        for row in cur.fetchall():
            grouped[row["english_word_data_id"]].append(row["example"])
    return grouped


def iter_word_batches(conn, batch_size: int, limit: int | None):
    """Stream headwords in ascending id windows so memory stays bounded."""
    last_id = 0
    emitted = 0
    while True:
        take = batch_size if limit is None else min(batch_size, limit - emitted)
        if take <= 0:
            return
        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            cur.execute(
                "SELECT id, word FROM english_words WHERE id > %s ORDER BY id LIMIT %s",
                (last_id, take),
            )
            rows = cur.fetchall()
        if not rows:
            return
        last_id = rows[-1]["id"]
        emitted += len(rows)
        yield rows


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class DictfileWriter:
    """
    Write entries into chunked dictgen .df files.

    Each entry is:
        @ headword
        <html>...single-line raw HTML body...

    The body is always one line (render_entry never emits raw newlines), so no
    body line can accidentally start a new `@ ` entry or a `& `/`: ` header.
    The default bolded headword that Kobo prepends is kept (no `::` header).
    """

    def __init__(self, df_dir: Path, entries_per_file: int):
        self.df_dir = df_dir
        self.entries_per_file = entries_per_file
        self.files: list[Path] = []
        self._handle = None
        self._count_in_file = 0

    def _rotate(self):
        if self._handle is not None:
            self._handle.close()
        path = self.df_dir / f"part-{len(self.files) + 1:04d}.df"
        self.files.append(path)
        self._handle = path.open("w", encoding="utf-8")
        self._count_in_file = 0

    def add(self, headword: str, body_html: str):
        if self._handle is None or self._count_in_file >= self.entries_per_file:
            self._rotate()
        self._handle.write(f"@ {headword}\n<html>{body_html}\n\n")
        self._count_in_file += 1

    def close(self):
        if self._handle is not None:
            self._handle.close()
            self._handle = None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", default=str(REPO / ".env"), help="Laravel .env with DB_* settings")
    parser.add_argument("--host", default=None)
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--database", default=None)
    parser.add_argument("--user", default=None)
    parser.add_argument("--password", default=None)
    parser.add_argument("--out", default=str(HERE / "build" / "ornagai-en-my"))
    parser.add_argument("--zip-name", default="dicthtml.zip", help="Kobo requires dicthtml.zip in .kobo/custom-dict/")
    parser.add_argument("--batch-size", type=int, default=2000, help="Rows fetched per SQL round trip")
    parser.add_argument("--df-size", type=int, default=5000, help="Entries per .df chunk")
    parser.add_argument("--limit", type=int, default=None, help="Export only the first N headwords")
    parser.add_argument("--no-dictgen", action="store_true", help="Only write .df files, do not build the zip")
    parser.add_argument("--dictgen", default=str(HERE / "bin" / "dictgen"), help="Path to the dictgen binary")
    args = parser.parse_args()

    env = load_env(Path(args.env))
    conn_kwargs = {
        "host": args.host or env.get("DB_HOST", "127.0.0.1"),
        "port": args.port or int(env.get("DB_PORT", "3306")),
        "database": args.database or env.get("DB_DATABASE", "ornagai_v3_app"),
        "user": args.user or env.get("DB_USERNAME", "root"),
        "password": args.password if args.password is not None else env.get("DB_PASSWORD", ""),
        "charset": "utf8mb4",
    }

    out_dir = Path(args.out).resolve()
    df_dir = out_dir / "df"
    df_dir.mkdir(parents=True, exist_ok=True)
    for stale in df_dir.glob("part-*.df"):
        stale.unlink()
    zip_path = out_dir / args.zip_name

    print(f"Source: mysql://{conn_kwargs['user']}@{conn_kwargs['host']}:{conn_kwargs['port']}/{conn_kwargs['database']}")
    print(f"Output: {zip_path}")

    started = time.time()
    conn = pymysql.connect(**conn_kwargs)

    total_words = 0
    written = 0
    sense_count = 0
    example_count = 0
    skipped: list[dict] = []
    writer = DictfileWriter(df_dir, args.df_size)

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM english_words")
            total_words = cur.fetchone()[0]
        target = total_words if args.limit is None else min(args.limit, total_words)
        print(f"Headwords in source: {total_words} (exporting {target})")

        for rows in iter_word_batches(conn, args.batch_size, args.limit):
            word_ids = [row["id"] for row in rows]
            senses_by_word = fetch_senses(conn, word_ids)
            sense_ids = [s["id"] for senses in senses_by_word.values() for s in senses]
            examples_by_sense = fetch_examples(conn, sense_ids)

            for row in rows:
                headword = clean_headword(row["word"])
                if not headword:
                    skipped.append({"id": row["id"], "word": row["word"], "reason": "empty headword"})
                    continue
                senses = senses_by_word.get(row["id"], [])
                definition = render_entry(senses, examples_by_sense)
                if not definition:
                    skipped.append({"id": row["id"], "word": row["word"], "reason": "no usable definition"})
                    continue
                writer.add(headword, definition)
                written += 1
                sense_count += len(senses)
                example_count += sum(len(examples_by_sense.get(s["id"], [])) for s in senses)

            print(f"  {written} entries rendered...", flush=True)
    finally:
        writer.close()
        conn.close()

    print(f"Wrote {len(writer.files)} dictfile(s) to {df_dir}")

    artifacts = []
    dictgen_info = None
    if not args.no_dictgen:
        dictgen_bin = Path(args.dictgen).resolve()
        if not dictgen_bin.is_file():
            print(f"ERROR: dictgen binary not found at {dictgen_bin}", file=sys.stderr)
            print("Build it with: GOBIN=kobo/bin go install github.com/pgaskin/dictutil/cmd/dictgen@v0.3.2", file=sys.stderr)
            return 1
        # -I remove: the source has no images, and embedded dict:/// image URLs
        # blank the webview on some firmware, so removal is the safe method.
        cmd = [str(dictgen_bin), "-o", str(zip_path), "-I", "remove", *[str(p) for p in writer.files]]
        print("Running:", " ".join(cmd[:5]), f"... ({len(writer.files)} dictfiles)")
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            print(proc.stdout)
            print(proc.stderr, file=sys.stderr)
            return 1
        if proc.stderr.strip():
            print(proc.stderr.strip())
        dictgen_info = {"binary": str(dictgen_bin), "image_method": "remove", "dictfiles": len(writer.files)}
        artifacts.append({"file": zip_path.name, "bytes": zip_path.stat().st_size, "sha256": sha256_of(zip_path)})

    report = {
        "source": {k: v for k, v in conn_kwargs.items() if k != "password"},
        "generated_on": date.today().isoformat(),
        "headwords_in_source": total_words,
        "entries_written": written,
        "senses_written": sense_count,
        "examples_written": example_count,
        "skipped": skipped,
        "format": "dictgen .df -> Kobo dicthtml",
        "dictgen": dictgen_info,
        "elapsed_seconds": round(time.time() - started, 2),
        "artifacts": artifacts,
        "install": "Copy dicthtml.zip to the Kobo's .kobo/custom-dict/ folder (firmware 4.23.15505+), then eject.",
    }
    report_path = out_dir / "export-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"\nEntries written : {written}")
    print(f"Senses          : {sense_count}")
    print(f"Examples        : {example_count}")
    print(f"Skipped         : {len(skipped)} -> {[s['word'] for s in skipped][:20]}")
    for item in artifacts:
        print(f"  {item['file']:<28} {item['bytes']:>12,} bytes")
    print(f"Report          : {report_path}")
    print(f"Elapsed         : {report['elapsed_seconds']}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())