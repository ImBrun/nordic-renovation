# Nordic Renovation — Lead Management Demo

A portfolio-ready demonstration of a small-business lead-management and reporting workflow for the fictional Copenhagen renovation firm **Nordic Renovation ApS**.

> All records are synthetic. Names, contact details, and businesses are fictitious and must not be used to contact anyone.

## Milestone 1: synthetic lead data

Generate the deliberately messy source data:

```bash
python3 scripts/generate_leads.py
```

This writes `data/raw/leads.csv` with 1,000 fictional enquiries. It intentionally includes a small number of duplicate records, missing phones, malformed email addresses, inconsistent text casing, and implausible budgets. Those issues are input for the forthcoming validation and cleaning milestone.

## Project layout

```text
data/raw/       Synthetic source data (messy by design)
data/processed/ Clean, analysis-ready outputs (next milestone)
docs/           Data dictionary and project notes
scripts/        Reproducible data and pipeline scripts
tests/          Automated checks
```

## Planned workflow

`raw CSV → validation & cleaning → KPIs → dashboard → lead-submission automation`
