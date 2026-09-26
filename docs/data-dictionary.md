# Synthetic Lead Dataset: Data Dictionary

`data/raw/leads.csv` contains fictional enquiries submitted to Nordic Renovation ApS between October 2025 and September 2026.

| Field | Description |
| --- | --- |
| `lead_id` | Unique lead identifier in normal records; duplicate rows retain the original ID intentionally. |
| `created_at` | Date and local time at which the enquiry was received. |
| `customer_name` | Fictional prospective customer name. |
| `email` | Fictional email address; a small sample is malformed intentionally. |
| `phone` | Fictional Danish-format phone number; some are blank intentionally. |
| `project_type` | Bathroom, Kitchen, Flooring, Painting, or Full renovation. |
| `budget_dkk` | Customer-stated project budget in DKK; a few values are implausible deliberately. |
| `location` | Copenhagen-area location. |
| `source` | Google, Facebook, Referral, Website, Instagram, or Partner. |
| `status` | New, Contacted, Qualified, Quoted, Won, Lost, or Unresponsive. |
| `assigned_to` | Fictional Nordic Renovation team member, or blank for unassigned new leads. |
| `estimated_value_dkk` | Estimated potential revenue, derived from stated budget for normal records. |
| `response_time_hours` | Time to first response. Blank for leads that have not been contacted. |
| `notes` | Short fictional context from the enquiry. |

## Intended imperfections

The raw source file is intentionally not analysis-ready. A cleaning pipeline should identify and handle:

- 20 exact duplicate rows
- blank phone numbers
- malformed emails
- inconsistent capitalization / whitespace
- invalid or implausible budgets
- repeated customer identities across separate enquiries

The generator has a fixed seed, so the dataset is reproducible.
