import { useEffect, useState } from 'react'
import { KpiCard } from './components/KpiCard'
import { LeadForm } from './components/LeadForm'
import { Login } from './components/Login'
import { buildDashboardData, loadDashboard } from './lib/dashboard'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import type { DashboardData } from './types/dashboard'

const dateFormatter = new Intl.DateTimeFormat('en-DK', {
  dateStyle: 'medium',
  timeZone: 'Europe/Copenhagen',
})
const currencyFormatter = new Intl.NumberFormat('da-DK', {
  style: 'currency',
  currency: 'DKK',
  maximumFractionDigits: 0,
})

type ViewState =
  | { status: 'loading' }
  | { status: 'ready'; data: DashboardData }
  | { status: 'error'; message: string }

type Filters = { status: string; source: string; projectType: string }

function Breakdown({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((item) => item.count), 1)
  return (
    <section className="breakdown-card">
      <h2>{title}</h2>
      {items.length === 0 ? <p className="muted">No matching leads.</p> : items.map((item) => (
        <div className="breakdown-row" key={item.label}>
          <div className="breakdown-label"><span>{item.label}</span><strong>{item.count}</strong></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(item.count / max) * 100}%` }} /></div>
        </div>
      ))}
    </section>
  )
}

function Dashboard({ onLogout }: { onLogout: () => Promise<void> }) {
  const [viewState, setViewState] = useState<ViewState>({ status: 'loading' })
  const [filters, setFilters] = useState<Filters>({ status: '', source: '', projectType: '' })
  const [showLeadForm, setShowLeadForm] = useState(false)

  const refresh = () => {
    setViewState({ status: 'loading' })
    loadDashboard()
      .then((data) => setViewState({ status: 'ready', data }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'The dashboard could not be loaded.'
        setViewState({ status: 'error', message })
      })
  }

  useEffect(() => {
    refresh()
  }, [])

  const filteredData = viewState.status === 'ready'
    ? buildDashboardData(viewState.data.leads.filter((lead) =>
      (!filters.status || lead.status === filters.status) &&
      (!filters.source || lead.source === filters.source) &&
      (!filters.projectType || lead.project_type === filters.projectType),
    ))
    : null

  const filterOptions = viewState.status === 'ready' ? {
    statuses: [...new Set(viewState.data.leads.map((lead) => lead.status))].sort(),
    sources: [...new Set(viewState.data.leads.map((lead) => lead.source))].sort(),
    projectTypes: [...new Set(viewState.data.leads.map((lead) => lead.project_type))].sort(),
  } : null

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Nordic Renovation dashboard home">
          <span className="brand-mark">NR</span>
          <span>
            <strong>Nordic Renovation</strong>
            <small>Lead Management</small>
          </span>
        </a>
        <span className="demo-badge">Demo data</span>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Lead dashboard</h1>
          <p className="subtitle">A clear view of incoming renovation enquiries and the potential pipeline.</p>
        </div>
        <div className="heading-actions"><button className="secondary-button" type="button" onClick={() => setShowLeadForm((visible) => !visible)}>{showLeadForm ? 'Close form' : 'New enquiry'}</button><button className="refresh-button" type="button" onClick={refresh}>Refresh data</button></div>
        <button className="logout-button" type="button" onClick={onLogout}>Sign out</button>
      </section>

      {viewState.status === 'loading' && (
        <section className="kpi-grid" aria-label="Loading dashboard">
          {[0, 1, 2, 3].map((card) => <div className="kpi-card skeleton" key={card} />)}
        </section>
      )}

      {viewState.status === 'error' && (
        <section className="error-state" role="alert">
          <p className="eyebrow">Connection needed</p>
          <h2>We could not load the dashboard.</h2>
          <p>{viewState.message}</p>
          <button className="refresh-button" type="button" onClick={refresh}>Try again</button>
        </section>
      )}

      {viewState.status === 'ready' && (
        <>
          {showLeadForm && <LeadForm onCreated={() => { setShowLeadForm(false); refresh() }} />}
          <section className="filters" aria-label="Filter leads">
            <span className="filter-label">Filter view</span>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{filterOptions?.statuses.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })}><option value="">All sources</option>{filterOptions?.sources.map((value) => <option key={value}>{value}</option>)}</select>
            <select value={filters.projectType} onChange={(event) => setFilters({ ...filters, projectType: event.target.value })}><option value="">All project types</option>{filterOptions?.projectTypes.map((value) => <option key={value}>{value}</option>)}</select>
            {(filters.status || filters.source || filters.projectType) && <button className="clear-filter" type="button" onClick={() => setFilters({ status: '', source: '', projectType: '' })}>Clear</button>}
          </section>
          <section className="kpi-grid" aria-label="Lead metrics">
            {filteredData?.kpis.map((kpi) => <KpiCard key={kpi.label} kpi={kpi} />)}
          </section>
          <section className="breakdown-grid">
            <Breakdown title="Leads by status" items={filteredData?.breakdowns.byStatus ?? []} />
            <Breakdown title="Leads by source" items={filteredData?.breakdowns.bySource ?? []} />
            <Breakdown title="Leads by project type" items={filteredData?.breakdowns.byProjectType ?? []} />
          </section>
          <section className="empty-panel">
            <p className="eyebrow">Latest activity</p>
            <h2>Recent enquiries</h2>
            {filteredData?.leads.length === 0 ? (
              <p>No leads found in the public leads table yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th><th>Project</th><th>Budget</th><th>Source</th><th>Status</th><th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData?.leads.slice(0, 10).map((lead) => (
                      <tr key={lead.lead_id}>
                        <td className="customer-cell">{lead.customer_name}</td>
                        <td>{lead.project_type}</td>
                        <td>{currencyFormatter.format(lead.budget_dkk)}</td>
                        <td>{lead.source}</td>
                        <td><span className={`status status-${lead.status.toLowerCase()}`}>{lead.status}</span></td>
                        <td>{dateFormatter.format(new Date(lead.created_at))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <main className="app-shell auth-shell"><div className="kpi-card skeleton auth-loading" /></main>
  }

  if (!session) {
    return (
      <main className="app-shell auth-shell">
        <header className="topbar"><a className="brand" href="/" aria-label="Nordic Renovation home"><span className="brand-mark">NR</span><span><strong>Nordic Renovation</strong><small>Lead Management</small></span></a><span className="demo-badge">Demo data</span></header>
        <Login />
        <section className="public-form-shell"><p className="eyebrow">Public enquiry</p><h2>Request a renovation estimate</h2><p className="subtitle">Send an enquiry without signing in. The business team can review it from the dashboard.</p><LeadForm onCreated={() => undefined} /></section>
      </main>
    )
  }

  return <Dashboard onLogout={async () => { await supabase.auth.signOut() }} />
}

export default App
