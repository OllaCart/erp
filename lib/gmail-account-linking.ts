import type { LinkedGoogleAccount } from "@/types/erp"

const STORAGE_KEY = "wayward-linked-google-accounts"

export const GMAIL_OAUTH_MESSAGE_SOURCE = "wayward-google-oauth" as const

export const GMAIL_LINKED_EVENT = "wayward-gmail-linked" as const

type StoredGoogle = {
  id: string
  googleSub: string
  email: string
  name?: string
  picture?: string
  linkedAt: string
}

export function loadLinkedGoogleAccounts(): LinkedGoogleAccount[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredGoogle[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((row) => ({
      id: row.id,
      googleSub: row.googleSub,
      email: row.email,
      name: row.name,
      picture: row.picture,
      linkedAt: new Date(row.linkedAt),
    }))
  } catch {
    return []
  }
}

export function saveLinkedGoogleAccounts(accounts: LinkedGoogleAccount[]): void {
  if (typeof window === "undefined") return
  const stored: StoredGoogle[] = accounts.map((a) => ({
    id: a.id,
    googleSub: a.googleSub,
    email: a.email,
    name: a.name,
    picture: a.picture,
    linkedAt: a.linkedAt.toISOString(),
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export type GoogleOAuthPayload = {
  email: string
  name?: string
  picture?: string
  googleSub: string
  linkedAt: string
}

export function ingestGoogleOAuthPayload(
  payload: GoogleOAuthPayload,
): { ok: true; duplicate: boolean; account: LinkedGoogleAccount } | { ok: false; reason: "invalid" } {
  const email = String(payload.email || "").trim().toLowerCase()
  const googleSub = String(payload.googleSub || "").trim()
  if (!email || !googleSub) {
    return { ok: false, reason: "invalid" }
  }
  const existing = loadLinkedGoogleAccounts()
  const dup = existing.some((a) => a.googleSub === googleSub)
  if (dup) {
    const account = existing.find((a) => a.googleSub === googleSub)!
    return { ok: true, duplicate: true, account }
  }
  const account: LinkedGoogleAccount = {
    id: `ggo_${googleSub}`,
    googleSub,
    email,
    name: payload.name?.trim() || undefined,
    picture: payload.picture?.trim() || undefined,
    linkedAt: new Date(payload.linkedAt || Date.now()),
  }
  saveLinkedGoogleAccounts([...existing, account])
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GMAIL_LINKED_EVENT, { detail: { account } }))
  }
  return { ok: true, duplicate: false, account }
}

export function removeLinkedGoogleAccount(googleSub: string): void {
  const next = loadLinkedGoogleAccounts().filter((a) => a.googleSub !== googleSub)
  saveLinkedGoogleAccounts(next)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GMAIL_LINKED_EVENT, { detail: { removed: googleSub } }))
  }
}
