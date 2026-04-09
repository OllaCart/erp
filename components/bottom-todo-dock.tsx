"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMessages } from "@/context/message-context"
import { TickerTodoStore, TICKER_SEED_ITEMS, type TickerTodoItem } from "@/lib/ticker-todos"
import {
  dispatchWaywardNavigate,
  dispatchChatStartListening,
} from "@/lib/wayward-shell-events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  MessageCircleIcon,
  ListTodoIcon,
  ChevronRightIcon,
  Mic,
  Volume2,
  ChevronsUpDown,
} from "lucide-react"

/**
 * Global AI dock: chat preview, quick open Chat, mic (→ Chat + listen), Voice tab, optional todo ticker.
 */
export const BottomTodoDock: React.FC = () => {
  const router = useRouter()
  const { messages } = useMessages()
  const [todos, setTodos] = useState<TickerTodoItem[]>(TICKER_SEED_ITEMS)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [newSub, setNewSub] = useState<Record<string, string>>({})
  const [tickerOpen, setTickerOpen] = useState(false)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<number | null>(null)

  const reload = useCallback(() => {
    setTodos(TickerTodoStore.getAll())
  }, [])

  useEffect(() => {
    reload()
    window.addEventListener("wayward-ticker-todos-changed", reload)
    return () => window.removeEventListener("wayward-ticker-todos-changed", reload)
  }, [reload])

  const lastAssistant = [...messages].reverse().find((m) => m.sender === "assistant")
  const preview = lastAssistant?.text?.trim() ? lastAssistant.text : "Tap to open Chat or use the mic…"

  const openChat = () => dispatchWaywardNavigate("chat")

  const openChatAndListen = () => {
    dispatchWaywardNavigate("chat")
    window.setTimeout(() => dispatchChatStartListening(), 150)
  }

  const openVoiceTab = () => dispatchWaywardNavigate("dash")

  const onTodoClick = (id: string) => {
    dispatchWaywardNavigate("tasks")
    router.push(`/project/${encodeURIComponent(id)}`)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const el = mobileScrollRef.current
    if (!el || touchStart.current == null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    el.scrollBy({ left: -dx * 1.2, behavior: "smooth" })
  }

  const addSub = (todoId: string) => {
    const t = newSub[todoId]?.trim()
    if (!t) return
    TickerTodoStore.addSubtask(todoId, t)
    setNewSub((s) => ({ ...s, [todoId]: "" }))
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex flex-col items-stretch gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      {/* AI strip: preview + actions */}
      <div className="pointer-events-auto max-w-4xl mx-auto w-full flex flex-col gap-2">
        <button
          type="button"
          onClick={openChat}
          className="rounded-2xl border border-white/25 dark:border-white/10 px-3 py-2.5 shadow-lg backdrop-blur-2xl bg-gradient-to-br from-white/40 via-white/15 to-white/5 dark:from-white/10 dark:via-white/5 dark:to-black/20 text-foreground/90 flex items-start gap-3 ring-1 ring-black/5 dark:ring-white/10 text-left w-full transition-opacity hover:opacity-95"
          style={{
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          <div className="mt-0.5 rounded-full bg-primary/15 p-1.5 shrink-0">
            <MessageCircleIcon className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm leading-snug line-clamp-2 min-h-[2.5rem] flex-1">{preview}</p>
        </button>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button type="button" size="sm" variant="secondary" className="pointer-events-auto" onClick={openChat}>
            <MessageCircleIcon className="h-4 w-4 mr-1.5" />
            Chat
          </Button>
          <Button type="button" size="sm" variant="default" className="pointer-events-auto" onClick={openChatAndListen}>
            <Mic className="h-4 w-4 mr-1.5" />
            Mic
          </Button>
          <Button type="button" size="sm" variant="outline" className="pointer-events-auto" onClick={openVoiceTab}>
            <Volume2 className="h-4 w-4 mr-1.5" />
            Voice
          </Button>
        </div>
      </div>

      {/* Todo ticker — collapsible so it does not compete with voice on mobile */}
      <Collapsible
        open={tickerOpen}
        onOpenChange={setTickerOpen}
        className="pointer-events-auto max-w-4xl mx-auto w-full rounded-t-xl border border-border/80 bg-background/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.12)] dark:bg-background/95 ring-1 ring-black/5 dark:ring-white/10"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left border-b border-border/50 rounded-t-xl hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <ListTodoIcon className="h-4 w-4" />
              Todos
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="md:hidden relative py-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
            {todos.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-2 px-4">
                No ticker to-dos — sample data on first visit. Open Tasks for real work.
              </p>
            ) : (
              <>
                <div
                  ref={mobileScrollRef}
                  className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-3 pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ WebkitOverflowScrolling: "touch" }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {todos.map((todo) => (
                    <button
                      key={todo.id}
                      type="button"
                      onClick={() => onTodoClick(todo.id)}
                      className="snap-start shrink-0 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium whitespace-nowrap active:scale-95 transition-transform"
                    >
                      {todo.title}
                      <ChevronRightIcon className="inline h-3 w-3 ml-1 opacity-60" />
                    </button>
                  ))}
                </div>
                <div className="overflow-hidden border-t border-border/30 mt-1 pt-1">
                  <div className="animate-marquee-ticker">
                    {[...todos, ...todos].map((todo, i) => (
                      <span
                        key={`marq-${todo.id}-${i}`}
                        className="inline-flex items-center mx-8 text-[11px] font-mono text-muted-foreground whitespace-nowrap"
                      >
                        {todo.title} · {todo.subtasks.filter((s) => !s.done).length} open
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div
            ref={desktopScrollRef}
            className="hidden md:flex items-stretch gap-2 px-2 py-2 overflow-x-auto"
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => {
              const el = desktopScrollRef.current
              if (!el || touchStart.current == null) return
              const dx = e.changedTouches[0].clientX - touchStart.current
              touchStart.current = null
              el.scrollBy({ left: -dx * 1.2, behavior: "smooth" })
            }}
          >
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="relative shrink-0 group"
                onMouseEnter={() => setHoverId(todo.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <button
                  type="button"
                  onClick={() => onTodoClick(todo.id)}
                  className="px-4 py-2 rounded-xl bg-muted/80 hover:bg-muted border border-transparent hover:border-primary/30 text-sm font-medium whitespace-nowrap transition-colors"
                >
                  {todo.title}
                </button>

                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl border bg-popover text-popover-foreground shadow-xl p-3 z-[60] transition-all duration-150 ${
                    hoverId === todo.id
                      ? "opacity-100 visible translate-y-0"
                      : "opacity-0 invisible translate-y-1 pointer-events-none"
                  }`}
                  onMouseEnter={() => setHoverId(todo.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Subtasks</p>
                  <ScrollArea className="max-h-32 pr-2">
                    <ul className="space-y-2">
                      {todo.subtasks.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-sm">
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
                    </ul>
                  </ScrollArea>
                  <div className="flex gap-1 mt-2 pt-2 border-t">
                    <Input
                      placeholder="Add subtask…"
                      value={newSub[todo.id] ?? ""}
                      onChange={(e) => setNewSub((x) => ({ ...x, [todo.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addSub(todo.id)}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" className="h-8 shrink-0" type="button" onClick={() => addSub(todo.id)}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
