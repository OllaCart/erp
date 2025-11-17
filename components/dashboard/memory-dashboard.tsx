"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Brain,
  Activity,
  TrendingUp,
  Zap,
  Database,
  MessageSquare,
  Calendar,
  DollarSign,
  Target,
  Users,
  Heart,
} from "lucide-react"

interface AIEvent {
  id: string
  timestamp: Date
  type: "learning" | "prediction" | "recommendation" | "analysis" | "interaction"
  module: "chat" | "calendar" | "financial" | "social" | "health" | "tasks" | "goals"
  description: string
  confidence: number
  impact: "low" | "medium" | "high"
  dataPoints: number
  outcome?: "success" | "partial" | "failed"
}

interface AIMetrics {
  totalEvents: number
  learningRate: number
  predictionAccuracy: number
  userSatisfaction: number
  dataProcessed: number
  activeConnections: number
}

export const MemoryDashboard: React.FC = () => {
  const [aiEvents, setAiEvents] = useState<AIEvent[]>([])
  const [aiMetrics, setAiMetrics] = useState<AIMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAIEvents()
    loadAIMetrics()
  }, [])

  const loadAIEvents = async () => {
    // Mock AI events data - in real app, this would come from your AI service
    const mockEvents: AIEvent[] = [
      {
        id: "1",
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        type: "learning",
        module: "chat",
        description: "Learned new user preference for morning scheduling",
        confidence: 0.87,
        impact: "medium",
        dataPoints: 15,
        outcome: "success",
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        type: "prediction",
        module: "financial",
        description: "Predicted monthly budget overrun in dining category",
        confidence: 0.92,
        impact: "high",
        dataPoints: 45,
        outcome: "success",
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        type: "recommendation",
        module: "social",
        description: "Suggested optimal time for friend meetup based on schedules",
        confidence: 0.78,
        impact: "medium",
        dataPoints: 8,
        outcome: "partial",
      },
      {
        id: "4",
        timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
        type: "analysis",
        module: "health",
        description: "Analyzed sleep pattern correlation with productivity",
        confidence: 0.94,
        impact: "high",
        dataPoints: 120,
        outcome: "success",
      },
      {
        id: "5",
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        type: "interaction",
        module: "calendar",
        description: "Processed natural language event creation request",
        confidence: 0.89,
        impact: "medium",
        dataPoints: 3,
        outcome: "success",
      },
    ]

    setAiEvents(mockEvents)
    setIsLoading(false)
  }

  const loadAIMetrics = async () => {
    // Mock AI metrics - in real app, this would come from your AI service
    const mockMetrics: AIMetrics = {
      totalEvents: 1247,
      learningRate: 0.85,
      predictionAccuracy: 0.78,
      userSatisfaction: 0.91,
      dataProcessed: 15420,
      activeConnections: 6,
    }

    setAiMetrics(mockMetrics)
  }

  const getEventIcon = (module: string) => {
    switch (module) {
      case "chat":
        return <MessageSquare className="w-4 h-4" />
      case "calendar":
        return <Calendar className="w-4 h-4" />
      case "financial":
        return <DollarSign className="w-4 h-4" />
      case "social":
        return <Users className="w-4 h-4" />
      case "health":
        return <Heart className="w-4 h-4" />
      case "tasks":
        return <Target className="w-4 h-4" />
      default:
        return <Brain className="w-4 h-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case "learning":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "prediction":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "recommendation":
        return "bg-green-100 text-green-800 border-green-200"
      case "analysis":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "interaction":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-red-600"
      case "medium":
        return "text-yellow-600"
      case "low":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case "success":
        return "bg-green-100 text-green-800"
      case "partial":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Prepare chart data
  const eventsByHour = Array.from({ length: 24 }, (_, hour) => {
    const count = aiEvents.filter((event) => new Date(event.timestamp).getHours() === hour).length
    return { hour: `${hour}:00`, events: count }
  }).slice(-12) // Last 12 hours

  const eventsByType = [
    { type: "Learning", count: aiEvents.filter((e) => e.type === "learning").length },
    { type: "Prediction", count: aiEvents.filter((e) => e.type === "prediction").length },
    { type: "Recommendation", count: aiEvents.filter((e) => e.type === "recommendation").length },
    { type: "Analysis", count: aiEvents.filter((e) => e.type === "analysis").length },
    { type: "Interaction", count: aiEvents.filter((e) => e.type === "interaction").length },
  ]

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="w-12 h-12 mx-auto animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Loading AI memory data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-6 overflow-auto p-4">
      <div className="flex items-center space-x-2">
        <Brain className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">AI Memory & Events</h1>
      </div>

      {/* AI Metrics Overview */}
      {aiMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                  <p className="text-lg font-semibold">{aiMetrics.totalEvents.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Learning Rate</p>
                  <p className="text-lg font-semibold">{Math.round(aiMetrics.learningRate * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                  <p className="text-lg font-semibold">{Math.round(aiMetrics.predictionAccuracy * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Satisfaction</p>
                  <p className="text-lg font-semibold">{Math.round(aiMetrics.userSatisfaction * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Data Points</p>
                  <p className="text-lg font-semibold">{aiMetrics.dataProcessed.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Connections</p>
                  <p className="text-lg font-semibold">{aiMetrics.activeConnections}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="events" className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="flex-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Events</CardTitle>
              <CardDescription>Latest AI processing events and their effects on your system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getEventIcon(event.module)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getEventColor(event.type)}>{event.type}</Badge>
                            <Badge variant="outline">{event.module}</Badge>
                            {event.outcome && <Badge className={getOutcomeColor(event.outcome)}>{event.outcome}</Badge>}
                          </div>
                          <p className="text-sm mt-1">{event.description}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {event.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <span>
                          <strong>Confidence:</strong> {Math.round(event.confidence * 100)}%
                        </span>
                        <span className={getImpactColor(event.impact)}>
                          <strong>Impact:</strong> {event.impact}
                        </span>
                        <span>
                          <strong>Data Points:</strong> {event.dataPoints}
                        </span>
                      </div>
                      <Progress value={event.confidence * 100} className="w-20 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Events by Hour</CardTitle>
                <CardDescription>AI activity over the last 12 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    events: {
                      label: "Events",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={eventsByHour}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="events" stroke="var(--color-events)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Events by Type</CardTitle>
                <CardDescription>Distribution of AI event types</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Count",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventsByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>AI Performance Metrics</CardTitle>
              <CardDescription>System performance and learning indicators</CardDescription>
            </CardHeader>
            <CardContent>
              {aiMetrics && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Learning Rate</span>
                      <span>{Math.round(aiMetrics.learningRate * 100)}%</span>
                    </div>
                    <Progress value={aiMetrics.learningRate * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Prediction Accuracy</span>
                      <span>{Math.round(aiMetrics.predictionAccuracy * 100)}%</span>
                    </div>
                    <Progress value={aiMetrics.predictionAccuracy * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>User Satisfaction</span>
                      <span>{Math.round(aiMetrics.userSatisfaction * 100)}%</span>
                    </div>
                    <Progress value={aiMetrics.userSatisfaction * 100} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{aiMetrics.totalEvents.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Events Processed</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{aiMetrics.dataProcessed.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Data Points Analyzed</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
