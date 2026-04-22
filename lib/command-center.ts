/**
 * Machine-readable bridge between Dash (Claude) and the tabbed ERP shell.
 * Assistant appends a block the client parses, strips from the bubble, and executes.
 */

import type { BusinessId, TaskPriority, TaskCategory, RecurrenceRule } from "@/types/db"

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

export interface CreateTaskCommand {
  type: "create_task"
  title: string
  business_id: BusinessId
  priority?: TaskPriority
  category?: TaskCategory
  due_date?: string           // "YYYY-MM-DD"
  notes?: string
  recurrence_rule?: RecurrenceRule
  recurrence_interval?: number
}

export type WaywardCommand = NavigateCommand | CreateTaskCommand

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
      if (!item || typeof item !== "object") continue
      const cmd = item as Record<string, unknown>

      if (cmd.type === "navigate" && typeof cmd.tab === "string") {
        const tab = normalizeLegacyNavigateTab(cmd.tab)
        if (isWaywardTabId(tab)) {
          commands.push({ type: "navigate", tab })
        }
      }

      if (cmd.type === "create_task" && typeof cmd.title === "string" && typeof cmd.business_id === "string") {
        commands.push({
          type: "create_task",
          title: cmd.title,
          business_id: cmd.business_id as BusinessId,
          priority: (cmd.priority as TaskPriority) ?? "medium",
          category: cmd.category as TaskCategory | undefined,
          due_date: cmd.due_date as string | undefined,
          notes: cmd.notes as string | undefined,
          recurrence_rule: cmd.recurrence_rule as RecurrenceRule | undefined,
          recurrence_interval: typeof cmd.recurrence_interval === "number" ? cmd.recurrence_interval : undefined,
        })
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
--- COMMAND CENTER (UI control + task creation) ---
You work inside a tabbed web app. Append this block AFTER your normal reply when you need to take action. User-facing text comes first; the block is invisible to the user.

${WAYWARD_CMD_START}
[
  {"type":"navigate","tab":"TAB_ID"},
  {
    "type":"create_task",
    "title":"Task title",
    "business_id":"swiftfi|unbeatableloans|ollacart|personal|mortgage|projects",
    "priority":"urgent|high|medium|low",
    "category":"dev|outreach|pitch|support|ops|finance",
    "due_date":"YYYY-MM-DD",
    "notes":"optional notes",
    "recurrence_rule":"daily|weekly|monthly|yearly",
    "recurrence_interval":1
  }
]
${WAYWARD_CMD_END}

RULES:
- Navigate: when user asks to open/go to a module. TAB_IDs: home, dash, chat, tasks, calendar, financial, memory, social, health, goals, knowledge, email, dev, support, crm, accounts, settings.
- Create task: when user asks you to add/create/schedule a task, or when you identify a clear action item from conversation. Include as many create_task objects as needed.
- Business IDs: swiftfi (crypto startup), unbeatableloans (mortgage startup), ollacart (social shopping), personal (personal life), mortgage (day-job at mortgage company), projects (dev/software projects).
- recurrence_rule is optional — only set it if the task is clearly recurring (e.g. "every week", "daily standup").
- omit fields you don't have enough info for.
- You may mix navigate and create_task in the same array.
- Do not explain the block to the user — they will not see it.
`.trim()
