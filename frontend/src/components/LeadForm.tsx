import { useRef, useState, type FormEvent } from 'react'
import { createLead } from '../lib/dashboard'
import type { NewLeadInput } from '../types/dashboard'

const projectTypes = ['Bathroom', 'Kitchen', 'Flooring', 'Painting', 'Full renovation']
const sources = ['Google', 'Facebook', 'Referral', 'Website', 'Instagram', 'Partner']
const initialForm: NewLeadInput = { customerName: '', email: '', phone: '', projectType: '', budgetDkk: 0, location: '', source: '', notes: '' }
type ErrorKey = 'customerName' | 'email' | 'projectType' | 'budgetDkk' | 'location' | 'source'
type FieldErrors = Partial<Record<ErrorKey, string>>

export function LeadForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const fieldRefs = useRef<Partial<Record<ErrorKey, HTMLElement | null>>>({})

  const update = (field: keyof NewLeadInput, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (field in fieldErrors) setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    setSuccess(false)
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    const errors: FieldErrors = {}
    if (!form.customerName.trim()) errors.customerName = 'Customer name is required.'
    if (!emailIsValid) errors.email = 'Enter a valid email address.'
    if (!form.projectType) errors.projectType = 'Select a project type.'
    if (!Number.isFinite(form.budgetDkk) || form.budgetDkk <= 0) errors.budgetDkk = 'Enter a budget greater than 0 DKK.'
    if (!form.location.trim()) errors.location = 'Location is required.'
    if (!form.source) errors.source = 'Select a source.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstInvalid = (['customerName', 'email', 'projectType', 'budgetDkk', 'location', 'source'] as ErrorKey[]).find((field) => errors[field])
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus()
      return
    }
    setSaving(true)
    try {
      await createLead({ ...form, customerName: form.customerName.trim(), email: form.email.trim(), location: form.location.trim() })
      setForm(initialForm)
      setFieldErrors({})
      setSuccess(true)
      onCreated()
    } catch (submissionError: unknown) {
      setSubmitError(submissionError instanceof Error ? submissionError.message : 'The enquiry could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="lead-form-panel">
      <div className="form-heading"><div><p className="eyebrow">New enquiry</p><h2>Add a lead</h2><p className="subtitle">Capture a customer enquiry and add it to the pipeline.</p></div></div>
      <form className="lead-form" onSubmit={submit} noValidate>
        <label>Customer name *<input ref={(element) => { fieldRefs.current.customerName = element }} className={fieldErrors.customerName ? 'field-invalid' : ''} aria-invalid={Boolean(fieldErrors.customerName)} aria-describedby={fieldErrors.customerName ? 'customerName-error' : undefined} required value={form.customerName} onChange={(event) => update('customerName', event.target.value)} />{fieldErrors.customerName && <span className="field-error" id="customerName-error">{fieldErrors.customerName}</span>}</label>
        <label>Email *<input ref={(element) => { fieldRefs.current.email = element }} className={fieldErrors.email ? 'field-invalid' : ''} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />{fieldErrors.email && <span className="field-error" id="email-error">{fieldErrors.email}</span>}</label>
        <label>Phone <input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
        <label>Project type *<select ref={(element) => { fieldRefs.current.projectType = element }} className={fieldErrors.projectType ? 'field-invalid' : ''} aria-invalid={Boolean(fieldErrors.projectType)} aria-describedby={fieldErrors.projectType ? 'projectType-error' : undefined} required value={form.projectType} onChange={(event) => update('projectType', event.target.value)}><option value="">Select a project</option>{projectTypes.map((value) => <option key={value}>{value}</option>)}</select>{fieldErrors.projectType && <span className="field-error" id="projectType-error">{fieldErrors.projectType}</span>}</label>
        <label>Budget (DKK) *<input ref={(element) => { fieldRefs.current.budgetDkk = element }} className={fieldErrors.budgetDkk ? 'field-invalid' : ''} aria-invalid={Boolean(fieldErrors.budgetDkk)} aria-describedby={fieldErrors.budgetDkk ? 'budgetDkk-error' : undefined} required min="1" step="1" type="number" value={form.budgetDkk || ''} onChange={(event) => update('budgetDkk', Number(event.target.value))} />{fieldErrors.budgetDkk && <span className="field-error" id="budgetDkk-error">{fieldErrors.budgetDkk}</span>}</label>
        <label>Location *<input ref={(element) => { fieldRefs.current.location = element }} className={fieldErrors.location ? 'field-invalid' : ''} aria-invalid={Boolean(fieldErrors.location)} aria-describedby={fieldErrors.location ? 'location-error' : undefined} required value={form.location} onChange={(event) => update('location', event.target.value)} />{fieldErrors.location && <span className="field-error" id="location-error">{fieldErrors.location}</span>}</label>
        <label>Source *<select ref={(element) => { fieldRefs.current.source = element }} className={fieldErrors.source ? 'field-invalid' : ''} aria-invalid={Boolean(fieldErrors.source)} aria-describedby={fieldErrors.source ? 'source-error' : undefined} required value={form.source} onChange={(event) => update('source', event.target.value)}><option value="">Select a source</option>{sources.map((value) => <option key={value}>{value}</option>)}</select>{fieldErrors.source && <span className="field-error" id="source-error">{fieldErrors.source}</span>}</label>
        <label className="wide-field">Notes <textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label>
        <div className="form-actions"><button className="refresh-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save enquiry'}</button>{success && <span className="success-message">Enquiry saved and dashboard refreshed.</span>}{submitError && <span className="form-error" role="alert">{submitError}</span>}</div>
      </form>
    </section>
  )
}
