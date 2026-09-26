-- Clean, validated destination for the synthetic lead-import pipeline.
-- The raw CSV is intentionally imperfect and must be cleaned before import.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null unique,
  created_at timestamptz not null,
  customer_name text not null,
  email text not null,
  phone text,
  project_type text not null,
  budget_dkk numeric(12, 2) not null,
  location text not null,
  source text not null,
  status text not null,
  assigned_to text,
  estimated_value_dkk numeric(12, 2) not null,
  response_time_hours numeric(6, 2),
  notes text,
  inserted_at timestamptz not null default now(),

  constraint leads_lead_id_format_check
    check (lead_id ~ '^LEAD-[0-9]{5}$'),
  constraint leads_customer_name_not_blank_check
    check (btrim(customer_name) <> ''),
  constraint leads_email_format_check
    check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint leads_project_type_check
    check (project_type in ('Bathroom', 'Kitchen', 'Flooring', 'Painting', 'Full renovation')),
  constraint leads_budget_positive_check
    check (budget_dkk > 0),
  constraint leads_location_not_blank_check
    check (btrim(location) <> ''),
  constraint leads_source_check
    check (source in ('Google', 'Facebook', 'Referral', 'Website', 'Instagram', 'Partner')),
  constraint leads_status_check
    check (status in ('New', 'Contacted', 'Qualified', 'Quoted', 'Won', 'Lost', 'Unresponsive')),
  constraint leads_estimated_value_positive_check
    check (estimated_value_dkk > 0),
  constraint leads_response_time_nonnegative_check
    check (response_time_hours is null or response_time_hours >= 0)
);

comment on table public.leads is
  'Validated lead enquiries imported from the synthetic source dataset.';
comment on column public.leads.id is
  'Internal immutable database identifier.';
comment on column public.leads.lead_id is
  'Unique identifier from the cleaned source dataset.';
comment on column public.leads.created_at is
  'Time the enquiry was received; source values are interpreted in Europe/Copenhagen during import.';
comment on column public.leads.inserted_at is
  'Time the validated lead was inserted into the database.';

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_status_idx on public.leads (status);
create index leads_source_idx on public.leads (source);
create index leads_assigned_to_idx on public.leads (assigned_to) where assigned_to is not null;

alter table public.leads enable row level security;
