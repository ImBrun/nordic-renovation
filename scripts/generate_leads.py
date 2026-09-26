#!/usr/bin/env python3
"""Generate reproducible, fictional and intentionally imperfect lead data."""

from __future__ import annotations

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path


SEED = 20260925
LEAD_COUNT = 1_000
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "raw" / "leads.csv"
FIELDS = [
    "lead_id", "created_at", "customer_name", "email", "phone", "project_type",
    "budget_dkk", "location", "source", "status", "assigned_to",
    "estimated_value_dkk", "response_time_hours", "notes",
]

FIRST_NAMES = ["Mikkel", "Sofie", "Emil", "Freja", "Lukas", "Ida", "William", "Clara", "Jonas", "Emma", "Oscar", "Alma", "Noah", "Laura", "Victor", "Mathilde", "Anders", "Sara", "Nikolaj", "Anna"]
LAST_NAMES = ["Jensen", "Nielsen", "Hansen", "Pedersen", "Andersen", "Christensen", "Larsen", "Sørensen", "Rasmussen", "Jørgensen", "Madsen", "Kristensen", "Olsen", "Thomsen", "Poulsen"]
LOCATIONS = ["Copenhagen K", "Østerbro", "Nørrebro", "Vesterbro", "Frederiksberg", "Amager", "Valby", "Hellerup", "Vanløse", "Brønshøj"]
PROJECTS = ["Bathroom", "Kitchen", "Flooring", "Painting", "Full renovation"]
SOURCES = ["Google", "Facebook", "Referral", "Website", "Instagram", "Partner"]
ASSIGNEES = ["Anna Larsen", "Mads Nielsen", "Sofie Holm", "Jonas Berg"]
NOTES = [
    "Would like an on-site assessment.", "Looking for an estimate before summer.",
    "Apartment renovation; access is easiest on weekdays.", "Has inspiration photos ready.",
    "Interested in a sustainable material option.", "Wants to compare a few layout options.",
]


def weighted_choice(rng: random.Random, items: list[str], weights: list[int]) -> str:
    return rng.choices(items, weights=weights, k=1)[0]


def make_row(rng: random.Random, index: int, identities: list[tuple[str, str, str]]) -> dict[str, str]:
    # Reuse prior fictional identities occasionally to model returning customers.
    if identities and rng.random() < 0.055:
        name, email, phone = rng.choice(identities)
    else:
        first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        name = f"{first} {last}"
        email = f"{first.lower()}.{last.lower()}@example.dk"
        phone = f"+45 {rng.randint(20, 59)} {rng.randint(10, 99)} {rng.randint(10, 99)} {rng.randint(10, 99)}"
        identities.append((name, email, phone))

    created = datetime(2025, 10, 1, 8, 0) + timedelta(minutes=rng.randint(0, 525_599))
    project = weighted_choice(rng, PROJECTS, [23, 22, 17, 20, 18])
    source = weighted_choice(rng, SOURCES, [38, 15, 17, 20, 6, 4])
    status = weighted_choice(rng, ["New", "Contacted", "Qualified", "Quoted", "Won", "Lost", "Unresponsive"], [15, 18, 16, 15, 14, 14, 8])
    budget_ranges = {
        "Bathroom": (45_000, 175_000), "Kitchen": (75_000, 300_000),
        "Flooring": (20_000, 130_000), "Painting": (12_000, 90_000),
        "Full renovation": (180_000, 850_000),
    }
    low, high = budget_ranges[project]
    budget = rng.randrange(low, high + 1, 1_000)
    estimated = round(budget * rng.uniform(0.9, 1.15) / 500) * 500
    contacted = status not in {"New"}

    return {
        "lead_id": f"LEAD-{index:05d}", "created_at": created.strftime("%Y-%m-%d %H:%M"),
        "customer_name": name, "email": email, "phone": phone, "project_type": project,
        "budget_dkk": str(budget), "location": rng.choice(LOCATIONS), "source": source,
        "status": status, "assigned_to": rng.choice(ASSIGNEES) if contacted else "",
        "estimated_value_dkk": str(estimated),
        "response_time_hours": f"{rng.uniform(0.25, 72):.1f}" if contacted else "",
        "notes": rng.choice(NOTES),
    }


def add_intentional_issues(rng: random.Random, rows: list[dict[str, str]]) -> list[dict[str, str]]:
    for row in rng.sample(rows[:980], 34):
        row["phone"] = ""
    for row in rng.sample(rows[:980], 12):
        row["email"] = row["email"].replace("@", " at ")
    for row in rng.sample(rows[:980], 28):
        row["customer_name"] = "  " + row["customer_name"].upper() + "  "
    for row in rng.sample(rows[:980], 10):
        row["project_type"] = row["project_type"].lower()
    for row in rng.sample(rows[:980], 7):
        row["budget_dkk"] = str(rng.choice([0, -5_000, 9_999_999]))
    # Preserve total record count: replace the final 20 rows with exact duplicates.
    # This happens last so later issue injection cannot make a duplicate diverge.
    for target, source in zip(range(980, 1_000), rng.sample(range(0, 900), 20)):
        rows[target] = rows[source].copy()
    return rows


def main() -> None:
    rng = random.Random(SEED)
    identities: list[tuple[str, str, str]] = []
    rows = [make_row(rng, i, identities) for i in range(1, LEAD_COUNT + 1)]
    rows = add_intentional_issues(rng, rows)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows):,} synthetic lead records to {OUTPUT}")


if __name__ == "__main__":
    main()
