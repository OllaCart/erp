import type { Initiative, InitiativeStatus, Project, ProjectStatus, Task, TaskStatus } from "@/types/erp"
import { v4 as uuidv4 } from "uuid"

const STORAGE_KEY = "wayward-work-hierarchy"

export type WorkHierarchyState = {
  initiatives: Initiative[]
  projects: Project[]
  tasks: Task[]
}

type Stored = {
  initiatives: Array<Omit<Initiative, "createdAt"> & { createdAt: string }>
  projects: Array<Omit<Project, "createdAt"> & { createdAt: string }>
  tasks: Array<
    Omit<Task, "dueDate" | "completedDate" | "dependsOnTaskIds"> & {
      dueDate?: string
      completedDate?: string
      dependsOnTaskIds?: string[]
    }
  >
}

function parseStored(raw: string): WorkHierarchyState | null {
  try {
    const s = JSON.parse(raw) as Stored
    if (!s.initiatives || !s.projects || !s.tasks) return null
    return {
      initiatives: s.initiatives.map((i) => ({
        ...i,
        createdAt: new Date(i.createdAt),
      })),
      projects: s.projects.map((p) => ({
        ...p,
        createdAt: new Date(p.createdAt),
      })),
      tasks: s.tasks.map((t) => ({
        ...t,
        dependsOnTaskIds: t.dependsOnTaskIds ?? [],
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        completedDate: t.completedDate ? new Date(t.completedDate) : undefined,
      })),
    }
  } catch {
    return null
  }
}

function serialize(state: WorkHierarchyState): string {
  const s: Stored = {
    initiatives: state.initiatives.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })),
    projects: state.projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    tasks: state.tasks.map((t) => ({
      ...t,
      dependsOnTaskIds: t.dependsOnTaskIds ?? [],
      dueDate: t.dueDate?.toISOString(),
      completedDate: t.completedDate?.toISOString(),
    })),
  }
  return JSON.stringify(s)
}

/** Returns true if dependency graph is a DAG (tasks in same project only). */
export function isValidTaskDAG(tasks: { id: string; dependsOnTaskIds: string[] }[]): boolean {
  const ids = new Set(tasks.map((t) => t.id))
  const indegree = new Map<string, number>()
  for (const id of ids) indegree.set(id, 0)
  const adj = new Map<string, string[]>()
  for (const id of ids) adj.set(id, [])

  for (const t of tasks) {
    for (const d of t.dependsOnTaskIds) {
      if (!ids.has(d) || d === t.id) continue
      indegree.set(t.id, (indegree.get(t.id) ?? 0) + 1)
      adj.get(d)!.push(t.id)
    }
  }

  const q = [...ids].filter((id) => (indegree.get(id) ?? 0) === 0)
  let seen = 0
  while (q.length) {
    const u = q.shift()!
    seen++
    for (const v of adj.get(u) ?? []) {
      indegree.set(v, (indegree.get(v) ?? 1) - 1)
      if (indegree.get(v) === 0) q.push(v)
    }
  }
  return seen === ids.size
}

function defaultSeed(userId: string): WorkHierarchyState {
  const iniId = uuidv4()
  const projA = uuidv4()
  const projB = uuidv4()
  const t1 = uuidv4()
  const t2 = uuidv4()
  const t3 = uuidv4()
  const now = new Date()
  return {
    initiatives: [
      {
        id: iniId,
        userId,
        name: "Product launch 2025",
        description: "Example initiative",
        status: "active" as InitiativeStatus,
        createdAt: now,
      },
    ],
    projects: [
      {
        id: projA,
        userId,
        initiativeId: iniId,
        name: "MVP build",
        status: "active" as ProjectStatus,
        createdAt: now,
      },
      {
        id: projB,
        userId,
        initiativeId: iniId,
        name: "Go-to-market",
        status: "planned" as ProjectStatus,
        createdAt: now,
      },
    ],
    tasks: [
      {
        id: t1,
        userId,
        projectId: projA,
        title: "Design system",
        status: "completed",
        priority: 4,
        dependsOnTaskIds: [],
        completedDate: now,
      },
      {
        id: t2,
        userId,
        projectId: projA,
        title: "Implement core screens",
        status: "in-progress",
        priority: 5,
        dependsOnTaskIds: [t1],
      },
      {
        id: t3,
        userId,
        projectId: projA,
        title: "QA pass",
        status: "pending",
        priority: 3,
        dependsOnTaskIds: [t2],
      },
    ],
  }
}

export function loadWorkHierarchy(userId: string): WorkHierarchyState {
  if (typeof window === "undefined") {
    return { initiatives: [], projects: [], tasks: [] }
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const parsed = parseStored(raw)
    if (parsed) {
      return {
        initiatives: parsed.initiatives.filter((i) => i.userId === userId),
        projects: parsed.projects.filter((p) => p.userId === userId),
        tasks: parsed.tasks.filter((t) => t.userId === userId),
      }
    }
  }
  const seed = defaultSeed(userId)
  saveWorkHierarchy(seed)
  return seed
}

export function saveWorkHierarchy(state: WorkHierarchyState): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, serialize(state))
}

function tasksInProject(state: WorkHierarchyState, projectId: string): Task[] {
  return state.tasks.filter((t) => t.projectId === projectId)
}

export function taskIsBlockedByDependencies(task: Task, allInProject: Task[]): boolean {
  const deps = task.dependsOnTaskIds ?? []
  if (deps.length === 0) return false
  const byId = new Map(allInProject.map((t) => [t.id, t]))
  return deps.some((id) => {
    const d = byId.get(id)
    return !d || d.status !== "completed"
  })
}

export const WorkHierarchyService = {
  getState(userId: string): WorkHierarchyState {
    return loadWorkHierarchy(userId)
  },

  addInitiative(
    userId: string,
    data: { name: string; description?: string; status?: InitiativeStatus },
  ): Initiative {
    const state = loadWorkHierarchy(userId)
    const ini: Initiative = {
      id: uuidv4(),
      userId,
      name: data.name.trim(),
      description: data.description?.trim(),
      status: data.status ?? "planned",
      createdAt: new Date(),
    }
    state.initiatives.push(ini)
    saveWorkHierarchy(state)
    return ini
  },

  addProject(
    userId: string,
    data: { initiativeId: string; name: string; description?: string; status?: ProjectStatus },
  ): Project | null {
    const state = loadWorkHierarchy(userId)
    if (!state.initiatives.some((i) => i.id === data.initiativeId)) return null
    const proj: Project = {
      id: uuidv4(),
      userId,
      initiativeId: data.initiativeId,
      name: data.name.trim(),
      description: data.description?.trim(),
      status: data.status ?? "planned",
      createdAt: new Date(),
    }
    state.projects.push(proj)
    saveWorkHierarchy(state)
    return proj
  },

  addTask(
    userId: string,
    data: {
      projectId: string
      title: string
      description?: string
      priority?: number
      status?: TaskStatus
      dependsOnTaskIds?: string[]
    },
  ): { task: Task | null; error?: string } {
    const state = loadWorkHierarchy(userId)
    const proj = state.projects.find((p) => p.id === data.projectId)
    if (!proj) return { task: null, error: "Project not found" }

    const projectTasks = tasksInProject(state, data.projectId)
    const ids = new Set(projectTasks.map((t) => t.id))
    const deps = (data.dependsOnTaskIds ?? []).filter((d) => ids.has(d) && d !== undefined)
    if (deps.some((d) => !ids.has(d))) return { task: null, error: "Dependencies must be tasks in the same project" }

    const newId = uuidv4()
    const candidate: Task = {
      id: newId,
      userId,
      projectId: data.projectId,
      title: data.title.trim(),
      description: data.description?.trim(),
      status: data.status ?? "pending",
      priority: data.priority ?? 3,
      dependsOnTaskIds: deps,
    }

    const merged = [...projectTasks, { id: newId, dependsOnTaskIds: deps }]
    if (!isValidTaskDAG(merged)) {
      return { task: null, error: "These dependencies would create a cycle" }
    }

    state.tasks.push(candidate)
    saveWorkHierarchy(state)
    return { task: candidate }
  },

  updateTaskStatus(
    userId: string,
    taskId: string,
    status: TaskStatus,
  ): { ok: true; task: Task } | { ok: false; reason: "not_found" | "blocked" } {
    const state = loadWorkHierarchy(userId)
    const idx = state.tasks.findIndex((t) => t.id === taskId)
    if (idx === -1) return { ok: false, reason: "not_found" }
    const t = state.tasks[idx]
    if (status === "in-progress" || status === "completed") {
      if (taskIsBlockedByDependencies(t, tasksInProject(state, t.projectId!))) {
        return { ok: false, reason: "blocked" }
      }
    }
    const updated: Task = {
      ...t,
      status,
      completedDate:
        status === "completed"
          ? new Date()
          : status === "pending" || status === "cancelled"
            ? undefined
            : t.completedDate,
    }
    state.tasks[idx] = updated
    saveWorkHierarchy(state)
    return { ok: true, task: updated }
  },

  setTaskDependencies(
    userId: string,
    taskId: string,
    dependsOnTaskIds: string[],
  ): { ok: boolean; error?: string } {
    const state = loadWorkHierarchy(userId)
    const idx = state.tasks.findIndex((t) => t.id === taskId)
    if (idx === -1) return { ok: false, error: "Task not found" }
    const t = state.tasks[idx]
    const projectId = t.projectId!
    const projectTasks = tasksInProject(state, projectId)
    const ids = new Set(projectTasks.map((x) => x.id))
    const deps = dependsOnTaskIds.filter((d) => ids.has(d) && d !== taskId)
    const merged = projectTasks.map((x) =>
      x.id === taskId ? { id: x.id, dependsOnTaskIds: deps } : { id: x.id, dependsOnTaskIds: x.dependsOnTaskIds ?? [] },
    )
    if (!isValidTaskDAG(merged)) {
      return { ok: false, error: "Dependencies would create a cycle" }
    }
    state.tasks[idx] = { ...t, dependsOnTaskIds: deps }
    saveWorkHierarchy(state)
    return { ok: true }
  },

  deleteTask(userId: string, taskId: string): void {
    const state = loadWorkHierarchy(userId)
    state.tasks = state.tasks
      .filter((t) => t.id !== taskId)
      .map((t) => ({
        ...t,
        dependsOnTaskIds: (t.dependsOnTaskIds ?? []).filter((d) => d !== taskId),
      }))
    saveWorkHierarchy(state)
  },

  deleteProject(userId: string, projectId: string): void {
    const state = loadWorkHierarchy(userId)
    state.tasks = state.tasks.filter((t) => t.projectId !== projectId)
    state.projects = state.projects.filter((p) => p.id !== projectId)
    saveWorkHierarchy(state)
  },

  deleteInitiative(userId: string, initiativeId: string): void {
    const state = loadWorkHierarchy(userId)
    const projIds = new Set(state.projects.filter((p) => p.initiativeId === initiativeId).map((p) => p.id))
    state.tasks = state.tasks.filter((t) => !t.projectId || !projIds.has(t.projectId))
    state.projects = state.projects.filter((p) => p.initiativeId !== initiativeId)
    state.initiatives = state.initiatives.filter((i) => i.id !== initiativeId)
    saveWorkHierarchy(state)
  },
}
