import { NextResponse } from "next/server"

const GHL_BASE = "https://services.leadconnectorhq.com"
const GHL_VERSION = "2021-07-28"

const BUSINESSES = ["swiftfi", "unbeatableloans", "ollacart"] as const

function getToken() { return process.env.GHL_ACCESS_TOKEN?.trim() ?? null }
function getLocationId(biz: string) {
  const map: Record<string, string | undefined> = {
    swiftfi:         process.env.GHL_LOCATION_ID_SWIFTFI,
    unbeatableloans: process.env.GHL_LOCATION_ID_UNBEATABLELOANS,
    ollacart:        process.env.GHL_LOCATION_ID_OLLACART,
  }
  return map[biz]?.trim() ?? null
}

async function testLocation(token: string, locationId: string) {
  // GET /locations/:id — confirms the token can read this sub-account
  const res = await fetch(`${GHL_BASE}/locations/${locationId}`, {
    headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION },
  })
  const body = await res.json().catch(() => ({})) as Record<string, unknown>
  return { status: res.status, ok: res.ok, body }
}

async function testContacts(token: string, locationId: string) {
  const res = await fetch(
    `${GHL_BASE}/contacts/?locationId=${locationId}&limit=1`,
    { headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION } },
  )
  const body = await res.json().catch(() => ({})) as Record<string, unknown>
  return {
    status: res.status,
    ok: res.ok,
    count: (body.contacts as unknown[])?.length ?? 0,
    error: body.message ?? body.error ?? null,
  }
}

/**
 * GET /api/crm/status
 * Diagnoses the GHL connection — shows exactly what's configured and what works.
 */
export async function GET() {
  const token = getToken()

  const result: Record<string, unknown> = {
    token_configured: !!token,
    token_prefix: token ? token.slice(0, 8) + "..." : null,
    businesses: {} as Record<string, unknown>,
  }

  if (!token) {
    return NextResponse.json({
      ...result,
      error: "GHL_ACCESS_TOKEN is not set in .env.local",
    })
  }

  for (const biz of BUSINESSES) {
    const locationId = getLocationId(biz)
    if (!locationId) {
      (result.businesses as Record<string, unknown>)[biz] = {
        location_id_configured: false,
        error: `GHL_LOCATION_ID_${biz.toUpperCase()} not set`,
      }
      continue
    }

    const [locationTest, contactsTest] = await Promise.allSettled([
      testLocation(token, locationId),
      testContacts(token, locationId),
    ])

    ;(result.businesses as Record<string, unknown>)[biz] = {
      location_id: locationId,
      location_id_configured: true,
      location_test: locationTest.status === "fulfilled" ? locationTest.value : { ok: false, error: String(locationTest.reason) },
      contacts_test: contactsTest.status === "fulfilled" ? contactsTest.value : { ok: false, error: String(contactsTest.reason) },
    }
  }

  return NextResponse.json(result)
}
