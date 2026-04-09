"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  CheckCheck,
  ListTodo,
  ChevronLeft,
  Inbox,
  AlertCircle,
  TrendingUp,
  MessageCircle,
  User,
  Info,
  Shield,
  Plus,
  ChevronDown,
  ChevronRight,
  Unlink,
  Mail,
} from "lucide-react"
import type { BusinessId, EmailCategory } from "@/types/db"

const BUSINESSES: { id: BusinessId; label: string; color: string; dot: string }[] = [
  { id: "swiftfi",         label: "SwiftFi",          color: "text-blue-700",   dot: "bg-blue-500" },
  { id: "unbeatableloans", label: "UnbeatableLoans",   color: "text-amber-700",  dot: "bg-amber-500" },
  { id: "ollacart",        label: "OllaCart",          color: "text-orange-700", dot: "bg-orange-500" },
  { id: "personal",        label: "Personal",          color: "text-zinc-600",   dot: "bg-zinc-400" },
]

interface EmailAccount {
  id: string
  business_id: BusinessId
  email_address: string
  display_name: string | null
  last_synced_at: string | null
  unread_count: number
}

interface Email {
  id: string
  account_id: string
  business_id: BusinessId
  from_address: string | null
  from_name: string | null
  to_addresses: string[] | null
  subject: string | null
  body_plain: string | null
  received_at: string | null
  is_read: boolean
  claude_category: EmailCategory | null
  claude_summary: string | null
  claude_draft_reply: string | null
  task_id: string | null
  email_accounts?: { email_address: string; display_name: string | null; business_id: BusinessId }
}

const CATEGORY_STYLES: Record<EmailCategory, { label: string; color: string; icon: React.ReactNode }> = {
  urgent:       { label: "Urgent",       color: "bg-red-100 text-red-700 border-red-200",       icon: <AlertCircle className="h-3 w-3" /> },
  investor:     { label: "Investor",     color: "bg-purple-100 text-purple-700 border-purple-200", icon: <TrendingUp className="h-3 w-3" /> },
  "reply-needed": { label: "Reply needed", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <MessageCircle className="h-3 w-3" /> },
  customer:     { label: "Customer",     color: "bg-blue-100 text-blue-700 border-blue-200",     icon: <User className="h-3 w-3" /> },
  developer:    { label: "Developer",    color: "bg-teal-100 text-teal-700 border-teal-200",     icon: <Info className="h-3 w-3" /> },
  fyi:          { label: "FYI",          color: "bg-zinc-100 text-zinc-500 border-zinc-200",     icon: <Info className="h-3 w-3" /> },
  spam:         { label: "Spam",         color: "bg-zinc-100 text-zinc-400 border-zinc-200",     icon: <Shield className="h-3 w-3" /> },
}

const BUSINESS_BADGE: Record<BusinessId, string> = {
  swiftfi:          "bg-blue-100 text-blue-700",
  unbeatableloans:  "bg-amber-100 text-amber-700",
  ollacart:         "bg-orange-100 text-orange-700",
  personal:         "bg-zinc-100 text-zinc-600",
}

const CATEGORIES: Array<EmailCategory | "all"> = [
  "all", "urgent", "investor", "reply-needed", "customer", "developer", "fyi", "spam",
]

function timeAgo(iso: string | null) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function InboxView() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | "all">("all")
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | "all">("all")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [draftReply, setDraftReply] = useState("")
  const [isLoadingEmails, setIsLoadingEmails] = useState(true)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [view, setView] = useState<"list" | "detail">("list")
  const [connectingBusiness, setConnectingBusiness] = useState<BusinessId | null>(null)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [oauthEnabled, setOauthEnabled] = useState(false)
  const [expandedBusinesses, setExpandedBusinesses] = useState<Set<BusinessId>>(
    new Set(["swiftfi", "unbeatableloans", "ollacart", "personal"])
  )
  const popupRef = useRef<Window | null>(null)

  const fetchAccounts = useCallback(async () => {
    setIsLoadingAccounts(true)
    try {
      const res = await fetch("/api/email/accounts")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAccounts(data.accounts ?? [])
    } catch {
      // silent
    } finally {
      setIsLoadingAccounts(false)
    }
  }, [])

  const fetchEmails = useCallback(async () => {
    setIsLoadingEmails(true)
    try {
      const params = new URLSearchParams({ limit: "50" })
      if (selectedAccount !== "all") params.set("account_email", selectedAccount)
      if (selectedCategory !== "all") params.set("category", selectedCategory)
      const res = await fetch(`/api/email/list?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEmails(data.emails ?? [])
    } catch {
      // silent
    } finally {
      setIsLoadingEmails(false)
    }
  }, [selectedAccount, selectedCategory])

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch("/api/auth/google/config")
      .then((r) => r.json())
      .then((d) => setOauthEnabled(d.enabled ?? false))
      .catch(() => {})
  }, [])

  // Listen for popup postMessage after OAuth
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.source !== "wayward-google-oauth") return
      setConnectingBusiness(null)
      fetchAccounts()
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [fetchAccounts])

  // Handle ?gmail_linked=1 redirect (non-popup flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("gmail_linked") === "1") {
      fetchAccounts()
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [fetchAccounts])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])
  useEffect(() => { fetchEmails() }, [fetchEmails])

  async function handleSync() {
    setIsSyncing(true)
    try {
      await fetch("/api/email/sync", { method: "POST" })
      await Promise.all([fetchAccounts(), fetchEmails()])
    } finally {
      setIsSyncing(false)
    }
  }

  function handleConnectGmail(businessId: BusinessId) {
    setConnectingBusiness(businessId)
    const url = `/api/auth/google?business_id=${businessId}&popup=1`
    const popup = window.open(url, "gmail-oauth", "width=520,height=640,toolbar=0,menubar=0,location=0")
    popupRef.current = popup
    // Poll for popup close without postMessage (fallback)
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer)
        setConnectingBusiness(null)
        fetchAccounts()
      }
    }, 500)
  }

  function toggleBusiness(id: BusinessId) {
    setExpandedBusinesses((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleUnlink(accountId: string) {
    setUnlinkingId(accountId)
    try {
      await fetch(`/api/email/accounts/${accountId}`, { method: "DELETE" })
      await fetchAccounts()
      if (selectedAccount !== "all") setSelectedAccount("all")
    } finally {
      setUnlinkingId(null)
    }
  }

  async function handleSelectEmail(email: Email) {
    setSelectedEmail(email)
    setDraftReply(email.claude_draft_reply ?? "")
    setSendSuccess(false)
    setView("detail")

    // Mark as read
    if (!email.is_read) {
      await fetch("/api/email/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_ids: [email.id] }),
      })
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, is_read: true } : e))
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === email.account_id ? { ...a, unread_count: Math.max(0, a.unread_count - 1) } : a
        )
      )
    }
  }

  async function handleGenerateDraft() {
    if (!selectedEmail) return
    setIsDrafting(true)
    try {
      const res = await fetch("/api/email/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id: selectedEmail.id }),
      })
      const data = await res.json()
      setDraftReply(data.draft ?? "")
      setSelectedEmail((e) => e ? { ...e, claude_draft_reply: data.draft } : e)
    } finally {
      setIsDrafting(false)
    }
  }

  async function handleSend() {
    if (!selectedEmail || !draftReply.trim()) return
    setIsSending(true)
    try {
      const res = await fetch("/api/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id: selectedEmail.id, body: draftReply }),
      })
      if (res.ok) {
        setSendSuccess(true)
        setDraftReply("")
      }
    } finally {
      setIsSending(false)
    }
  }

  async function handleCreateTask() {
    if (!selectedEmail) return
    setIsCreatingTask(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: selectedEmail.business_id,
          title: `Reply to: ${selectedEmail.subject ?? "(no subject)"}`,
          description: selectedEmail.claude_summary ?? undefined,
          priority: selectedEmail.claude_category === "urgent" ? "urgent"
            : selectedEmail.claude_category === "investor" ? "high" : "medium",
          category: selectedEmail.claude_category === "investor" ? "outreach" : "support",
          source: "email",
          source_id: selectedEmail.id,
        }),
      })
      if (res.ok) {
        const { task } = await res.json()
        setSelectedEmail((e) => e ? { ...e, task_id: task.id } : e)
      }
    } finally {
      setIsCreatingTask(false)
    }
  }

  const totalUnread = accounts.reduce((n, a) => n + a.unread_count, 0)

  return (
    <div className="flex h-full">
      {/* ── Left sidebar: business tree ────────────────────────────── */}
      <div className={`w-60 shrink-0 border-r flex flex-col ${view === "detail" ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <Inbox className="h-4 w-4" /> Inbox
            {totalUnread > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                {totalUnread}
              </span>
            )}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* All accounts shortcut */}
        <button
          className={`px-3 py-2 text-xs text-left flex items-center justify-between hover:bg-accent transition-colors ${selectedAccount === "all" ? "bg-accent font-medium" : "text-muted-foreground"}`}
          onClick={() => setSelectedAccount("all")}
        >
          <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />All accounts</span>
          {totalUnread > 0 && <span className="font-semibold text-primary">{totalUnread}</span>}
        </button>

        {/* Business tree */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingAccounts ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            BUSINESSES.map((biz) => {
              const bizAccounts = accounts.filter((a) => a.business_id === biz.id)
              const bizUnread = bizAccounts.reduce((n, a) => n + a.unread_count, 0)
              const expanded = expandedBusinesses.has(biz.id)

              return (
                <div key={biz.id} className="border-b last:border-0">
                  {/* Business row */}
                  <button
                    onClick={() => toggleBusiness(biz.id)}
                    className="w-full px-3 py-2 flex items-center gap-1.5 hover:bg-accent/50 transition-colors group"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${biz.dot}`} />
                    <span className={`text-xs font-semibold flex-1 text-left ${biz.color}`}>{biz.label}</span>
                    {bizUnread > 0 && (
                      <span className="text-xs font-semibold text-primary mr-1">{bizUnread}</span>
                    )}
                    {expanded
                      ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  </button>

                  {expanded && (
                    <div className="pb-1">
                      {/* Linked accounts */}
                      {bizAccounts.map((account) => (
                        <div
                          key={account.id}
                          className={`group flex items-center gap-1 pl-6 pr-2 py-1.5 hover:bg-accent/50 transition-colors ${
                            selectedAccount === account.email_address ? "bg-accent" : ""
                          }`}
                        >
                          <button
                            className="flex-1 text-left min-w-0"
                            onClick={() => setSelectedAccount(account.email_address)}
                          >
                            <p className="text-xs truncate font-medium">{account.email_address}</p>
                            {account.unread_count > 0 && (
                              <p className="text-xs text-primary font-semibold">{account.unread_count} unread</p>
                            )}
                            {account.last_synced_at && (
                              <p className="text-xs text-muted-foreground">
                                synced {new Date(account.last_synced_at).toLocaleDateString()}
                              </p>
                            )}
                          </button>
                          <button
                            onClick={() => handleUnlink(account.id)}
                            disabled={unlinkingId === account.id}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                            title="Unlink account"
                          >
                            {unlinkingId === account.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Unlink className="h-3 w-3" />}
                          </button>
                        </div>
                      ))}

                      {/* Connect button */}
                      {oauthEnabled && (
                        <button
                          onClick={() => handleConnectGmail(biz.id)}
                          disabled={connectingBusiness === biz.id}
                          className="w-full pl-6 pr-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {connectingBusiness === biz.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Plus className="h-3 w-3" />}
                          Add account
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Category filters */}
        <div className="border-t p-2 space-y-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat ? "bg-accent font-medium" : "hover:bg-accent/50 text-muted-foreground"
              }`}
            >
              {cat !== "all" && CATEGORY_STYLES[cat]?.icon}
              {cat === "all" ? "All categories" : CATEGORY_STYLES[cat]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Center: email list ─────────────────────────────────────── */}
      <div className={`w-80 shrink-0 border-r flex flex-col ${view === "detail" ? "hidden md:flex" : "flex flex-1 md:flex-none"}`}>
        <div className="p-3 border-b text-xs text-muted-foreground font-medium">
          {emails.length} emails {selectedCategory !== "all" ? `· ${selectedCategory}` : ""}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingEmails ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : emails.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">No emails. Try syncing.</p>
          ) : (
            emails.map((email) => {
              const cat = email.claude_category
              const catStyle = cat ? CATEGORY_STYLES[cat] : null
              const isSelected = selectedEmail?.id === email.id

              return (
                <button
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={`w-full text-left px-3 py-3 border-b hover:bg-accent/50 transition-colors ${
                    isSelected ? "bg-accent" : ""
                  } ${!email.is_read ? "bg-muted/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm truncate ${!email.is_read ? "font-semibold" : "font-medium"}`}>
                      {email.from_name ?? email.from_address ?? "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(email.received_at)}</span>
                  </div>
                  <p className="text-xs text-foreground truncate mt-0.5">{email.subject ?? "(no subject)"}</p>
                  {email.claude_summary && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{email.claude_summary}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {catStyle && (
                      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium ${catStyle.color}`}>
                        {catStyle.icon}{catStyle.label}
                      </span>
                    )}
                    <span className={`text-xs px-1 py-0.5 rounded font-medium ${BUSINESS_BADGE[email.business_id]}`}>
                      {email.business_id === "unbeatableloans" ? "UBL" : email.business_id}
                    </span>
                    {email.task_id && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <ListTodo className="h-3 w-3" /> task
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel: email detail + reply ─────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${view === "list" && !selectedEmail ? "hidden md:flex" : "flex"}`}>
        {!selectedEmail ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Inbox className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select an email to read</p>
          </div>
        ) : (
          <>
            {/* Email header */}
            <div className="p-4 border-b">
              <div className="flex items-start gap-2">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 md:hidden shrink-0"
                  onClick={() => { setView("list"); setSelectedEmail(null) }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight">{selectedEmail.subject ?? "(no subject)"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From: {selectedEmail.from_name ?? selectedEmail.from_address}
                    {" · "}{timeAgo(selectedEmail.received_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedEmail.claude_category && (
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium ${CATEGORY_STYLES[selectedEmail.claude_category]?.color}`}>
                      {CATEGORY_STYLES[selectedEmail.claude_category]?.icon}
                      {CATEGORY_STYLES[selectedEmail.claude_category]?.label}
                    </span>
                  )}
                  {/* Create task button */}
                  <Button
                    variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
                    onClick={handleCreateTask}
                    disabled={isCreatingTask || !!selectedEmail.task_id}
                  >
                    {isCreatingTask
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <ListTodo className="h-3 w-3" />}
                    {selectedEmail.task_id ? "Task created" : "Create task"}
                  </Button>
                </div>
              </div>

              {/* Claude summary */}
              {selectedEmail.claude_summary && (
                <div className="mt-3 rounded-md bg-muted px-3 py-2 flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">{selectedEmail.claude_summary}</p>
                </div>
              )}
            </div>

            {/* Email body */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                {selectedEmail.body_plain ?? "(no body)"}
              </p>
            </div>

            {/* Reply composer */}
            <div className="border-t p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Reply from: {accounts.find((a) => a.id === selectedEmail.account_id)?.email_address ?? "…"}
                </span>
                <Button
                  variant="ghost" size="sm" className="gap-1.5 h-7 text-xs"
                  onClick={handleGenerateDraft}
                  disabled={isDrafting}
                >
                  {isDrafting
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Sparkles className="h-3 w-3" />}
                  {draftReply ? "Regenerate" : "Draft with Claude"}
                </Button>
              </div>

              <Textarea
                placeholder="Write your reply, or let Claude draft one above..."
                value={draftReply}
                onChange={(e) => setDraftReply(e.target.value)}
                className="min-h-[120px] text-sm resize-none"
              />

              <div className="flex items-center justify-between">
                {sendSuccess && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCheck className="h-3.5 w-3.5" /> Sent successfully
                  </span>
                )}
                <div className="ml-auto">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={handleSend}
                    disabled={!draftReply.trim() || isSending}
                  >
                    {isSending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Send className="h-3.5 w-3.5" />}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
