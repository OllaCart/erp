"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  RefreshCw,
  Sparkles,
  Send,
  CheckCheck,
  AlertCircle,
  ChevronLeft,
  Clock,
  User,
  Inbox,
} from "lucide-react"
import type { BusinessId } from "@/types/db"

interface Ticket {
  id: string
  business_id: BusinessId
  ticket_number: string
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed"
  priority: "urgent" | "high" | "normal" | "low"
  category: string | null
  customer_email: string
  customer_name: string | null
  subject: string
  first_message: string | null
  claude_diagnosis: string | null
  sentiment: "positive" | "neutral" | "frustrated" | "angry" | null
  first_response_at: string | null
  resolved_at: string | null
  created_at: string
}

interface TicketMessage {
  id: string
  direction: "inbound" | "outbound"
  from_address: string | null
  body: string | null
  claude_draft: boolean
  sent_at: string
}

interface Metrics {
  open: number
  urgent: number
  resolved_today: number
}

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  normal: "bg-zinc-100 text-zinc-600 border-zinc-200",
  low:    "bg-zinc-50 text-zinc-400 border-zinc-100",
}

const STATUS_BADGE: Record<string, string> = {
  open:        "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting:     "bg-purple-100 text-purple-700",
  resolved:    "bg-green-100 text-green-700",
  closed:      "bg-zinc-100 text-zinc-500",
}

const SENTIMENT_ICON: Record<string, string> = {
  positive:   "😊",
  neutral:    "😐",
  frustrated: "😤",
  angry:      "😡",
}

const BUSINESS_BADGE: Record<BusinessId, string> = {
  swiftfi:         "bg-blue-100 text-blue-700",
  unbeatableloans: "bg-amber-100 text-amber-700",
  ollacart:        "bg-orange-100 text-orange-700",
  personal:        "bg-zinc-100 text-zinc-600",
}

const BUSINESSES: { id: BusinessId | "all"; label: string }[] = [
  { id: "all",            label: "All" },
  { id: "swiftfi",        label: "SwiftFi" },
  { id: "unbeatableloans",label: "UnbeatableLoans" },
  { id: "ollacart",       label: "OllaCart" },
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function SupportView() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ open: 0, urgent: 0, resolved_today: 0 })
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [activeBiz, setActiveBiz] = useState<BusinessId | "all">("all")
  const [activeStatus, setActiveStatus] = useState<string>("open")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [draftReply, setDraftReply] = useState("")
  const [sendSuccess, setSendSuccess] = useState(false)
  const [view, setView] = useState<"list" | "detail">("list")

  const fetchTickets = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (activeBiz !== "all") params.set("business_id", activeBiz)
      if (activeStatus !== "all") params.set("status", activeStatus)
      const res = await fetch(`/api/support/tickets?${params}`)
      const data = await res.json()
      setTickets(data.tickets ?? [])
      setMetrics(data.metrics ?? { open: 0, urgent: 0, resolved_today: 0 })
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }, [activeBiz, activeStatus])

  const fetchTicketDetail = useCallback(async (ticketId: string) => {
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`)
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch { /* silent */ }
    finally { setIsLoadingMessages(false) }
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  async function handleSelectTicket(ticket: Ticket) {
    setSelectedTicket(ticket)
    setDraftReply("")
    setSendSuccess(false)
    setView("detail")
    await fetchTicketDetail(ticket.id)
  }

  async function handleDraftReply() {
    if (!selectedTicket) return
    setIsDrafting(true)
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/draft-reply`, {
        method: "POST",
      })
      const data = await res.json()
      setDraftReply(data.draft ?? "")
    } finally { setIsDrafting(false) }
  }

  async function handleSendReply() {
    if (!selectedTicket || !draftReply.trim()) return
    setIsSending(true)
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draftReply }),
      })
      if (res.ok) {
        setSendSuccess(true)
        setDraftReply("")
        await fetchTicketDetail(selectedTicket.id)
        await fetchTickets()
      }
    } finally { setIsSending(false) }
  }

  async function handleUpdateStatus(status: string) {
    if (!selectedTicket) return
    await fetch(`/api/support/tickets/${selectedTicket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setSelectedTicket((t) => t ? { ...t, status: status as Ticket["status"] } : t)
    fetchTickets()
  }

  const urgentTickets = tickets.filter((t) => t.priority === "urgent")

  return (
    <div className="flex h-full">
      {/* ── Left: ticket list ─────────────────────────────────────── */}
      <div className={`w-80 shrink-0 border-r flex flex-col ${view === "detail" ? "hidden md:flex" : "flex flex-1 md:flex-none"}`}>
        {/* Metrics bar */}
        <div className="p-3 border-b grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold">{metrics.open}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${metrics.urgent > 0 ? "text-red-600" : ""}`}>{metrics.urgent}</p>
            <p className="text-xs text-muted-foreground">Urgent</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{metrics.resolved_today}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-2 border-b space-y-1.5">
          <div className="flex gap-1 flex-wrap">
            {BUSINESSES.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBiz(b.id as BusinessId | "all")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  activeBiz === b.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {["open", "in_progress", "waiting", "resolved", "all"].map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  activeStatus === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Urgent alert */}
        {urgentTickets.length > 0 && (
          <div className="mx-2 mt-2 p-2 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            <span className="text-xs text-red-700 font-medium">{urgentTickets.length} urgent ticket{urgentTickets.length !== 1 ? "s" : ""} need attention</span>
          </div>
        )}

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-30" />
              <p className="text-sm">No tickets</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                className={`w-full text-left px-3 py-3 border-b hover:bg-accent/50 transition-colors ${
                  selectedTicket?.id === ticket.id ? "bg-accent" : ""
                } ${ticket.priority === "urgent" ? "border-l-2 border-l-red-500" : ""}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                  <div className="flex items-center gap-1">
                    {ticket.sentiment && (
                      <span className="text-xs">{SENTIMENT_ICON[ticket.sentiment]}</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[ticket.status]}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium truncate">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ticket.customer_name ?? ticket.customer_email}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-1 py-0.5 rounded font-medium ${BUSINESS_BADGE[ticket.business_id]}`}>
                    {ticket.business_id === "unbeatableloans" ? "UBL" : ticket.business_id}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_BADGE[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />{timeAgo(ticket.created_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs h-7" onClick={fetchTickets}>
            <RefreshCw className="h-3 w-3" />Refresh
          </Button>
        </div>
      </div>

      {/* ── Right: ticket detail ──────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${view === "list" && !selectedTicket ? "hidden md:flex" : "flex"}`}>
        {!selectedTicket ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Inbox className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select a ticket to view</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b space-y-2">
              <div className="flex items-start gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden shrink-0"
                  onClick={() => { setView("list"); setSelectedTicket(null) }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{selectedTicket.ticket_number}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[selectedTicket.status]}`}>
                      {selectedTicket.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_BADGE[selectedTicket.priority]}`}>
                      {selectedTicket.priority}
                    </span>
                    {selectedTicket.sentiment && (
                      <span className="text-xs">{SENTIMENT_ICON[selectedTicket.sentiment]} {selectedTicket.sentiment}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mt-1">{selectedTicket.subject}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3" />
                    {selectedTicket.customer_name ?? selectedTicket.customer_email}
                    {selectedTicket.customer_name && ` · ${selectedTicket.customer_email}`}
                  </p>
                </div>
                {/* Quick actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {selectedTicket.status !== "resolved" && (
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                      onClick={() => handleUpdateStatus("resolved")}>
                      <CheckCheck className="h-3 w-3" />Resolve
                    </Button>
                  )}
                  {selectedTicket.status !== "waiting" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => handleUpdateStatus("waiting")}>
                      Waiting
                    </Button>
                  )}
                  {selectedTicket.priority !== "urgent" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={async () => {
                        await fetch(`/api/support/tickets/${selectedTicket.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ priority: "urgent" }),
                        })
                        setSelectedTicket((t) => t ? { ...t, priority: "urgent" } : t)
                        fetchTickets()
                      }}>
                      Escalate
                    </Button>
                  )}
                </div>
              </div>

              {/* Claude diagnosis */}
              {selectedTicket.claude_diagnosis && (
                <div className="rounded-md bg-muted px-3 py-2 flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">{selectedTicket.claude_diagnosis}</p>
                </div>
              )}
            </div>

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingMessages ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {selectedTicket.first_message ?? "(no messages)"}
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.direction === "outbound"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-xs mt-1 ${msg.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {timeAgo(msg.sent_at)}
                        {msg.claude_draft && " · Claude draft"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply composer */}
            <div className="border-t p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Reply to {selectedTicket.customer_email}</span>
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs"
                  onClick={handleDraftReply} disabled={isDrafting}>
                  {isDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {draftReply ? "Regenerate" : "Draft with Claude"}
                </Button>
              </div>
              <Textarea
                placeholder="Write your reply..."
                value={draftReply}
                onChange={(e) => setDraftReply(e.target.value)}
                className="min-h-[100px] text-sm resize-none"
              />
              <div className="flex items-center justify-between">
                {sendSuccess && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCheck className="h-3.5 w-3.5" />Reply sent
                  </span>
                )}
                <Button size="sm" className="gap-1.5 ml-auto"
                  onClick={handleSendReply}
                  disabled={!draftReply.trim() || isSending}>
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send Reply
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
