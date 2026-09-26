import { supabase } from './supabase'
import type { DashboardBreakdowns, DashboardData, Lead, NewLeadInput } from '../types/dashboard'

const currencyFormatter = new Intl.NumberFormat('da-DK', {
  style: 'currency', currency: 'DKK', maximumFractionDigits: 0,
})
const percentFormatter = new Intl.NumberFormat('en-DK', {
  style: 'percent', maximumFractionDigits: 1,
})

export function buildDashboardData(leads: Lead[]): DashboardData {
  const totalLeads = leads.length
  const pipelineValue = leads.reduce((sum, lead) => sum + lead.estimated_value_dkk, 0)
  const wonLeads = leads.filter((lead) => lead.status === 'Won').length
  const conversionRate = totalLeads === 0 ? 0 : wonLeads / totalLeads
  const averageProjectValue = totalLeads === 0 ? 0 : pipelineValue / totalLeads

  const countBy = (field: keyof Lead): { label: string; count: number }[] => {
    const counts = new Map<string, number>()
    leads.forEach((lead) => counts.set(String(lead[field]), (counts.get(String(lead[field])) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
  }
  const breakdowns: DashboardBreakdowns = {
    byStatus: countBy('status'),
    bySource: countBy('source'),
    byProjectType: countBy('project_type'),
  }

  return {
    metrics: { totalLeads, pipelineValue, conversionRate, averageProjectValue },
    kpis: [
      { label: 'Total leads', value: totalLeads.toLocaleString('en-DK'), detail: 'Matching enquiries' },
      { label: 'Pipeline value', value: currencyFormatter.format(pipelineValue), detail: 'Estimated project value' },
      { label: 'Conversion rate', value: percentFormatter.format(conversionRate), detail: `${wonLeads} won leads` },
      { label: 'Average project', value: currencyFormatter.format(averageProjectValue), detail: 'Average estimated value' },
    ],
    leads,
    breakdowns,
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  const { data, error } = await supabase
    .from('leads')
    .select('lead_id, customer_name, project_type, budget_dkk, estimated_value_dkk, source, status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const leads: Lead[] = (data ?? []).map((row) => ({
    ...row,
    budget_dkk: Number(row.budget_dkk),
    estimated_value_dkk: Number(row.estimated_value_dkk),
  })) as Lead[]
  return buildDashboardData(leads)
}

export async function createLead(input: NewLeadInput): Promise<void> {
  const { error } = await supabase.from('leads').insert({
    customer_name: input.customerName,
    email: input.email,
    phone: input.phone || null,
    project_type: input.projectType,
    budget_dkk: input.budgetDkk,
    location: input.location,
    source: input.source,
    notes: input.notes || null,
  })

  if (error) throw new Error(error.message)
}
