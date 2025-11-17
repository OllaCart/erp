"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarIcon,
  CreditCardIcon,
  DatabaseIcon,
  RefreshCwIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Integration {
  id: string
  name: string
  service: string
  status: "active" | "inactive" | "error"
  lastSynced?: Date
  description: string
  icon: React.ReactNode
}

export const IntegrationsDashboard: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "1",
      name: "Google Calendar",
      service: "google-calendar",
      status: "active",
      lastSynced: new Date(),
      description: "Sync your events with Google Calendar",
      icon: <CalendarIcon className="h-6 w-6" />,
    },
    {
      id: "2",
      name: "Stripe",
      service: "stripe",
      status: "inactive",
      description: "Process payments and track invoices",
      icon: <CreditCardIcon className="h-6 w-6" />,
    },
    {
      id: "3",
      name: "QuickBooks",
      service: "quickbooks",
      status: "error",
      lastSynced: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      description: "Sync your financial data with QuickBooks",
      icon: <DatabaseIcon className="h-6 w-6" />,
    },
  ])

  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)

  const handleConnect = (id: string) => {
    setIsConnecting(id)

    // Simulate connection process
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((integration) =>
          integration.id === id ? { ...integration, status: "active", lastSynced: new Date() } : integration,
        ),
      )

      setIsConnecting(null)

      toast({
        title: "Integration Connected",
        description: "Your integration has been successfully connected.",
      })
    }, 1500)
  }

  const handleSync = (id: string) => {
    setIsSyncing(id)

    // Simulate sync process
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((integration) => (integration.id === id ? { ...integration, lastSynced: new Date() } : integration)),
      )

      setIsSyncing(null)

      toast({
        title: "Sync Complete",
        description: "Your data has been successfully synchronized.",
      })
    }, 1500)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case "inactive":
        return <AlertCircleIcon className="h-5 w-5 text-gray-400" />
      case "error":
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect and manage your external services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-muted rounded-md">{integration.icon}</div>
                      <div>
                        <h3 className="font-medium">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          {getStatusBadge(integration.status)}
                          {integration.lastSynced && (
                            <span className="text-xs text-muted-foreground">
                              Last synced: {integration.lastSynced.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {integration.status === "inactive" ? (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(integration.id)}
                          disabled={isConnecting === integration.id}
                        >
                          {isConnecting === integration.id ? (
                            <>
                              <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Connect
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(integration.id)}
                          disabled={isSyncing === integration.id}
                        >
                          {isSyncing === integration.id ? (
                            <>
                              <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCwIcon className="h-4 w-4 mr-2" />
                              Sync
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
