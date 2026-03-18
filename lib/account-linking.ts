import type { LinkedEmailAddress } from "@/types/erp"

const STORAGE_KEY = "wayward-linked-emails"

type StoredEmail = {
  id: string
  email: string
  verified: boolean
  isPrimary: boolean
  addedAt: string
}

export function generateLinkedEmailId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `lem_${crypto.randomUUID()}`
  }
  return `lem_${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function defaultLinkedEmails(): LinkedEmailAddress[] {
  const now = new Date()
  return [
    {
      id: generateLinkedEmailId(),
      email: "john.doe@example.com",
      verified: true,
      isPrimary: true,
      addedAt: now,
    },
  ]
}

export function loadLinkedEmailsFromStorage(): LinkedEmailAddress[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredEmail[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed.map((row) => ({
      id: row.id,
      email: String(row.email).trim().toLowerCase(),
      verified: Boolean(row.verified),
      isPrimary: Boolean(row.isPrimary),
      addedAt: new Date(row.addedAt),
    }))
  } catch {
    return null
  }
}

export function saveLinkedEmailsToStorage(emails: LinkedEmailAddress[]): void {
  if (typeof window === "undefined") return
  const stored: StoredEmail[] = emails.map((e) => ({
    id: e.id,
    email: e.email.trim().toLowerCase(),
    verified: e.verified,
    isPrimary: e.isPrimary,
    addedAt: e.addedAt.toISOString(),
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function normalizeEmailInput(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  const v = normalizeEmailInput(value)
  if (!v || v.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
