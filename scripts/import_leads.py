#!/usr/bin/env python3
"""Idempotently import cleaned synthetic leads into Supabase.

Required environment variables:
  SUPABASE_URL
  SUPABASE_SECRET_KEY (preferred) or SUPABASE_PUBLISHABLE_KEY

Install the client before running:
  python3 -m pip install supabase python-dotenv
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "data" / "processed" / "leads_clean.csv"
TABLE_NAME = "leads"
COPENHAGEN = ZoneInfo("Europe/Copenhagen")
REQUIRED_COLUMNS = {
    "lead_id", "created_at", "customer_name", "email", "phone", "project_type",
    "budget_dkk", "location", "source", "status", "assigned_to",
    "estimated_value_dkk", "response_time_hours", "notes",
}


def get_credentials() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "").strip()
    # Secret keys bypass RLS and are the appropriate choice for a trusted local import.
    key = os.environ.get("SUPABASE_SECRET_KEY", "").strip()
    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_SECRET_KEY before importing."
        )
    return url, key


def to_utc_timestamp(value: str) -> str:
    """Convert Copenhagen-local source time to an explicit UTC timestamptz value."""
    timestamp = datetime.fromisoformat(value)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=COPENHAGEN)
    return timestamp.astimezone(timezone.utc).isoformat(timespec="seconds")


def to_number(value: str, field_name: str) -> float:
    try:
        number = Decimal(value)
    except InvalidOperation as error:
        raise ValueError(f"{field_name} is not numeric: {value!r}") from error
    if not number.is_finite():
        raise ValueError(f"{field_name} must be finite: {value!r}")
    return float(number)


def row_to_record(row: dict[str, str]) -> dict[str, Any]:
    """Map a cleaned CSV row to Supabase's `public.leads` payload."""
    response_time = row["response_time_hours"].strip()
    return {
        "lead_id": row["lead_id"],
        "created_at": to_utc_timestamp(row["created_at"]),
        "customer_name": row["customer_name"],
        "email": row["email"],
        "phone": row["phone"] or None,
        "project_type": row["project_type"],
        "budget_dkk": to_number(row["budget_dkk"], "budget_dkk"),
        "location": row["location"],
        "source": row["source"],
        "status": row["status"],
        "assigned_to": row["assigned_to"] or None,
        "estimated_value_dkk": to_number(row["estimated_value_dkk"], "estimated_value_dkk"),
        "response_time_hours": to_number(response_time, "response_time_hours") if response_time else None,
        "notes": row["notes"] or None,
    }


def read_records(input_path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    with input_path.open(encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        columns = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - columns
        if missing:
            raise ValueError(f"Input CSV is missing columns: {', '.join(sorted(missing))}")

        records: list[dict[str, Any]] = []
        failures: list[str] = []
        for line_number, row in enumerate(reader, start=2):
            try:
                records.append(row_to_record(row))
            except (KeyError, ValueError) as error:
                failures.append(f"CSV line {line_number} ({row.get('lead_id', 'unknown')}): {error}")
    return records, failures


def upsert_records(client: Any, records: list[dict[str, Any]], batch_size: int) -> tuple[int, list[str]]:
    successful = 0
    failures: list[str] = []
    for start in range(0, len(records), batch_size):
        batch = records[start : start + batch_size]
        try:
            client.table(TABLE_NAME).upsert(batch, on_conflict="lead_id").execute()
            successful += len(batch)
        except Exception as batch_error:  # Retry individually to identify problematic records.
            for record in batch:
                try:
                    client.table(TABLE_NAME).upsert(record, on_conflict="lead_id").execute()
                    successful += 1
                except Exception as record_error:
                    failures.append(
                        f"{record['lead_id']}: {record_error} (batch error: {batch_error})"
                    )
    return successful, failures


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import cleaned Nordic Renovation leads into Supabase.")
    parser.add_argument("--input", type=Path, default=INPUT_PATH, help="Path to leads_clean.csv")
    parser.add_argument("--batch-size", type=int, default=100, help="Upsert batch size (default: 100)")
    args = parser.parse_args()
    if args.batch_size < 1:
        parser.error("--batch-size must be at least 1")
    return args


def main() -> int:
    # Explicit shell variables take precedence over values in the local .env file.
    load_dotenv(ROOT / ".env")
    args = parse_args()
    if not args.input.exists():
        print(f"Input file not found: {args.input}. Run scripts/clean_leads.py first.", file=sys.stderr)
        return 2
    try:
        records, conversion_failures = read_records(args.input)
        url, key = get_credentials()
        try:
            from supabase import create_client
        except ImportError:
            print("Missing dependency: install it with `python3 -m pip install supabase`.", file=sys.stderr)
            return 2
        client = create_client(url, key)
        upserted, import_failures = upsert_records(client, records, args.batch_size)
    except (OSError, RuntimeError, ValueError) as error:
        print(f"Import could not start: {error}", file=sys.stderr)
        return 2

    failures = [*conversion_failures, *import_failures]
    print(f"Read {len(records) + len(conversion_failures):,} cleaned CSV rows.")
    print(f"Upserted {upserted:,} records into public.{TABLE_NAME} (conflict key: lead_id).")
    print(f"Failures: {len(failures):,}.")
    for failure in failures[:10]:
        print(f"  - {failure}")
    if len(failures) > 10:
        print(f"  ... {len(failures) - 10} additional failures omitted")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
