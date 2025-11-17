"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageProvider } from "@/context/message-context"
import { ChatContainer } from "@/components/chat/chat-container"
import { DashDashboard } from "@/components/dashboard/dash-dashboard"
import { TaskDashboard } from "@/components/dashboard/task-dashboard"
import { CalendarDashboard } from "@/components/dashboard/calendar-dashboard"
import { FinancialDashboard } from "@/components/dashboard/financial-dashboard"
import { MemoryDashboard } from "@/components/dashboard/memory-dashboard"
import { SettingsDashboard } from "@/components/dashboard/settings-dashboard"
import { GoalsDashboard } from "@/components/dashboard/goals-dashboard"
import { KnowledgeDashboard } from "@/components/dashboard/knowledge-dashboard"
import { AccountsDashboard } from "@/components/dashboard/accounts-dashboard"
import { SocialDashboard } from "@/components/dashboard/social-dashboard"
import { HealthDashboard } from "@/components/dashboard/health-dashboard"

export default function Home() {
  const [activeTab, setActiveTab] = useState("dash")

  return (
    <MessageProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 h-screen flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-12 mb-4">
              <TabsTrigger value="dash">Dash</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="dash" className="h-full">
                <DashDashboard />
              </TabsContent>

              <TabsContent value="chat" className="h-full">
                <ChatContainer />
              </TabsContent>

              <TabsContent value="tasks" className="h-full">
                <TaskDashboard />
              </TabsContent>

              <TabsContent value="calendar" className="h-full">
                <CalendarDashboard />
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
    </MessageProvider>
  )
}
