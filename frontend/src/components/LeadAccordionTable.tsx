import { Fragment } from 'react'
import { LeadDetail } from './LeadDetail'
import type { Lead, LeadStatus } from '../types/dashboard'

const dateFormatter = new Intl.DateTimeFormat('en-DK', { dateStyle: 'medium', timeZone: 'Europe/Copenhagen' })
const currencyFormatter = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 })

type LeadAccordionTableProps = {
  leads: Lead[]
  expandedLeadId: string | null
  onToggle: (leadId: string) => void
  onStatusUpdated: (leadId: string, status: LeadStatus) => void
  emptyMessage: string
}

export function LeadAccordionTable({ leads, expandedLeadId, onToggle, onStatusUpdated, emptyMessage }: LeadAccordionTableProps) {
  if (leads.length === 0) return <p>{emptyMessage}</p>

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Customer</th><th>Project</th><th>Budget</th><th>Source</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>
          {leads.map((lead) => {
            const expanded = expandedLeadId === lead.lead_id
            const detailId = `lead-details-${lead.lead_id}`
            return (
              <Fragment key={lead.lead_id}>
                <tr className="lead-row">
                  <td className="customer-cell"><button className="lead-expand-button" type="button" aria-expanded={expanded} aria-controls={expanded ? detailId : undefined} onClick={() => onToggle(lead.lead_id)}>{lead.customer_name}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button></td><td>{lead.project_type}</td><td>{currencyFormatter.format(lead.budget_dkk)}</td><td>{lead.source}</td><td><span className={`status status-${lead.status.toLowerCase()}`}>{lead.status}</span></td><td>{dateFormatter.format(new Date(lead.created_at))}</td>
                </tr>
                {expanded && <tr className="lead-expanded-row" id={detailId}><td colSpan={6}><LeadDetail lead={lead} onStatusUpdated={onStatusUpdated} /></td></tr>}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
