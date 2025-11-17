"use client"

import type React from "react"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinancialDashboard } from "./financial-dashboard"
import { IntegrationsDashboard } from "./integrations-dashboard"
import { ContextVisualization } from "./context-visualization"
import { IntegratedCalendarTasks } from "./integrated-calendar-tasks"
import { DollarSignIcon, CalendarIcon, LinkIcon, NetworkIcon } from "lucide-react"

export const MainDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("calendar-tasks")

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs
        defaultValue="calendar-tasks"
        className="w-full flex-1 flex flex-col overflow-hidden"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="calendar-tasks" className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Calendar & Tasks</span>
            <span className="md:hidden">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="finances" className="flex items-center">
            <DollarSignIcon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Finances</span>
            <span className="md:hidden">Budget</span>
          </TabsTrigger>
          <TabsTrigger value="contexts" className="flex items-center">
            <NetworkIcon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Contexts</span>
            <span className="md:hidden">Contexts</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center">
            <LinkIcon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Integrations</span>
            <span className="md:hidden">Connect</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center md:col-span-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 mr-2"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span className="hidden md:inline">Settings</span>
            <span className="md:hidden">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar-tasks" className="mt-4 flex-1 overflow-hidden">
          <IntegratedCalendarTasks />
        </TabsContent>

        <TabsContent value="finances" className="mt-4 flex-1 overflow-hidden">
          <FinancialDashboard />
        </TabsContent>

        <TabsContent value="contexts" className="mt-4 flex-1 overflow-hidden">
          <ContextVisualization />
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 flex-1 overflow-hidden">
          <IntegrationsDashboard />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Personal ERP Settings</h2>
              <p className="text-muted-foreground">Settings panel will be implemented in a future update.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
