/**
 * Builds the system prompt injected into every Claude request.
 * Aggregates cross-module data so Claude has full situational awareness
 * of the founder's operating system: work hierarchy, tasks, calendar,
 * memory, and Gmail.
 */

export interface TaskSnapshot {
  id: string
  title: string
  status: string
  priority: number
  dueDate?: string
  projectId?: string
  dependsOnTaskIds?: string[]
  tags?: string[]
}

export interface EventSnapshot {
  id: string
  title: string
  type: string
  startDate: string
  endDate?: string
  location?: string
}

export interface MemorySnapshot {
  text: string
  tags: string[]
  emotion: string
  timestamp: string
}

export interface GmailSnapshot {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  labelIds?: string[]
}

export interface InitiativeSnapshot {
  id: string
  name: string
  description?: string
  status: string
}

export interface ProjectSnapshot {
  id: string
  initiativeId: string
  name: string
  description?: string
  status: string
}

export interface ModuleContext {
  tasks?: TaskSnapshot[]
  upcomingEvents?: EventSnapshot[]
  recentMemories?: MemorySnapshot[]
  gmailMessages?: GmailSnapshot[]
  initiatives?: InitiativeSnapshot[]
  projects?: ProjectSnapshot[]
}

export function buildSystemPrompt(userId: string, moduleContext: ModuleContext): string {
  const now = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  })

  const sections: string[] = []

  sections.push(`You are Dash — the AI brain of a founder's operating system.

You have full visibility across every module: work hierarchy (initiatives → projects → tasks), calendar, Gmail, finances, health, social, goals, and long-term memory. Your job is to help the founder think clearly, move fast, and stay on top of everything at once.

Current date/time: ${now}

Capabilities:
- Navigate and reason across the full Initiative → Project → Task hierarchy
- Cross-reference deadlines, events, and emails to surface conflicts or priorities
- Identify blocked tasks (dependency graph) and suggest unblocking actions
- Connect Gmail threads to active projects and tasks
- Remember past context and connect it to present decisions
- Think like a chief of staff: proactive, structured, decisive

Tone: Direct. No filler. Lead with the answer or next action. When the user asks a cross-module question, synthesize — don't list everything, surface what matters.`)

  // Work Hierarchy: Initiatives → Projects
  if (
    (moduleContext.initiatives && moduleContext.initiatives.length > 0) ||
    (moduleContext.projects && moduleContext.projects.length > 0)
  ) {
    const initiatives = moduleContext.initiatives ?? []
    const projects = moduleContext.projects ?? []

    let hierSection = `## Work Hierarchy\n`

    initiatives.forEach((ini) => {
      const iniProjects = projects.filter((p) => p.initiativeId === ini.id)
      hierSection += `\n### [${ini.status.toUpperCase()}] ${ini.name}${ini.description ? ` — ${ini.description}` : ""}\n`
      if (iniProjects.length === 0) {
        hierSection += `  (no projects yet)\n`
      } else {
        iniProjects.forEach((p) => {
          const taskCount = (moduleContext.tasks ?? []).filter((t) => t.projectId === p.id).length
          const openCount = (moduleContext.tasks ?? []).filter(
            (t) => t.projectId === p.id && (t.status === "pending" || t.status === "in-progress"),
          ).length
          hierSection += `  · [${p.status}] ${p.name}${p.description ? ` — ${p.description}` : ""} | ${openCount}/${taskCount} tasks open\n`
        })
      }
    })

    sections.push(hierSection)
  }

  // Tasks
  if (moduleContext.tasks && moduleContext.tasks.length > 0) {
    const projects = moduleContext.projects ?? []
    const projectName = (id?: string) => projects.find((p) => p.id === id)?.name

    const pending = moduleContext.tasks.filter((t) => t.status === "pending" || t.status === "in-progress")
    const overdue = pending.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())
    const dueToday = pending.filter((t) => {
      if (!t.dueDate) return false
      return new Date(t.dueDate).toDateString() === new Date().toDateString()
    })
    const upcoming = pending
      .filter((t) => t.dueDate && new Date(t.dueDate) > new Date())
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 10)
    const unscheduled = pending.filter((t) => !t.dueDate).slice(0, 8)

    let taskSection = `## Tasks (${pending.length} open)\n`

    if (overdue.length > 0) {
      taskSection += `\n### OVERDUE\n`
      overdue.forEach((t) => {
        const proj = projectName(t.projectId)
        taskSection += `- ${t.title} | P${t.priority} | Due: ${t.dueDate}${proj ? ` | ${proj}` : ""} | ${t.status}\n`
      })
    }

    if (dueToday.length > 0) {
      taskSection += `\n### Due Today\n`
      dueToday.forEach((t) => {
        const proj = projectName(t.projectId)
        taskSection += `- ${t.title} | P${t.priority}${proj ? ` | ${proj}` : ""}\n`
      })
    }

    if (upcoming.length > 0) {
      taskSection += `\n### Upcoming\n`
      upcoming.forEach((t) => {
        const proj = projectName(t.projectId)
        taskSection += `- ${t.title} | P${t.priority} | Due: ${t.dueDate}${proj ? ` | ${proj}` : ""}\n`
      })
    }

    if (unscheduled.length > 0) {
      taskSection += `\n### No due date\n`
      unscheduled.forEach((t) => {
        const proj = projectName(t.projectId)
        taskSection += `- ${t.title} | P${t.priority}${proj ? ` | ${proj}` : ""}\n`
      })
    }

    sections.push(taskSection)
  }

  // Calendar
  if (moduleContext.upcomingEvents && moduleContext.upcomingEvents.length > 0) {
    let calSection = `## Calendar (next ${moduleContext.upcomingEvents.length} events)\n`
    moduleContext.upcomingEvents.slice(0, 8).forEach((e) => {
      const start = new Date(e.startDate).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      calSection += `- ${e.title} | ${e.type} | ${start}${e.location ? ` @ ${e.location}` : ""}\n`
    })
    sections.push(calSection)
  }

  // Memory
  if (moduleContext.recentMemories && moduleContext.recentMemories.length > 0) {
    let memSection = `## Memory (recent)\n`
    moduleContext.recentMemories.slice(0, 5).forEach((m) => {
      memSection += `- [${m.emotion}] ${m.text.slice(0, 200)}${m.text.length > 200 ? "…" : ""}\n`
    })
    sections.push(memSection)
  }

  // Gmail
  if (moduleContext.gmailMessages && moduleContext.gmailMessages.length > 0) {
    let gmailSection = `## Gmail (${moduleContext.gmailMessages.length} recent)\n`
    moduleContext.gmailMessages.slice(0, 8).forEach((m) => {
      gmailSection += `- From: ${m.from} | "${m.subject}" | ${m.date}\n`
      if (m.snippet) gmailSection += `  ${m.snippet.slice(0, 120)}…\n`
    })
    sections.push(gmailSection)
  }

  return sections.join("\n\n---\n\n")
}
