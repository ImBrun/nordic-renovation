#!/usr/bin/env python3
"""Clean and validate the fictional Nordic Renovation lead export.

The source file stores naive timestamps. They are interpreted as local
Europe/Copenhagen time and emitted as ISO 8601 timestamps with their UTC offset.
"""

from __future__ import annotations

import csv
import re
from decimal import Decimal, InvalidOperation
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "data" / "raw" / "leads.csv"
CLEAN_PATH = ROOT / "data" / "processed" / "leads_clean.csv"
REJECTED_PATH = ROOT / "data" / "processed" / "leads_rejected.csv"
COPENHAGEN = ZoneInfo("Europe/Copenhagen")

PROJECT_TYPES = {
    "bathroom": "Bathroom",
    "kitchen": "Kitchen",
    "flooring": "Flooring",
    "painting": "Painting",
    "full renovation": "Full renovation",
}
REQUIRED_FIELDS = ("lead_id", "created_at", "customer_name", "email", "project_type", "budget_dkk", "location", "source", "status")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def normalise_name(value: str) -> str:
    """Trim/collapse whitespace and use normal name capitalization."""
    return " ".join(value.split()).title()


def normalise_project_type(value: str) -> str:
    return PROJECT_TYPES.get(" ".join(value.split()).casefold(), " ".join(value.split()))


def normalise_created_at(value: str) -> str:
    parsed = datetime.strptime(value.strip(), "%Y-%m-%d %H:%M")
    return parsed.replace(tzinfo=COPENHAGEN).isoformat(timespec="minutes")


def normalise_row(row: dict[str, str]) -> dict[str, str]:
    cleaned = {key: (value or "").strip() for key, value in row.items()}
    cleaned["customer_name"] = normalise_name(cleaned.get("customer_name", ""))
    cleaned["project_type"] = normalise_project_type(cleaned.get("project_type", ""))
    if cleaned.get("created_at"):
        try:
            cleaned["created_at"] = normalise_created_at(cleaned["created_at"])
        except ValueError:
            # Validation records a useful rejection reason below.
            pass
    return cleaned


def validation_reasons(row: dict[str, str]) -> list[str]:
    reasons = [f"missing_required_field:{field}" for field in REQUIRED_FIELDS if not row.get(field, "").strip()]
    if row.get("project_type") and row["project_type"] not in PROJECT_TYPES.values():
        reasons.append("invalid_project_type")
    if row.get("email") and not EMAIL_PATTERN.fullmatch(row["email"]):
        reasons.append("invalid_email")
    if row.get("budget_dkk"):
        try:
            if not Decimal(row["budget_dkk"]).is_finite() or Decimal(row["budget_dkk"]) <= 0:
                reasons.append("invalid_budget_dkk")
        except InvalidOperation:
            reasons.append("invalid_budget_dkk")
    if row.get("created_at"):
        try:
            parsed_timestamp = datetime.fromisoformat(row["created_at"])
            if parsed_timestamp.tzinfo is None or parsed_timestamp.utcoffset() is None:
                reasons.append("invalid_created_at")
        except ValueError:
            reasons.append("invalid_created_at")
    return reasons


def clean_rows(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Return cleaned and rejected rows while preserving the input order."""
    clean: list[dict[str, str]] = []
    rejected: list[dict[str, str]] = []
    seen_raw_rows: set[tuple[tuple[str, str], ...]] = set()

    for raw_row in rows:
        raw_key = tuple(raw_row.items())
        if raw_key in seen_raw_rows:
            duplicate = raw_row.copy()
            duplicate["rejection_reason"] = "duplicate_row"
            rejected.append(duplicate)
            continue
        seen_raw_rows.add(raw_key)

        row = normalise_row(raw_row)
        reasons = validation_reasons(row)
        if reasons:
            row["rejection_reason"] = ";".join(reasons)
            rejected.append(row)
        else:
            clean.append(row)
    return clean, rejected


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    with INPUT_PATH.open(encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        source_fields = reader.fieldnames or []
        clean, rejected = clean_rows(list(reader))

    write_csv(CLEAN_PATH, clean, source_fields)
    write_csv(REJECTED_PATH, rejected, [*source_fields, "rejection_reason"])
    print(f"Wrote {len(clean):,} clean leads to {CLEAN_PATH}")
    print(f"Wrote {len(rejected):,} rejected leads to {REJECTED_PATH}")


if __name__ == "__main__":
    main()
