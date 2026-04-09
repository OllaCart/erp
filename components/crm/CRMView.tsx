"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  RefreshCw,
  Sparkles,
  Send,
  Search,
  User,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react"
import type { BusinessId } from "@/types/db"

interface Contact {
  id: string
  business_id: BusinessId
  ghl_contact_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  contact_type: string
  pipeline_stage: string | null
  last_activity_at: string | null
  notes: string | null
  tags: string[]
  days_in_stage?: number | null
}

interface PipelineColumn {
  stage: string
  contacts: Contact[]
  count: number
}

type ViewMode = "pipeline" | "list" | "detail"
type OutreachChannel = "email" | "sms"

const BUSINESSES: { id: BusinessId; label: string; dot: string }[] = [
  { id: "swiftfi",         label: "SwiftFi",        dot: "bg-blue-500" },
  { id: "unbeatableloans", label: "UnbeatableLoans", dot: "bg-amber-500" },
  { id: "ollacart",        label: "OllaCart",        dot: "bg-orange-500" },
]

const STAGE_AGE_COLOR = (days: number | null | undefined) => {
  if (days == null) return "border-zinc-200"
  if (days <= 7) return "border-green-300"
  if (days <= 14) return "border-amber-300"
  return "border-red-300"
}

const TYPE_BADGE: Record<string, string> = {
  lead:     "bg-blue-100 text-blue-700",
  customer: "bg-green-100 text-green-700",
  partner:  "bg-purple-100 text-purple-700",
  investor: "bg-amber-100 text-amber-700",
}

function timeAgo(iso: string | null) {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "today"
  if (d === 1) return "1d ago"
  return `${d}d ago`
}

export function CRMView() {
  const [activeBiz, setActiveBiz] = useState<BusinessId>("swiftfi")
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline")
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [draft, setDraft] = useState("")
  const [draftChannel, setDraftChannel] = useState<OutreachChannel>("email")
  const [draftSubject, setDraftSubject] = useState("")
  const [sendSuccess, setSendSuccess] = useState(false)

  const fetchPipeline = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/crm/pipeline?business_id=${activeBiz}`)
      const data = await res.json()
      setColumns(data.columns ?? [])
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }, [activeBiz])

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ business_id: activeBiz, limit: "200" })
      if (search) params.set("search", search)
      const res = await fetch(`/api/crm/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts ?? [])
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }, [activeBiz, search])

  useEffect(() => {
    if (viewMode === "pipeline") fetchPipeline()
    else if (viewMode === "list") fetchContacts()
  }, [viewMode, fetchPipeline, fetchContacts])

  async function handleSelectContact(contact: Contact) {
    setSelectedContact(contact)
    setDraft("")
    setSendSuccess(false)
    setRecommendation(null)
    setViewMode("detail")

    // Load detail + recommendation
    const res = await fetch(`/api/crm/contacts/${contact.id}`)
    const data = await res.json()
    setRecommendation(data.recommendation ?? null)
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      await fetch("/api/crm/sync", { method: "POST" })
      if (viewMode === "pipeline") fetchPipeline()
      else fetchContacts()
    } finally { setIsSyncing(false) }
  }

  async function handleDraft() {
    if (!selectedContact) return
    setIsDrafting(true)
    setDraft("")
    try {
      const res = await fetch("/api/crm/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          contact_id: selectedContact.id,
          channel: draftChannel,
        }),
      })
      const data = await res.json()
      setDraft(data.draft ?? "")
    } finally { setIsDrafting(false) }
  }

  async function handleSend() {
    if (!selectedContact || !draft.trim()) return
    setIsSending(true)
    try {
      const res = await fetch("/api/crm/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          contact_id: selectedContact.id,
          channel: draftChannel,
          message: draft,
          subject: draftSubject || undefined,
        }),
      })
      if (res.ok) {
        setSendSuccess(true)
        setDraft("")
      }
    } finally { setIsSending(false) }
  }

  async function handleMoveStage(contact: Contact, newStage: string) {
    await fetch(`/api/crm/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_stage: newStage }),
    })
    setSelectedContact((c) => c ? { ...c, pipeline_stage: newStage } : c)
    fetchPipeline()
  }

  const contactName = (c: Contact) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unknown"

  return (
    <div className="flex flex-col h-full">
      {/* Business tabs + controls */}
      <div className="p-4 border-b flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {BUSINESSES.map((biz) => (
            <button
              key={biz.id}
              onClick={() => { setActiveBiz(biz.id); setSelectedContact(null); setViewMode("pipeline") }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeBiz === biz.id ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${biz.dot}`} />
              {biz.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto">
          {(["pipeline", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setViewMode(v); setSelectedContact(null) }}
              className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${
                viewMode === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Sync GHL
        </Button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* ── Pipeline kanban ────────────────────────────────────────── */}
        {viewMode === "pipeline" && (
          <div className="flex-1 overflow-x-auto p-4">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="flex gap-3 h-full min-w-max">
                {columns.map((col) => (
                  <div key={col.stage} className="w-56 flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.stage}</span>
                      <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">{col.count}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] bg-muted/20 rounded-lg p-2">
                      {col.contacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleSelectContact(contact)}
                          className={`w-full text-left bg-card border-l-2 rounded-md p-2.5 shadow-sm hover:shadow-md transition-all ${STAGE_AGE_COLOR(contact.days_in_stage)}`}
                        >
                          <p className="text-xs font-medium truncate">{contactName(contact)}</p>
                          {contact.company && (
                            <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`text-xs px-1 py-0.5 rounded font-medium ${TYPE_BADGE[contact.contact_type] ?? TYPE_BADGE.lead}`}>
                              {contact.contact_type}
                            </span>
                            {contact.days_in_stage != null && (
                              <span className="text-xs text-muted-foreground">{contact.days_in_stage}d</span>
                            )}
                          </div>
                        </button>
                      ))}
                      {col.contacts.length === 0 && (
                        <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Contact list ───────────────────────────────────────────── */}
        {viewMode === "list" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No contacts. Sync GHL to import.</p>
            ) : (
              <div className="space-y-1">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contactName(contact)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.company ?? contact.email ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {contact.pipeline_stage && (
                        <span className="text-xs text-muted-foreground">{contact.pipeline_stage}</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_BADGE[contact.contact_type] ?? TYPE_BADGE.lead}`}>
                        {contact.contact_type}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(contact.last_activity_at)}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Contact detail panel ───────────────────────────────────── */}
        {viewMode === "detail" && selectedContact && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl">
            <button
              onClick={() => setViewMode("pipeline")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />Back to pipeline
            </button>

            {/* Contact info */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{contactName(selectedContact)}</h3>
                  {selectedContact.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3.5 w-3.5" />{selectedContact.company}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${TYPE_BADGE[selectedContact.contact_type] ?? TYPE_BADGE.lead}`}>
                  {selectedContact.contact_type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {selectedContact.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{selectedContact.email}</span>
                  </div>
                )}
                {selectedContact.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{selectedContact.phone}</span>
                  </div>
                )}
              </div>

              {/* Stage */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Pipeline stage</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(columns.length > 0 ? columns.map((c) => c.stage) : [selectedContact.pipeline_stage]).filter(Boolean).map((stage) => (
                    <button
                      key={stage}
                      onClick={() => stage && handleMoveStage(selectedContact, stage)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                        selectedContact.pipeline_stage === stage
                          ? "bg-foreground text-background border-foreground"
                          : "border-muted-foreground/20 hover:border-foreground/40"
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Last activity: {timeAgo(selectedContact.last_activity_at)}
              </p>

              {selectedContact.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedContact.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Claude recommendation */}
            {recommendation && (
              <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">{recommendation}</p>
              </div>
            )}

            {/* Outreach composer */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Outreach</h4>
                <div className="flex gap-1">
                  {(["email", "sms"] as OutreachChannel[]).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setDraftChannel(ch)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        draftChannel === ch ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {draftChannel === "email" && (
                <Input
                  placeholder="Subject line..."
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  className="h-8 text-sm"
                />
              )}

              <Textarea
                placeholder={`Write your ${draftChannel} message, or let Claude draft one...`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={`text-sm resize-none ${draftChannel === "sms" ? "min-h-[80px]" : "min-h-[120px]"}`}
              />

              {draftChannel === "sms" && (
                <p className={`text-xs ${draft.length > 160 ? "text-red-500" : "text-muted-foreground"}`}>
                  {draft.length}/160 chars
                </p>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={handleDraft} disabled={isDrafting}>
                  {isDrafting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {draft ? "Regenerate" : "Draft with Claude"}
                </Button>

                <div className="flex items-center gap-2">
                  {sendSuccess && (
                    <span className="text-xs text-green-600">Sent via GHL</span>
                  )}
                  {draft && (
                    <Button
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                      onClick={handleSend}
                      disabled={isSending || !selectedContact.ghl_contact_id}
                      title={!selectedContact.ghl_contact_id ? "Contact not linked to GHL" : undefined}
                    >
                      {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Send via GHL
                    </Button>
                  )}
                </div>
              </div>

              {!selectedContact.ghl_contact_id && (
                <p className="text-xs text-muted-foreground">
                  This contact is not yet linked to GHL. Sync to enable sending.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
