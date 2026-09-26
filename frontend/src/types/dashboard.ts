export type DashboardKpi = {
  label: string
  value: string
  detail: string
}

export type DashboardData = {
  kpis: DashboardKpi[]
  leads: Lead[]
  metrics: DashboardMetrics
  breakdowns: DashboardBreakdowns
}

export type DashboardMetrics = {
  totalLeads: number
  pipelineValue: number
  conversionRate: number
  averageProjectValue: number
}

export type BreakdownItem = { label: string; count: number }

export type DashboardBreakdowns = {
  byStatus: BreakdownItem[]
  bySource: BreakdownItem[]
  byProjectType: BreakdownItem[]
}

export type Lead = {
  lead_id: string
  customer_name: string
  project_type: string
  budget_dkk: number
  estimated_value_dkk: number
  source: string
  status: string
  created_at: string
}

export type NewLeadInput = {
  customerName: string
  email: string
  phone: string
  projectType: string
  budgetDkk: number
  location: string
  source: string
  notes: string
}
