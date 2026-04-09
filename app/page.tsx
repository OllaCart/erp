"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChatContainer } from "@/components/chat/chat-container"
import { DashDashboard } from "@/components/dashboard/dash-dashboard"
import { HomeOverview } from "@/components/dashboard/home-overview"
import { TaskView } from "@/components/tasks/TaskView"
import { CalendarView } from "@/components/calendar/CalendarView"
import { FinancialDashboard } from "@/components/dashboard/financial-dashboard"
import { MemoryDashboard } from "@/components/dashboard/memory-dashboard"
import { SettingsDashboard } from "@/components/dashboard/settings-dashboard"
import { GoalsDashboard } from "@/components/dashboard/goals-dashboard"
import { KnowledgeDashboard } from "@/components/dashboard/knowledge-dashboard"
import { AccountsDashboard } from "@/components/dashboard/accounts-dashboard"
import { SocialDashboard } from "@/components/dashboard/social-dashboard"
import { HealthDashboard } from "@/components/dashboard/health-dashboard"
import { InboxView } from "@/components/email/InboxView"
import { DevView } from "@/components/dev/DevView"
import { SupportView } from "@/components/support/SupportView"
import { CRMView } from "@/components/crm/CRMView"
import { isWaywardTabId } from "@/lib/command-center"
import { MenuIcon } from "lucide-react"

const MORE_TABS: { value: string; label: string }[] = [
  { value: "financial", label: "Financial" },
  { value: "memory", label: "Memory" },
  { value: "social", label: "Social" },
  { value: "health", label: "Health" },
  { value: "goals", label: "Goals" },
  { value: "knowledge", label: "Knowledge" },
  { value: "dev", label: "Dev" },
  { value: "support", label: "Support" },
  { value: "crm", label: "CRM" },
  { value: "accounts", label: "Accounts" },
  { value: "settings", label: "Settings" },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState("home")

  const onNavigate = useCallback((e: Event) => {
    const tab = (e as CustomEvent<{ tab?: string }>).detail?.tab
    if (tab && isWaywardTabId(tab)) setActiveTab(tab)
  }, [])

  useEffect(() => {
    window.addEventListener("wayward-navigate", onNavigate)
    return () => window.removeEventListener("wayward-navigate", onNavigate)
  }, [onNavigate])

  const tabTriggerClass =
    "shrink-0 flex-none lg:flex-1 min-w-[4.25rem] sm:min-w-[4.75rem] px-2 sm:px-2.5 text-xs sm:text-sm snap-start"

  return (
    <div className="min-h-[100dvh] min-h-screen bg-background flex flex-col">
      <div className="container mx-auto p-3 sm:p-4 flex flex-col flex-1 min-h-0 max-w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-center min-w-0">
            <TabsList className="w-full sm:flex-1 sm:max-w-4xl min-w-0 h-auto min-h-10 p-1.5 flex flex-nowrap lg:flex-wrap overflow-x-auto overflow-y-hidden justify-start lg:justify-center gap-1 rounded-xl lg:rounded-lg [scrollbar-width:thin] touch-pan-x [-webkit-overflow-scrolling:touch] snap-x snap-mandatory [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/25">
              <TabsTrigger className={tabTriggerClass} value="home">
                Home
              </TabsTrigger>
              <TabsTrigger className={tabTriggerClass} value="chat">
                Chat
              </TabsTrigger>
              <TabsTrigger className={tabTriggerClass} value="tasks">
                Tasks
              </TabsTrigger>
              <TabsTrigger className={tabTriggerClass} value="calendar">
                Calendar
              </TabsTrigger>
              <TabsTrigger className={tabTriggerClass} value="email">
                Email
              </TabsTrigger>
              <TabsTrigger className={tabTriggerClass} value="dash">
                Voice
              </TabsTrigger>
            </TabsList>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-9 sm:h-10 px-3 w-full sm:w-auto justify-center"
                  aria-label="More modules"
                >
                  <MenuIcon className="h-4 w-4 sm:mr-1.5" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>More modules</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {MORE_TABS.map(({ value, label }) => (
                  <DropdownMenuItem key={value} onClick={() => setActiveTab(value)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="home" className="h-full overflow-y-auto">
              <HomeOverview />
            </TabsContent>

            <TabsContent value="dash" className="h-full">
              <DashDashboard />
            </TabsContent>

            <TabsContent value="chat" className="h-full">
              <ChatContainer />
            </TabsContent>

            <TabsContent value="tasks" className="h-full overflow-y-auto">
              <TaskView />
            </TabsContent>

            <TabsContent value="calendar" className="h-full overflow-y-auto">
              <CalendarView />
            </TabsContent>

            <TabsContent value="financial" className="h-full">
              <FinancialDashboard />
            </TabsContent>

            <TabsContent value="memory" className="h-full">
              <MemoryDashboard />
            </TabsContent>

            <TabsContent value="social" className="h-full">
              <SocialDashboard />
            </TabsContent>

            <TabsContent value="health" className="h-full">
              <HealthDashboard />
            </TabsContent>

            <TabsContent value="goals" className="h-full">
              <GoalsDashboard />
            </TabsContent>

            <TabsContent value="knowledge" className="h-full">
              <KnowledgeDashboard />
            </TabsContent>

            <TabsContent value="email" className="h-full">
              <InboxView />
            </TabsContent>

            <TabsContent value="dev" className="h-full">
              <DevView />
            </TabsContent>

            <TabsContent value="support" className="h-full">
              <SupportView />
            </TabsContent>

            <TabsContent value="crm" className="h-full">
              <CRMView />
            </TabsContent>

            <TabsContent value="accounts" className="h-full">
              <AccountsDashboard />
            </TabsContent>

            <TabsContent value="settings" className="h-full">
              <SettingsDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
