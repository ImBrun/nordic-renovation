import { useEffect, useState } from 'react'
import { updateLeadStatus } from '../lib/dashboard'
import { leadStatuses, type Lead, type LeadStatus } from '../types/dashboard'

const dateFormatter = new Intl.DateTimeFormat('en-DK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Copenhagen' })
const currencyFormatter = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 })

type LeadDetailProps = { lead: Lead; onStatusUpdated: (leadId: string, status: LeadStatus) => void }

export function LeadDetail({ lead, onStatusUpdated }: LeadDetailProps) {
  const [status, setStatus] = useState<LeadStatus>(lead.status as LeadStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setStatus(lead.status as LeadStatus); setError('') }, [lead])

  const saveStatus = async () => {
    if (status === lead.status) return
    setSaving(true)
    setError('')
    try {
      await updateLeadStatus(lead.lead_id, status)
      onStatusUpdated(lead.lead_id, status)
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'The lead status could not be saved.')
    } finally { setSaving(false) }
  }

  return (
    <div className="lead-detail" aria-labelledby={`lead-detail-${lead.lead_id}`}>
      <div className="lead-detail-header"><div><p className="eyebrow">Lead details</p><h3 id={`lead-detail-${lead.lead_id}`}>{lead.customer_name}</h3><p className="muted">{lead.lead_id} · Received {dateFormatter.format(new Date(lead.created_at))}</p></div></div>
      <div className="lead-detail-grid">
        <div><span>Project</span><strong>{lead.project_type}</strong></div><div><span>Budget</span><strong>{currencyFormatter.format(lead.budget_dkk)}</strong></div><div><span>Estimated value</span><strong>{currencyFormatter.format(lead.estimated_value_dkk)}</strong></div><div><span>Source</span><strong>{lead.source}</strong></div><div><span>Email</span><strong><a href={`mailto:${lead.email}`}>{lead.email}</a></strong></div><div><span>Phone</span><strong>{lead.phone ?? 'Not provided'}</strong></div><div className="detail-wide"><span>Location</span><strong>{lead.location}</strong></div><div className="detail-wide"><span>Notes</span><strong>{lead.notes || 'No notes provided.'}</strong></div>
      </div>
      <div className="status-editor"><label htmlFor="lead-status">Lead status</label><div className="status-editor-controls"><select id="lead-status" value={status} disabled={saving} onChange={(event) => setStatus(event.target.value as LeadStatus)}>{leadStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select><button className="refresh-button" type="button" disabled={saving || status === lead.status} onClick={saveStatus}>{saving ? 'Saving…' : 'Save status'}</button></div><p className="muted">Only the lead status can be changed here.</p>{error && <p className="form-error" role="alert">{error}</p>}</div>
    </div>
  )
}
