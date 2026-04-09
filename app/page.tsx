"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatContainer } from "@/components/chat/chat-container"
import { DashDashboard } from "@/components/dashboard/dash-dashboard"
import { TaskDashboard } from "@/components/dashboard/task-dashboard"
import { TaskView } from "@/components/tasks/TaskView"
import { CalendarView } from "@/components/calendar/CalendarView"
import { CalendarDashboard } from "@/components/dashboard/calendar-dashboard"
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

export default function Home() {
  const [activeTab, setActiveTab] = useState("dash")

  const onNavigate = useCallback((e: Event) => {
    const tab = (e as CustomEvent<{ tab?: string }>).detail?.tab
    if (tab && isWaywardTabId(tab)) setActiveTab(tab)
  }, [])

  useEffect(() => {
    window.addEventListener("wayward-navigate", onNavigate)
    return () => window.removeEventListener("wayward-navigate", onNavigate)
  }, [onNavigate])

  return (
    <div className="min-h-[100dvh] min-h-screen bg-background flex flex-col">
        <div className="container mx-auto p-3 sm:p-4 flex flex-col flex-1 min-h-0 max-w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mb-3 sm:mb-4 w-full min-w-0 max-w-full h-auto min-h-10 p-1.5 flex flex-nowrap lg:flex lg:flex-wrap overflow-x-auto overflow-y-hidden justify-start lg:justify-center gap-1 rounded-xl lg:rounded-lg [scrollbar-width:thin] touch-pan-x [-webkit-overflow-scrolling:touch] snap-x snap-mandatory [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/25">
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="dash">Dash</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="chat">Chat</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="tasks">Tasks</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="calendar">Calendar</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="financial">Financial</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="memory">Memory</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="social">Social</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="health">Health</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="goals">Goals</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="knowledge">Knowledge</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="email">Email</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="dev">Dev</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="support">Support</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="crm">CRM</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="accounts">Accounts</TabsTrigger>
              <TabsTrigger className="shrink-0 flex-none lg:flex-1 min-w-[4.75rem] sm:min-w-[5.25rem] px-2.5 sm:px-3 text-xs sm:text-sm snap-start" value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
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
