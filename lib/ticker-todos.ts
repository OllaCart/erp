import { v4 as uuidv4 } from "uuid"

const STORAGE_KEY = "wayward-ticker-todos"

export interface TickerSubtask {
  id: string
  title: string
  done: boolean
}

export interface TickerTodoItem {
  id: string
  title: string
  subtasks: TickerSubtask[]
  createdAt: string
}

function load(): TickerTodoItem[] {
  if (typeof window === "undefined") return defaultTodos()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultTodos()
    const parsed = JSON.parse(raw) as TickerTodoItem[]
    if (!Array.isArray(parsed)) return defaultTodos()
    return parsed
  } catch {
    return defaultTodos()
  }
}

function save(items: TickerTodoItem[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function defaultTodos(): TickerTodoItem[] {
  const now = new Date().toISOString()
  return [
    {
      id: "td_demo_1",
      title: "Ship MVP",
      createdAt: now,
      subtasks: [
        { id: "st1", title: "QA pass", done: false },
        { id: "st2", title: "Docs", done: false },
      ],
    },
    {
      id: "td_demo_2",
      title: "Review budget",
      createdAt: now,
      subtasks: [{ id: "st3", title: "Export CSV", done: true }],
    },
    {
      id: "td_demo_3",
      title: "Call sponsor",
      createdAt: now,
      subtasks: [],
    },
  ]
}

export const TickerTodoStore = {
  getAll(): TickerTodoItem[] {
    return load()
  },

  getById(id: string): TickerTodoItem | undefined {
    return load().find((t) => t.id === id)
  },

  setAll(items: TickerTodoItem[]) {
    save(items)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wayward-ticker-todos-changed"))
    }
  },

  addTodo(title: string) {
    const items = load()
    const item: TickerTodoItem = {
      id: uuidv4(),
      title: title.trim(),
      subtasks: [],
      createdAt: new Date().toISOString(),
    }
    items.push(item)
    save(items)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wayward-ticker-todos-changed"))
    }
    return item
  },

  addSubtask(todoId: string, title: string) {
    const items = load()
    const t = items.find((x) => x.id === todoId)
    if (!t) return
    t.subtasks.push({ id: uuidv4(), title: title.trim(), done: false })
    save(items)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wayward-ticker-todos-changed"))
    }
  },

  toggleSubtask(todoId: string, subtaskId: string) {
    const items = load()
    const t = items.find((x) => x.id === todoId)
    if (!t) return
    const s = t.subtasks.find((x) => x.id === subtaskId)
    if (s) s.done = !s.done
    save(items)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wayward-ticker-todos-changed"))
    }
  },
}
