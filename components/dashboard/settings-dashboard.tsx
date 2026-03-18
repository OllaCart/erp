"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IntegrationsDashboard } from "./integrations-dashboard"
import { ContextVisualization } from "./context-visualization"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import type { LinkedEmailAddress } from "@/types/erp"
import {
  defaultLinkedEmails,
  loadLinkedEmailsFromStorage,
  saveLinkedEmailsToStorage,
  normalizeEmailInput,
  isValidEmail,
  generateLinkedEmailId,
} from "@/lib/account-linking"
import type { LinkedGoogleAccount } from "@/types/erp"
import {
  loadLinkedGoogleAccounts,
  removeLinkedGoogleAccount,
  GMAIL_LINKED_EVENT,
} from "@/lib/gmail-account-linking"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  NetworkIcon,
  LinkIcon,
  UserIcon,
  BellIcon,
  PaletteIcon,
  ShieldIcon,
  MailIcon,
  PlusIcon,
  Trash2Icon,
  StarIcon,
  SendIcon,
  Loader2Icon,
} from "lucide-react"

export const SettingsDashboard: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      taskReminders: true,
      goalUpdates: true,
      financialAlerts: true,
    },
    privacy: {
      profilePublic: false,
      shareProgress: true,
      allowAIAnalysis: true,
    },
    preferences: {
      theme: "system",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/dd/yyyy",
    },
  })

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }))
  }

  const [linkedEmails, setLinkedEmails] = useState<LinkedEmailAddress[]>([])
  const [linkedEmailsReady, setLinkedEmailsReady] = useState(false)
  const [newEmail, setNewEmail] = useState("")

  useEffect(() => {
    const stored = loadLinkedEmailsFromStorage()
    setLinkedEmails(stored?.length ? stored : defaultLinkedEmails())
    setLinkedEmailsReady(true)
  }, [])

  useEffect(() => {
    if (!linkedEmailsReady) return
    saveLinkedEmailsToStorage(linkedEmails)
  }, [linkedEmails, linkedEmailsReady])

  const addLinkedEmail = useCallback(() => {
    const normalized = normalizeEmailInput(newEmail)
    if (!isValidEmail(normalized)) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address.",
        variant: "destructive",
      })
      return
    }
    if (linkedEmails.some((e) => e.email === normalized)) {
      toast({
        title: "Already linked",
        description: "That address is already on your account.",
        variant: "destructive",
      })
      return
    }
    const entry: LinkedEmailAddress = {
      id: generateLinkedEmailId(),
      email: normalized,
      verified: false,
      isPrimary: false,
      addedAt: new Date(),
    }
    setLinkedEmails((prev) => [...prev, entry])
    setNewEmail("")
    toast({
      title: "Verification required",
      description: `We sent a confirmation link to ${normalized}. Open it to finish linking.`,
    })
  }, [newEmail, linkedEmails])

  const removeLinkedEmail = useCallback((id: string) => {
    let blocked = false
    setLinkedEmails((prev) => {
      if (prev.length <= 1) {
        blocked = true
        return prev
      }
      const target = prev.find((e) => e.id === id)
      if (!target) return prev
      const next = prev.filter((e) => e.id !== id)
      if (target.isPrimary && next.length > 0) {
        return next.map((e, i) => ({ ...e, isPrimary: i === 0 }))
      }
      return next
    })
    if (blocked) {
      toast({
        title: "Can't remove",
        description: "Keep at least one email on your account.",
        variant: "destructive",
      })
    }
  }, [])

  const setPrimaryEmail = useCallback((id: string) => {
    setLinkedEmails((prev) =>
      prev.map((e) => ({
        ...e,
        isPrimary: e.id === id,
      })),
    )
    toast({ title: "Primary email updated", description: "Sign-in and receipts will use this address." })
  }, [])

  const resendVerification = useCallback((email: string) => {
    toast({
      title: "Link sent",
      description: `Another confirmation email was sent to ${email}.`,
    })
  }, [])

  const [settingsMainTab, setSettingsMainTab] = useState("profile")
  useEffect(() => {
    if (typeof window === "undefined") return
    if (sessionStorage.getItem("wayward-settings-tab") === "accounts") {
      sessionStorage.removeItem("wayward-settings-tab")
      setSettingsMainTab("accounts")
    }
    const onGmailLinked = () => setSettingsMainTab("accounts")
    window.addEventListener("wayward-open-linked-accounts", onGmailLinked)
    return () => window.removeEventListener("wayward-open-linked-accounts", onGmailLinked)
  }, [])

  const [linkedGoogle, setLinkedGoogle] = useState<LinkedGoogleAccount[]>([])
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false)
  const [googleConfigLoaded, setGoogleConfigLoaded] = useState(false)

  useEffect(() => {
    setLinkedGoogle(loadLinkedGoogleAccounts())
    const refresh = () => setLinkedGoogle(loadLinkedGoogleAccounts())
    window.addEventListener(GMAIL_LINKED_EVENT, refresh)
    return () => window.removeEventListener(GMAIL_LINKED_EVENT, refresh)
  }, [])

  useEffect(() => {
    fetch("/api/auth/google/config")
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setGoogleOAuthEnabled(Boolean(d.enabled)))
      .catch(() => setGoogleOAuthEnabled(false))
      .finally(() => setGoogleConfigLoaded(true))
  }, [])

  const linkGmail = useCallback(() => {
    if (!googleOAuthEnabled) {
      toast({
        title: "Google OAuth not configured",
        description: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local. See SETUP.md.",
        variant: "destructive",
      })
      return
    }
    const url = `${window.location.origin}/api/auth/google?popup=1`
    const popup = window.open(url, "wayward-gmail-oauth", "width=520,height=640,scrollbars=yes")
    if (!popup) {
      window.location.href = `${window.location.origin}/api/auth/google`
    }
  }, [googleOAuthEnabled])

  const unlinkGmail = useCallback((googleSub: string) => {
    removeLinkedGoogleAccount(googleSub)
    setLinkedGoogle(loadLinkedGoogleAccounts())
    toast({ title: "Gmail disconnected", description: "You can link it again anytime." })
  }, [])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Settings & Personalization
          </CardTitle>
          <CardDescription>Customize your personal ERP experience</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <Tabs
            value={settingsMainTab}
            onValueChange={setSettingsMainTab}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <TabsList className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1 w-full h-auto py-1">
              <TabsTrigger value="profile" className="flex items-center">
                <UserIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center">
                <BellIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center">
                <ShieldIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center">
                <PaletteIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="contexts" className="flex items-center">
                <NetworkIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Contexts</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center">
                <LinkIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Integrations</span>
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center">
                <MailIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden lg:inline">Linked accounts</span>
                <span className="hidden md:inline lg:hidden">Accounts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Manage your personal information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Primary email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      readOnly
                      className="bg-muted/50"
                      value={
                        linkedEmails.find((e) => e.isPrimary)?.email ??
                        linkedEmails[0]?.email ??
                        ""
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Change your primary address in{" "}
                      <strong className="font-medium">Linked accounts</strong>.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings.preferences.timezone}
                      onValueChange={(value) => updateSetting("preferences", "timezone", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button>Save Profile</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Delivery Methods</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="emailNotifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={settings.notifications.email}
                        onCheckedChange={(checked) => updateSetting("notifications", "email", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="pushNotifications">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                      </div>
                      <Switch
                        id="pushNotifications"
                        checked={settings.notifications.push}
                        onCheckedChange={(checked) => updateSetting("notifications", "push", checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Types</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="taskReminders">Task Reminders</Label>
                        <p className="text-sm text-muted-foreground">Get reminded about upcoming tasks</p>
                      </div>
                      <Switch
                        id="taskReminders"
                        checked={settings.notifications.taskReminders}
                        onCheckedChange={(checked) => updateSetting("notifications", "taskReminders", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="goalUpdates">Goal Updates</Label>
                        <p className="text-sm text-muted-foreground">Notifications about goal progress</p>
                      </div>
                      <Switch
                        id="goalUpdates"
                        checked={settings.notifications.goalUpdates}
                        onCheckedChange={(checked) => updateSetting("notifications", "goalUpdates", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="financialAlerts">Financial Alerts</Label>
                        <p className="text-sm text-muted-foreground">Budget and spending notifications</p>
                      </div>
                      <Switch
                        id="financialAlerts"
                        checked={settings.notifications.financialAlerts}
                        onCheckedChange={(checked) => updateSetting("notifications", "financialAlerts", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="mt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security</CardTitle>
                  <CardDescription>Control your privacy and data sharing preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="profilePublic">Public Profile</Label>
                      <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                    </div>
                    <Switch
                      id="profilePublic"
                      checked={settings.privacy.profilePublic}
                      onCheckedChange={(checked) => updateSetting("privacy", "profilePublic", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="shareProgress">Share Progress</Label>
                      <p className="text-sm text-muted-foreground">Allow sharing of goal progress with group members</p>
                    </div>
                    <Switch
                      id="shareProgress"
                      checked={settings.privacy.shareProgress}
                      onCheckedChange={(checked) => updateSetting("privacy", "shareProgress", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allowAIAnalysis">AI Analysis</Label>
                      <p className="text-sm text-muted-foreground">Allow AI to analyze your data for insights</p>
                    </div>
                    <Switch
                      id="allowAIAnalysis"
                      checked={settings.privacy.allowAIAnalysis}
                      onCheckedChange={(checked) => updateSetting("privacy", "allowAIAnalysis", checked)}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-4">Data Management</h4>
                    <div className="space-y-2">
                      <Button variant="outline">Export My Data</Button>
                      <Button variant="outline">Download Privacy Report</Button>
                      <Button variant="destructive">Delete Account</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="mt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance & Preferences</CardTitle>
                  <CardDescription>Customize the look and feel of your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={settings.preferences.theme}
                      onValueChange={(value) => updateSetting("preferences", "theme", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={settings.preferences.language}
                      onValueChange={(value) => updateSetting("preferences", "language", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select
                      value={settings.preferences.dateFormat}
                      onValueChange={(value) => updateSetting("preferences", "dateFormat", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button>Save Preferences</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contexts" className="mt-4 flex-1 overflow-hidden">
              <ContextVisualization />
            </TabsContent>

            <TabsContent value="integrations" className="mt-4 flex-1 overflow-hidden">
              <IntegrationsDashboard />
            </TabsContent>

            <TabsContent value="accounts" className="mt-4 flex-1 overflow-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MailIcon className="h-5 w-5" />
                    Email addresses
                  </CardTitle>
                  <CardDescription>
                    Link multiple emails to one account. Use any verified address to sign in and receive
                    notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="email"
                      placeholder="Add another email…"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addLinkedEmail()}
                      className="flex-1"
                    />
                    <Button type="button" onClick={addLinkedEmail} className="shrink-0">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add email
                    </Button>
                  </div>

                  <ul className="space-y-3">
                    {linkedEmails.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium truncate">{row.email}</span>
                            {row.isPrimary && (
                              <Badge variant="default" className="shrink-0">
                                <StarIcon className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                            {row.verified ? (
                              <Badge variant="secondary" className="shrink-0">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-600/50">
                                Pending verification
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Added {row.addedAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {!row.verified && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => resendVerification(row.email)}
                            >
                              <SendIcon className="h-3.5 w-3.5 mr-1.5" />
                              Resend link
                            </Button>
                          )}
                          {!row.isPrimary && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setPrimaryEmail(row.id)}>
                              Set as primary
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeLinkedEmail(row.id)}
                            disabled={linkedEmails.length <= 1}
                          >
                            <Trash2Icon className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Remove</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Gmail & Google
                  </CardTitle>
                  <CardDescription>
                    Connect your Google account to associate your Gmail address and enable future mail and calendar
                    integrations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!googleConfigLoaded ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      Checking Google OAuth…
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Button type="button" onClick={linkGmail} disabled={!googleOAuthEnabled} className="w-fit">
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Link Gmail account
                        </Button>
                        {!googleOAuthEnabled && (
                          <p className="text-sm text-muted-foreground">
                            Set <code className="text-xs bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code> and{" "}
                            <code className="text-xs bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code> in{" "}
                            <code className="text-xs bg-muted px-1 rounded">.env.local</code>.
                          </p>
                        )}
                      </div>

                      {linkedGoogle.length > 0 ? (
                        <ul className="space-y-3">
                          {linkedGoogle.map((acc) => (
                            <li
                              key={acc.googleSub}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-10 w-10 shrink-0">
                                  {acc.picture ? (
                                    <AvatarImage src={acc.picture} alt="" referrerPolicy="no-referrer" />
                                  ) : null}
                                  <AvatarFallback className="text-xs">
                                    {(acc.name || acc.email).slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{acc.name || acc.email}</div>
                                  <div className="text-sm text-muted-foreground truncate">{acc.email}</div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Linked {acc.linkedAt.toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                                onClick={() => unlinkGmail(acc.googleSub)}
                              >
                                <Trash2Icon className="h-4 w-4 sm:mr-1" />
                                Disconnect
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No Gmail accounts linked yet. Use the button above to sign in with Google.
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">More providers</CardTitle>
                  <CardDescription>GitHub, Microsoft, and other sign-in options can be added later.</CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
