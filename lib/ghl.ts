/**
 * /lib/ghl.ts
 * GoHighLevel API client — Agency token pattern.
 *
 * Auth model:
 *   - Single agency-level access token (GHL_ACCESS_TOKEN)
 *   - Each business maps to a GHL Location (sub-account) via its locationId
 *   - All requests use the agency token + locationId to target the right sub-account
 *
 * API: GHL v2 — https://services.leadconnectorhq.com
 * Docs: https://highlevel.stoplight.io/docs/integrations
 */

export type GhlBusinessId = "swiftfi" | "unbeatableloans" | "ollacart"

const GHL_BASE = "https://services.leadconnectorhq.com"
const GHL_VERSION = "2021-07-28"

function getAgencyToken(): string | null {
  return process.env.GHL_ACCESS_TOKEN ?? null
}

/** Returns the GHL location ID for a given business */
function getLocationId(businessId: string): string | null {
  const map: Record<string, string | undefined> = {
    swiftfi:         process.env.GHL_LOCATION_ID_SWIFTFI,
    unbeatableloans: process.env.GHL_LOCATION_ID_UNBEATABLELOANS,
    ollacart:        process.env.GHL_LOCATION_ID_OLLACART,
  }
  return map[businessId] ?? null
}

async function ghlFetch(
  businessId: string,
  path: string,
  options: RequestInit = {},
  extraParams: Record<string, string> = {},
): Promise<Response> {
  const token = getAgencyToken()
  if (!token) throw new Error("GHL_ACCESS_TOKEN not configured")

  const locationId = getLocationId(businessId)
  if (!locationId) throw new Error(`No GHL location ID configured for business: ${businessId}`)

  // Inject locationId into query string for GET requests, body for mutations
  let url = `${GHL_BASE}${path}`
  const method = (options.method ?? "GET").toUpperCase()

  if (method === "GET") {
    const qs = new URLSearchParams({ locationId, ...extraParams })
    url = `${url}${path.includes("?") ? "&" : "?"}${qs}`
  }

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Version: GHL_VERSION,
      ...(options.headers ?? {}),
    },
  })
}

/** Injects locationId into a JSON body for POST/PUT requests */
function withLocation(businessId: string, body: Record<string, unknown>): string {
  const locationId = getLocationId(businessId)
  return JSON.stringify({ ...body, locationId })
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GhlContact {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  companyName?: string
  locationId?: string
  tags?: string[]
  source?: string
  dateAdded?: string
  lastActivity?: string
  customField?: Array<{ id: string; value: string }>
}

export interface GhlOpportunity {
  id: string
  name?: string
  contactId?: string
  pipelineId?: string
  pipelineStageId?: string
  status?: string
  monetaryValue?: number
}

export interface GhlPipelineStage {
  id: string
  name: string
}

export interface GhlPipeline {
  id: string
  name: string
  stages: GhlPipelineStage[]
}

// ── Contacts ───────────────────────────────────────────────────────────────────

export async function listContacts(
  businessId: string,
  params: { limit?: number; startAfter?: string; query?: string } = {},
): Promise<GhlContact[]> {
  const qs: Record<string, string> = { limit: String(params.limit ?? 100) }
  if (params.startAfter) qs.startAfter = params.startAfter
  if (params.query) qs.query = params.query

  const res = await ghlFetch(businessId, "/contacts/", {}, qs)
  if (!res.ok) return []
  const data = await res.json() as { contacts?: GhlContact[] }
  return data.contacts ?? []
}

export async function getContact(businessId: string, contactId: string): Promise<GhlContact | null> {
  const res = await ghlFetch(businessId, `/contacts/${contactId}`)
  if (!res.ok) return null
  const data = await res.json() as { contact?: GhlContact }
  return data.contact ?? null
}

export async function createContact(
  businessId: string,
  contact: Partial<GhlContact>,
): Promise<GhlContact | null> {
  const res = await ghlFetch(businessId, "/contacts/", {
    method: "POST",
    body: withLocation(businessId, contact as Record<string, unknown>),
  })
  if (!res.ok) return null
  const data = await res.json() as { contact?: GhlContact }
  return data.contact ?? null
}

export async function updateContact(
  businessId: string,
  contactId: string,
  updates: Partial<GhlContact>,
): Promise<boolean> {
  const res = await ghlFetch(businessId, `/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  })
  return res.ok
}

export async function getContactActivity(
  businessId: string,
  contactId: string,
): Promise<unknown[]> {
  const res = await ghlFetch(businessId, `/contacts/${contactId}/activity`)
  if (!res.ok) return []
  const data = await res.json() as { events?: unknown[] }
  return data.events ?? []
}

// ── Pipeline ───────────────────────────────────────────────────────────────────

export async function listPipelines(businessId: string): Promise<GhlPipeline[]> {
  const res = await ghlFetch(businessId, "/opportunities/pipelines")
  if (!res.ok) return []
  const data = await res.json() as { pipelines?: GhlPipeline[] }
  return data.pipelines ?? []
}

export async function listOpportunities(
  businessId: string,
  pipelineId?: string,
): Promise<GhlOpportunity[]> {
  const qs: Record<string, string> = { limit: "100" }
  if (pipelineId) qs.pipelineId = pipelineId

  const res = await ghlFetch(businessId, "/opportunities/search", {}, qs)
  if (!res.ok) return []
  const data = await res.json() as { opportunities?: GhlOpportunity[] }
  return data.opportunities ?? []
}

export async function updateOpportunityStage(
  businessId: string,
  opportunityId: string,
  pipelineStageId: string,
): Promise<boolean> {
  const res = await ghlFetch(businessId, `/opportunities/${opportunityId}`, {
    method: "PUT",
    body: JSON.stringify({ pipelineStageId }),
  })
  return res.ok
}

// ── Conversations / Outreach ───────────────────────────────────────────────────

export type OutreachChannel = "email" | "sms"

export interface OutreachMessage {
  contactId: string
  type: OutreachChannel
  subject?: string
  message: string
  html?: string
}

export async function sendOutreach(
  businessId: string,
  payload: OutreachMessage,
): Promise<{ ok: boolean; error?: string }> {
  const locationId = getLocationId(businessId)
  if (!locationId) return { ok: false, error: `No location ID for ${businessId}` }

  const body = {
    type: payload.type === "email" ? "Email" : "SMS",
    contactId: payload.contactId,
    locationId,
    message: payload.message,
    ...(payload.type === "email" && payload.subject ? { subject: payload.subject } : {}),
    ...(payload.html ? { html: payload.html } : {}),
  }

  const res = await ghlFetch(businessId, "/conversations/messages", {
    method: "POST",
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    return { ok: false, error: err.message ?? `GHL API ${res.status}` }
  }

  return { ok: true }
}

// ── Workflow trigger ────────────────────────────────────────────────────────────

export async function triggerWorkflow(
  businessId: string,
  workflowId: string,
  contactId: string,
): Promise<{ ok: boolean; error?: string }> {
  const locationId = getLocationId(businessId)
  if (!locationId) return { ok: false, error: `No location ID for ${businessId}` }

  const res = await ghlFetch(businessId, `/workflows/${workflowId}/subscribe`, {
    method: "POST",
    body: JSON.stringify({ contactId, locationId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    return { ok: false, error: err.message ?? `GHL workflow trigger failed: ${res.status}` }
  }

  return { ok: true }
}

// ── Location info ───────────────────────────────────────────────────────────────

/** Returns the locationId for a business — useful for webhook URLs */
export function getLocationIdForBusiness(businessId: string): string | null {
  return getLocationId(businessId)
}

// ── Default pipeline stages (fallback when GHL not connected) ──────────────────

export const DEFAULT_STAGES: Record<string, string[]> = {
  swiftfi:         ["New Lead", "Contacted", "Demo Scheduled", "Demo Done", "Converted", "Lost"],
  unbeatableloans: ["Inquiry", "Application Started", "Documents Submitted", "Under Review", "Approved", "Funded", "Closed"],
  ollacart:        ["New Lead", "Interested", "Demo Scheduled", "Trial", "Customer", "Churned"],
}
