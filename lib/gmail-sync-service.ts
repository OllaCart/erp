import type { GmailSnapshot } from "./claude-context-builder"

const CACHE_KEY = "wayward-gmail-cache"
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  messages: GmailSnapshot[]
  fetchedAt: number
}

export const GmailSyncService = {
  /**
   * Returns recent Gmail messages for context injection.
   * Uses a 5-minute client-side cache to avoid hammering the API.
   */
  getRecentMessages: async (): Promise<GmailSnapshot[]> => {
    // Check cache first
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        try {
          const cache: CacheEntry = JSON.parse(raw)
          if (Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
            return cache.messages
          }
        } catch {
          // stale cache, ignore
        }
      }
    }

    try {
      const res = await fetch("/api/sync/gmail")
      if (!res.ok) return []

      const data = await res.json()
      const messages: GmailSnapshot[] = data.messages || []

      // Cache the result
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ messages, fetchedAt: Date.now() }),
        )
      }

      return messages
    } catch {
      return []
    }
  },

  /** Clear cache to force a fresh fetch on next call. */
  invalidateCache: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(CACHE_KEY)
    }
  },
}
