import { useEffect, useState } from 'react'
import { LeadAccordionTable } from './LeadAccordionTable'
import { loadLeadPage } from '../lib/dashboard'
import { leadStatuses, type Lead, type LeadListFilters, type LeadPage, type LeadStatus } from '../types/dashboard'

const PAGE_SIZE = 25
const sources = ['Google', 'Facebook', 'Referral', 'Website', 'Instagram', 'Partner']
const projectTypes = ['Bathroom', 'Kitchen', 'Flooring', 'Painting', 'Full renovation']

export function AllLeadsView({ onBack, onStatusUpdated }: { onBack: () => void; onStatusUpdated: (leadId: string, status: LeadStatus) => void }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<LeadListFilters>({ status: '', source: '', projectType: '' })
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LeadPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      loadLeadPage({ page, pageSize: PAGE_SIZE, search, filters })
        .then((data) => { if (active) setResult(data) })
        .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Leads could not be loaded.') })
        .finally(() => { if (active) setLoading(false) })
    }, 180)
    return () => { active = false; window.clearTimeout(timer) }
  }, [page, search, filters, reloadKey])

  const updateFilter = (field: keyof LeadListFilters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }))
    setPage(1)
    setExpandedLeadId(null)
  }
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE))
  const updateStatus = (leadId: string, status: LeadStatus) => {
    setResult((current) => current ? { ...current, leads: current.leads.map((lead): Lead => lead.lead_id === leadId ? { ...lead, status } : lead) } : current)
    onStatusUpdated(leadId, status)
    setReloadKey((current) => current + 1)
  }

  return (
    <section className="all-leads-view">
      <div className="all-leads-heading"><div><p className="eyebrow">Lead management</p><h2>All leads</h2><p className="subtitle">Search and manage enquiries across your pipeline.</p></div><button className="secondary-button" type="button" onClick={onBack}>Back to overview</button></div>
      <div className="lead-list-filters">
        <label className="lead-search">Search leads<input type="search" placeholder="Name, email, or lead ID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setExpandedLeadId(null) }} /></label>
        <label>Status<select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option>{leadStatuses.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Source<select value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}><option value="">All sources</option>{sources.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Project type<select value={filters.projectType} onChange={(event) => updateFilter('projectType', event.target.value)}><option value="">All project types</option>{projectTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      {error && <div className="error-state" role="alert"><p>{error}</p><button className="secondary-button" type="button" onClick={() => setReloadKey((current) => current + 1)}>Try again</button></div>}
      <div className="empty-panel all-leads-panel">
        <div className="results-caption">{loading ? 'Loading leads…' : `${result?.total.toLocaleString('en-DK') ?? 0} leads found`}</div>
        {loading ? <div className="kpi-card skeleton list-skeleton" aria-label="Loading leads" /> : !error && result && <LeadAccordionTable leads={result.leads} expandedLeadId={expandedLeadId} onToggle={(id) => setExpandedLeadId((current) => current === id ? null : id)} onStatusUpdated={updateStatus} emptyMessage="No leads match these search and filter settings." />}
        {result && result.total > 0 && <div className="pagination"><span>Page {page} of {totalPages}</span><div><button className="secondary-button" type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button><button className="secondary-button" type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}
      </div>
    </section>
  )
}
