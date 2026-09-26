"""Checks for the synthetic source dataset and its cleaning pipeline."""

import csv
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "data" / "raw" / "leads.csv"
CLEAN_DATASET = ROOT / "data" / "processed" / "leads_clean.csv"
REJECTED_DATASET = ROOT / "data" / "processed" / "leads_rejected.csv"
sys.path.insert(0, str(ROOT / "scripts"))
from clean_leads import clean_rows  # noqa: E402
from import_leads import row_to_record, to_utc_timestamp  # noqa: E402


def test_generator_creates_expected_schema_and_count() -> None:
    subprocess.run([sys.executable, "scripts/generate_leads.py"], cwd=ROOT, check=True)
    with DATASET.open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    assert len(rows) == 1_000
    assert set(rows[0]) == {
        "lead_id", "created_at", "customer_name", "email", "phone", "project_type",
        "budget_dkk", "location", "source", "status", "assigned_to",
        "estimated_value_dkk", "response_time_hours", "notes",
    }
    assert len({tuple(row.items()) for row in rows}) < len(rows)
    assert any(not row["phone"] for row in rows)
    assert any(" at " in row["email"] for row in rows)


def test_cleaner_normalises_and_rejects_expected_data() -> None:
    subprocess.run([sys.executable, "scripts/generate_leads.py"], cwd=ROOT, check=True)
    subprocess.run([sys.executable, "scripts/clean_leads.py"], cwd=ROOT, check=True)
    with CLEAN_DATASET.open(encoding="utf-8", newline="") as file:
        clean_rows_from_file = list(csv.DictReader(file))
    with REJECTED_DATASET.open(encoding="utf-8", newline="") as file:
        rejected_rows = list(csv.DictReader(file))

    assert len(clean_rows_from_file) + len(rejected_rows) == 1_000
    assert all(row["project_type"] in {"Bathroom", "Kitchen", "Flooring", "Painting", "Full renovation"} for row in clean_rows_from_file)
    assert all("T" in row["created_at"] and row["created_at"][-6] in {"+", "-"} for row in clean_rows_from_file)
    assert any(row["rejection_reason"] == "duplicate_row" for row in rejected_rows)
    assert any("invalid_email" in row["rejection_reason"] for row in rejected_rows)
    assert any("invalid_budget_dkk" in row["rejection_reason"] for row in rejected_rows)


def test_clean_rows_handles_normalisation_and_multiple_rejection_reasons() -> None:
    valid = {
        "lead_id": "LEAD-1", "created_at": "2026-07-01 10:30", "customer_name": "  sARA   NIELSEN ",
        "email": "sara@example.dk", "phone": "", "project_type": " full renovation ", "budget_dkk": "85000",
        "location": "Copenhagen K", "source": "Google", "status": "New", "assigned_to": "",
        "estimated_value_dkk": "85000", "response_time_hours": "", "notes": "Test",
    }
    invalid = {**valid, "lead_id": "", "email": "not-an-email", "budget_dkk": "0"}
    clean, rejected = clean_rows([valid, valid.copy(), invalid])

    assert clean[0]["customer_name"] == "Sara Nielsen"
    assert clean[0]["project_type"] == "Full renovation"
    assert clean[0]["created_at"] == "2026-07-01T10:30+02:00"
    assert rejected[0]["rejection_reason"] == "duplicate_row"
    assert rejected[1]["rejection_reason"] == "missing_required_field:lead_id;invalid_email;invalid_budget_dkk"


def test_import_payload_uses_utc_timestamp_numbers_and_null_optionals() -> None:
    record = row_to_record({
        "lead_id": "LEAD-00001", "created_at": "2026-07-01T10:30+02:00", "customer_name": "Sara Nielsen",
        "email": "sara@example.dk", "phone": "", "project_type": "Bathroom", "budget_dkk": "85000",
        "location": "Copenhagen K", "source": "Google", "status": "New", "assigned_to": "",
        "estimated_value_dkk": "87500.50", "response_time_hours": "", "notes": "",
    })
    assert to_utc_timestamp("2026-01-01T10:30+01:00") == "2026-01-01T09:30:00+00:00"
    assert record["created_at"] == "2026-07-01T08:30:00+00:00"
    assert record["budget_dkk"] == 85000.0
    assert record["estimated_value_dkk"] == 87500.5
    assert record["phone"] is None
    assert record["assigned_to"] is None
    assert record["response_time_hours"] is None
