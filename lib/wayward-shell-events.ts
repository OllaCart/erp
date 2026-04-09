/**
 * Custom events for the tabbed shell + global AI dock + chat.
 * Dispatched on `window`.
 */

export const WAYWARD_NAVIGATE_EVENT = "wayward-navigate"

export interface WaywardNavigateDetail {
  tab: string
}

/** Switch to Chat and optionally start mic capture (handled by ChatInput). */
export const WAYWARD_CHAT_START_LISTENING_EVENT = "wayward-chat-start-listening"

export function dispatchWaywardNavigate(tab: string): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<WaywardNavigateDetail>(WAYWARD_NAVIGATE_EVENT, {
      detail: { tab },
    }),
  )
}

export function dispatchChatStartListening(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(WAYWARD_CHAT_START_LISTENING_EVENT))
}
