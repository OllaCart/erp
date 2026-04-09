"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain } from "lucide-react"

/**
 * No seeded demo metrics — memory comes from wiki/pages, Neo4j (when configured), and chat.
 */
export const MemoryDashboard: React.FC = () => {
  return (
    <div className="h-full overflow-auto p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="w-7 h-7 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Memory</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No sample data</CardTitle>
          <CardDescription>
            This tab used to show placeholder AI metrics. Founder context is not pre-filled: add markdown
            pages under <code className="text-xs bg-muted px-1 rounded">wiki/pages</code> for Claude, or
            store memories in Neo4j when configured. Telemetry here can be wired later.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>See <code className="text-xs bg-muted px-1 rounded">wiki/schema.md</code> for the wiki model.</p>
        </CardContent>
      </Card>
    </div>
  )
}
