"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { TickerTodoStore, type TickerTodoItem } from "@/lib/ticker-todos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon } from "lucide-react"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const raw = params?.id
  const decodedId = typeof raw === "string" ? decodeURIComponent(raw) : ""
  const [todo, setTodo] = useState<TickerTodoItem | null | undefined>(undefined)
  const [newTitle, setNewTitle] = useState("")

  const reload = () => {
    setTodo(TickerTodoStore.getById(decodedId) ?? null)
  }

  useEffect(() => {
    if (!decodedId) return
    reload()
    window.addEventListener("wayward-ticker-todos-changed", reload)
    return () => window.removeEventListener("wayward-ticker-todos-changed", reload)
  }, [decodedId])

  if (todo === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (todo === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">This to-do was not found.</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{todo.title}</CardTitle>
            <CardDescription>Project page for this ticker to-do. Subtasks sync with the bottom bar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Subtasks</h3>
              <ul className="space-y-3">
                {todo.subtasks.map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={s.done}
                      onCheckedChange={() => {
                        TickerTodoStore.toggleSubtask(todo.id, s.id)
                        reload()
                      }}
                    />
                    <span className={s.done ? "line-through text-muted-foreground" : ""}>{s.title}</span>
                  </li>
                ))}
                {todo.subtasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No subtasks yet. Add one below.</p>
                )}
              </ul>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const t = newTitle.trim()
                if (!t) return
                TickerTodoStore.addSubtask(todo.id, t)
                setNewTitle("")
                reload()
              }}
            >
              <Input
                placeholder="New subtask…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
