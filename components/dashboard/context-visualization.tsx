"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRightIcon, FolderIcon, CalendarIcon, DollarSignIcon, CheckSquareIcon, Loader2 } from "lucide-react"
import { neo4jService } from "@/lib/neo4j-service"
import { toast } from "@/components/ui/use-toast"

interface ContextNode {
  id: string
  name: string
  description: string
  type: string
  createdAt: string
}

interface EntityNode {
  id: string
  type: string
  title?: string
  description?: string
  amount?: number
  category?: string
  date?: string
  status?: string
  priority?: number
  startDate?: string
  endDate?: string
}

export const ContextVisualization: React.FC = () => {
  const [contexts, setContexts] = useState<ContextNode[]>([])
  const [selectedContext, setSelectedContext] = useState<string | null>(null)
  const [contextEntities, setContextEntities] = useState<EntityNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(false)
  const userId = "user-123" // In a real app, get from auth

  useEffect(() => {
    const fetchContexts = async () => {
      try {
        // Ensure user exists first
        await neo4jService.ensureUserExists(userId)

        // Then fetch contexts
        const result = await neo4jService.getUserContexts(userId)

        // Check if we have data
        if (result && result.length > 0) {
          try {
            const contextNodes = result.map((record: any) => {
              const node = record.get ? record.get("c").properties : record.properties
              return {
                id: node.id,
                name: node.name,
                description: node.description,
                type: node.type,
                createdAt: node.createdAt,
              }
            })
            setContexts(contextNodes)

            // Check if this is mock data
            if ("mock" in result && result.mock) {
              setIsMockData(true)
              toast({
                title: "Using Demo Data",
                description: "Connected to Neo4j in demo mode. Some features may be limited.",
                duration: 5000,
              })
            }
          } catch (error) {
            console.error("Error parsing context data:", error)
            setIsMockData(true)
            // Fall back to mock data
            setContexts([
              {
                id: "1",
                name: "Trip to Montenegro",
                description: "Summer vacation planning",
                type: "travel",
                createdAt: new Date().toISOString(),
              },
              {
                id: "2",
                name: "Monthly Budget",
                description: "June 2023 budget planning",
                type: "finance",
                createdAt: new Date().toISOString(),
              },
            ])
          }
        } else {
          // No data, use mock data
          setIsMockData(true)
          setContexts([
            {
              id: "1",
              name: "Trip to Montenegro",
              description: "Summer vacation planning",
              type: "travel",
              createdAt: new Date().toISOString(),
            },
            {
              id: "2",
              name: "Monthly Budget",
              description: "June 2023 budget planning",
              type: "finance",
              createdAt: new Date().toISOString(),
            },
            {
              id: "3",
              name: "Team Meeting",
              description: "Weekly team sync",
              type: "event",
              createdAt: new Date().toISOString(),
            },
          ])
        }
      } catch (error) {
        console.error("Error fetching contexts:", error)
        setIsMockData(true)
        // Fall back to mock data
        setContexts([
          {
            id: "1",
            name: "Trip to Montenegro",
            description: "Summer vacation planning",
            type: "travel",
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Monthly Budget",
            description: "June 2023 budget planning",
            type: "finance",
            createdAt: new Date().toISOString(),
          },
        ])
      } finally {
        setIsInitialLoading(false)
      }
    }

    fetchContexts()
  }, [userId])

  const fetchContextEntities = async (contextId: string) => {
    setIsLoading(true)
    try {
      const result = await neo4jService.getContextWithRelatedEntities(contextId)

      if (result && result.entities && result.entities.length > 0) {
        try {
          const entityNodes = result.entities
            .map((record: any) => {
              try {
                const node = record.get ? record.get("e").properties : record.properties
                const types = record.get ? record.get("types") : record.types
                const type = Array.isArray(types)
                  ? types.includes("Transaction")
                    ? "transaction"
                    : types.includes("Task")
                      ? "task"
                      : types.includes("Event")
                        ? "event"
                        : "unknown"
                  : "unknown"

                return {
                  id: node.id,
                  type,
                  title: node.title || node.description,
                  description: node.description,
                  amount: node.amount,
                  category: node.category,
                  date: node.date,
                  status: node.status,
                  priority: node.priority,
                  startDate: node.startDate,
                  endDate: node.endDate,
                }
              } catch (e) {
                console.error("Error parsing entity:", e)
                return null
              }
            })
            .filter(Boolean) as EntityNode[]

          setContextEntities(entityNodes)
        } catch (error) {
          console.error("Error parsing entity data:", error)
          setIsMockData(true)
          // Use mock data
          setContextEntities(getMockEntities(contextId))
        }
      } else {
        // Use mock data if no real data is available
        setIsMockData(true)
        setContextEntities(getMockEntities(contextId))
      }

      setSelectedContext(contextId)
    } catch (error) {
      console.error("Error fetching context entities:", error)
      setIsMockData(true)
      // Fall back to mock data
      setContextEntities(getMockEntities(contextId))
      setSelectedContext(contextId)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to get mock entities
  const getMockEntities = (contextId: string): EntityNode[] => {
    // Return different mock data based on context ID
    if (contextId === "1") {
      return [
        {
          id: "e1",
          type: "transaction",
          title: "Travel Budget",
          description: "Budget for Montenegro trip",
          amount: 4000,
          category: "Travel",
          date: new Date().toISOString(),
        },
        {
          id: "e2",
          type: "task",
          title: "Book accommodation in Montenegro",
          description: "Find and book suitable accommodation",
          status: "pending",
          priority: 4,
        },
        {
          id: "e3",
          type: "task",
          title: "Research attractions in Montenegro",
          description: "Find popular attractions and activities",
          status: "pending",
          priority: 3,
        },
        {
          id: "e4",
          type: "event",
          title: "Trip to Montenegro",
          description: "Summer vacation",
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]
    } else if (contextId === "2") {
      return [
        {
          id: "e5",
          type: "transaction",
          title: "Monthly Rent",
          description: "June rent payment",
          amount: 1200,
          category: "Housing",
          date: new Date().toISOString(),
        },
        {
          id: "e6",
          type: "task",
          title: "Create budget spreadsheet",
          description: "Set up monthly budget tracking",
          status: "pending",
          priority: 4,
        },
        {
          id: "e7",
          type: "transaction",
          title: "Grocery Budget",
          description: "Weekly grocery allowance",
          amount: 150,
          category: "Food",
          date: new Date().toISOString(),
        },
      ]
    } else {
      return [
        {
          id: "e8",
          type: "event",
          title: "Team Meeting",
          description: "Weekly sync with the team",
          startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        },
        {
          id: "e9",
          type: "task",
          title: "Prepare presentation",
          description: "Create slides for the meeting",
          status: "in-progress",
          priority: 5,
        },
      ]
    }
  }

  const getContextTypeIcon = (type: string) => {
    switch (type) {
      case "travel":
        return <CalendarIcon className="h-4 w-4 mr-2" />
      case "finance":
        return <DollarSignIcon className="h-4 w-4 mr-2" />
      case "event":
        return <CalendarIcon className="h-4 w-4 mr-2" />
      default:
        return <FolderIcon className="h-4 w-4 mr-2" />
    }
  }

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return <DollarSignIcon className="h-4 w-4 mr-2" />
      case "task":
        return <CheckSquareIcon className="h-4 w-4 mr-2" />
      case "event":
        return <CalendarIcon className="h-4 w-4 mr-2" />
      default:
        return <FolderIcon className="h-4 w-4 mr-2" />
    }
  }

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case "transaction":
        return <Badge className="bg-green-100 text-green-800">Transaction</Badge>
      case "task":
        return <Badge className="bg-blue-100 text-blue-800">Task</Badge>
      case "event":
        return <Badge className="bg-purple-100 text-purple-800">Event</Badge>
      default:
        return <Badge>Other</Badge>
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Contextual Relationships</CardTitle>
          <CardDescription>
            View and manage related items across your finances, tasks, and calendar
            {isMockData && (
              <span className="block text-xs text-amber-600 mt-1">Running in demo mode with sample data</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <Tabs defaultValue="contexts" className="h-full flex flex-col overflow-hidden">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="contexts">Contexts</TabsTrigger>
              <TabsTrigger value="visualization" disabled={!selectedContext}>
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contexts" className="pt-4 flex-1 overflow-auto">
              {isInitialLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {contexts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No contexts found. Try having a conversation about a trip or financial planning to create
                      contexts.
                    </p>
                  ) : (
                    contexts.map((context) => (
                      <Card key={context.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent
                          className="p-4 flex justify-between items-center"
                          onClick={() => fetchContextEntities(context.id)}
                        >
                          <div className="flex items-center">
                            {getContextTypeIcon(context.type)}
                            <div>
                              <h3 className="font-medium">{context.name}</h3>
                              <p className="text-sm text-muted-foreground">{context.description}</p>
                            </div>
                          </div>
                          <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="visualization" className="pt-4 flex-1 overflow-auto">
              {selectedContext && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{contexts.find((c) => c.id === selectedContext)?.name}</h3>
                    <Button variant="outline" size="sm" onClick={() => setSelectedContext(null)}>
                      Back to Contexts
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contextEntities.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No related entities found</p>
                      ) : (
                        contextEntities.map((entity) => (
                          <Card key={entity.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start space-x-3">
                                  <div className="mt-1">{getEntityTypeIcon(entity.type)}</div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium">{entity.title}</h4>
                                      {getEntityTypeBadge(entity.type)}
                                    </div>
                                    {entity.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{entity.description}</p>
                                    )}
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      {entity.type === "transaction" && (
                                        <div className="flex flex-col space-y-1">
                                          <span>Amount: ${entity.amount?.toFixed(2)}</span>
                                          <span>Category: {entity.category}</span>
                                          <span>Date: {new Date(entity.date || "").toLocaleDateString()}</span>
                                        </div>
                                      )}
                                      {entity.type === "task" && (
                                        <div className="flex flex-col space-y-1">
                                          <span>Status: {entity.status}</span>
                                          <span>Priority: {entity.priority}</span>
                                        </div>
                                      )}
                                      {entity.type === "event" && (
                                        <div className="flex flex-col space-y-1">
                                          <span>Start: {new Date(entity.startDate || "").toLocaleString()}</span>
                                          {entity.endDate && (
                                            <span>End: {new Date(entity.endDate).toLocaleString()}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
