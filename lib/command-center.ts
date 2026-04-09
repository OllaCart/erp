/**
 * Machine-readable bridge between Dash (Claude) and the tabbed ERP shell.
 * Assistant appends a block the client parses, strips from the bubble, and executes.
 */

export const WAYWARD_CMD_START = "[[WAYWARD_CMDS]]"
export const WAYWARD_CMD_END = "[[/WAYWARD_CMDS]]"

/** Tab `value`s from app/page.tsx — keep in sync when adding tabs */
export const WAYWARD_TAB_IDS = [
  "home",
  "dash",
  "chat",
  "tasks",
  "calendar",
  "financial",
  "memory",
  "social",
  "health",
  "goals",
  "knowledge",
  "email",
  "dev",
  "support",
  "crm",
  "accounts",
  "settings",
] as const

export type WaywardTabId = (typeof WAYWARD_TAB_IDS)[number]

export interface NavigateCommand {
  type: "navigate"
  tab: WaywardTabId
}

export type WaywardCommand = NavigateCommand

export function isWaywardTabId(tab: string): tab is WaywardTabId {
  return (WAYWARD_TAB_IDS as readonly string[]).includes(tab)
}

/** Map older Claude outputs to current tab ids. */
export function normalizeLegacyNavigateTab(tab: string): string {
  if (tab === "voice") return "dash"
  return tab
}

export function parseWaywardCommandBlock(text: string): {
  commands: WaywardCommand[]
  visibleText: string
} {
  const start = text.indexOf(WAYWARD_CMD_START)
  const end = text.indexOf(WAYWARD_CMD_END)
  if (start === -1 || end === -1 || end <= start) {
    return { commands: [], visibleText: text.trimEnd() }
  }

  const jsonStr = text.slice(start + WAYWARD_CMD_START.length, end).trim()
  const commands: WaywardCommand[] = []
  try {
    const parsed = JSON.parse(jsonStr) as unknown
    if (!Array.isArray(parsed)) {
      return {
        commands: [],
        visibleText: (text.slice(0, start) + text.slice(end + WAYWARD_CMD_END.length)).trimEnd(),
      }
    }
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        (item as { type?: string }).type === "navigate" &&
        typeof (item as { tab?: string }).tab === "string"
      ) {
        const rawTab = (item as { tab: string }).tab
        const tab = normalizeLegacyNavigateTab(rawTab)
        if (isWaywardTabId(tab)) {
          commands.push({ type: "navigate", tab })
        }
      }
    }
  } catch {
    // ignore malformed JSON
  }

  const visibleText = (text.slice(0, start) + text.slice(end + WAYWARD_CMD_END.length)).trimEnd()
  return { commands, visibleText }
}

/** Prompt fragment appended to Claude system context */
export const COMMAND_CENTER_SYSTEM_APPENDIX = `
--- COMMAND CENTER (UI control) ---
The user works inside a tabbed web app. When they ask to open, go to, or show a specific module (e.g. "open tasks", "show email inbox", "go to settings"), you MUST append this exact block AFTER your normal reply (user-facing text first, then the block on its own lines):

${WAYWARD_CMD_START}
[{"type":"navigate","tab":"TAB_ID"}]
${WAYWARD_CMD_END}

Replace TAB_ID with one of: home, dash (Voice tab), chat, tasks, calendar, financial, memory, social, health, goals, knowledge, email, dev, support, crm, accounts, settings.
You may include multiple objects in the array if multiple navigations are needed (rare). Do not explain the block to the user; they will not see it.
`.trim()
