"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  HeartIcon,
  ActivityIcon,
  MoonIcon,
  SmileIcon,
  ZapIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PlusIcon,
  TargetIcon,
  AlertTriangleIcon,
} from "lucide-react"
import type { HealthMetric, HealthMetricType } from "@/types/erp"

interface HealthGoal {
  id: string
  type: HealthMetricType
  target: number
  current: number
  unit: string
  deadline: Date
  description: string
}

interface HealthInsight {
  id: string
  type: "positive" | "warning" | "info"
  title: string
  description: string
  action?: string
}

export const HealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [goals, setGoals] = useState<HealthGoal[]>([])
  const [insights, setInsights] = useState<HealthInsight[]>([])
  const [newMetric, setNewMetric] = useState<Partial<HealthMetric>>({})
  const [newGoal, setNewGoal] = useState<Partial<HealthGoal>>({})
  const [isAddingMetric, setIsAddingMetric] = useState(false)
  const [isAddingGoal, setIsAddingGoal] = useState(false)

  const userId = "user-123"

  useEffect(() => {
    loadSampleData()
  }, [])

  const loadSampleData = () => {
    // Sample health metrics
    const sampleMetrics: HealthMetric[] = [
      {
        id: "1",
        userId,
        type: "sleep",
        value: 7.5,
        unit: "hours",
        timestamp: new Date("2024-01-22T06:00:00"),
        notes: "Good quality sleep",
      },
      {
        id: "2",
        userId,
        type: "exercise",
        value: 45,
        unit: "minutes",
        timestamp: new Date("2024-01-22T07:00:00"),
        notes: "Morning run",
      },
      {
        id: "3",
        userId,
        type: "mood",
        value: 8,
        unit: "1-10 scale",
        timestamp: new Date("2024-01-22T20:00:00"),
        notes: "Feeling great after productive day",
      },
      {
        id: "4",
        userId,
        type: "stress",
        value: 3,
        unit: "1-10 scale",
        timestamp: new Date("2024-01-22T20:00:00"),
        notes: "Low stress day",
      },
      {
        id: "5",
        userId,
        type: "steps",
        value: 8500,
        unit: "steps",
        timestamp: new Date("2024-01-22T23:59:00"),
      },
      {
        id: "6",
        userId,
        type: "weight",
        value: 165,
        unit: "lbs",
        timestamp: new Date("2024-01-22T07:00:00"),
      },
      {
        id: "7",
        userId,
        type: "heart_rate",
        value: 72,
        unit: "bpm",
        timestamp: new Date("2024-01-22T08:00:00"),
        notes: "Resting heart rate",
      },
    ]

    // Sample health goals
    const sampleGoals: HealthGoal[] = [
      {
        id: "1",
        type: "steps",
        target: 10000,
        current: 8500,
        unit: "steps",
        deadline: new Date("2024-01-23T23:59:00"),
        description: "Daily step goal",
      },
      {
        id: "2",
        type: "sleep",
        target: 8,
        current: 7.5,
        unit: "hours",
        deadline: new Date("2024-01-23T06:00:00"),
        description: "Get 8 hours of sleep",
      },
      {
        id: "3",
        type: "exercise",
        target: 60,
        current: 45,
        unit: "minutes",
        deadline: new Date("2024-01-23T23:59:00"),
        description: "Daily exercise goal",
      },
    ]

    // Sample health insights
    const sampleInsights: HealthInsight[] = [
      {
        id: "1",
        type: "positive",
        title: "Great Sleep Pattern",
        description: "You've maintained 7+ hours of sleep for 5 consecutive days",
        action: "Keep up the good work!",
      },
      {
        id: "2",
        type: "warning",
        title: "Low Activity Alert",
        description: "You're 1,500 steps short of your daily goal",
        action: "Take a 15-minute walk to reach your target",
      },
      {
        id: "3",
        type: "info",
        title: "Mood Trend",
        description: "Your mood has been consistently high this week (avg: 8.2/10)",
        action: "Consider what's contributing to this positive trend",
      },
      {
        id: "4",
        type: "warning",
        title: "Stress Levels",
        description: "Stress levels have increased over the past 3 days",
        action: "Try meditation or deep breathing exercises",
      },
    ]

    setMetrics(sampleMetrics)
    setGoals(sampleGoals)
    setInsights(sampleInsights)
  }

  const addMetric = () => {
    if (!newMetric.type || !newMetric.value) return

    const metric: HealthMetric = {
      id: Date.now().toString(),
      userId,
      type: newMetric.type,
      value: newMetric.value,
      unit: newMetric.unit || "",
      timestamp: new Date(),
      notes: newMetric.notes,
    }

    setMetrics([...metrics, metric])
    setNewMetric({})
    setIsAddingMetric(false)
  }

  const addGoal = () => {
    if (!newGoal.type || !newGoal.target) return

    const goal: HealthGoal = {
      id: Date.now().toString(),
      type: newGoal.type,
      target: newGoal.target,
      current: getCurrentMetricValue(newGoal.type),
      unit: newGoal.unit || "",
      deadline: newGoal.deadline || new Date(),
      description: newGoal.description || "",
    }

    setGoals([...goals, goal])
    setNewGoal({})
    setIsAddingGoal(false)
  }

  const getCurrentMetricValue = (type: HealthMetricType): number => {
    const latestMetric = metrics
      .filter((m) => m.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
    return latestMetric?.value || 0
  }

  const getMetricIcon = (type: HealthMetricType) => {
    switch (type) {
      case "sleep":
        return <MoonIcon className="h-5 w-5" />
      case "exercise":
        return <ActivityIcon className="h-5 w-5" />
      case "mood":
        return <SmileIcon className="h-5 w-5" />
      case "stress":
        return <ZapIcon className="h-5 w-5" />
      case "heart_rate":
        return <HeartIcon className="h-5 w-5" />
      case "steps":
        return <ActivityIcon className="h-5 w-5" />
      default:
        return <ActivityIcon className="h-5 w-5" />
    }
  }

  const getInsightIcon = (type: "positive" | "warning" | "info") => {
    switch (type) {
      case "positive":
        return <TrendingUpIcon className="h-5 w-5 text-green-600" />
      case "warning":
        return <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
      case "info":
        return <TrendingUpIcon className="h-5 w-5 text-blue-600" />
    }
  }

  const getInsightColor = (type: "positive" | "warning" | "info") => {
    switch (type) {
      case "positive":
        return "bg-green-50 border-green-200"
      case "warning":
        return "bg-yellow-50 border-yellow-200"
      case "info":
        return "bg-blue-50 border-blue-200"
    }
  }

  const calculateHealthScore = () => {
    // Simple health score calculation based on recent metrics
    const recentMetrics = metrics.filter((m) => {
      const dayAgo = new Date()
      dayAgo.setDate(dayAgo.getDate() - 1)
      return m.timestamp >= dayAgo
    })

    let score = 0
    let factors = 0

    recentMetrics.forEach((metric) => {
      switch (metric.type) {
        case "sleep":
          score += metric.value >= 7 ? 20 : (metric.value / 7) * 20
          factors++
          break
        case "exercise":
          score += metric.value >= 30 ? 20 : (metric.value / 30) * 20
          factors++
          break
        case "mood":
          score += (metric.value / 10) * 20
          factors++
          break
        case "stress":
          score += ((10 - metric.value) / 10) * 20
          factors++
          break
        case "steps":
          score += metric.value >= 8000 ? 20 : (metric.value / 8000) * 20
          factors++
          break
      }
    })

    return factors > 0 ? Math.round(score / factors) : 0
  }

  const getMetricTrend = (type: HealthMetricType) => {
    const typeMetrics = metrics
      .filter((m) => m.type === type)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    if (typeMetrics.length < 2) return "neutral"

    const recent = typeMetrics.slice(-2)
    const change = recent[1].value - recent[0].value

    if (type === "stress") {
      return change > 0 ? "down" : change < 0 ? "up" : "neutral"
    }

    return change > 0 ? "up" : change < 0 ? "down" : "neutral"
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUpIcon className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingDownIcon className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="h-full overflow-auto">
      <Tabs defaultValue="overview" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Health Score</CardTitle>
                <CardDescription>Overall health based on recent metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold text-green-600">{calculateHealthScore()}</div>
                  <div className="flex-1">
                    <Progress value={calculateHealthScore()} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculateHealthScore() >= 80
                        ? "Excellent"
                        : calculateHealthScore() >= 60
                          ? "Good"
                          : calculateHealthScore() >= 40
                            ? "Fair"
                            : "Needs Improvement"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Today's Progress</CardTitle>
                <CardDescription>Daily goals completion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {goals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="flex items-center justify-between">
                      <span className="text-sm">{goal.description}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={(goal.current / goal.target) * 100} className="w-16 h-2" />
                        <span className="text-xs text-muted-foreground">
                          {Math.round((goal.current / goal.target) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Stats</CardTitle>
                <CardDescription>Latest measurements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["sleep", "exercise", "mood", "steps"].map((type) => {
                    const metric = metrics
                      .filter((m) => m.type === type)
                      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
                    if (!metric) return null

                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getMetricIcon(type as HealthMetricType)}
                          <span className="text-sm capitalize">{type}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium">
                            {metric.value} {metric.unit}
                          </span>
                          {getTrendIcon(getMetricTrend(type as HealthMetricType))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Insights</CardTitle>
                <CardDescription>AI-powered health recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.slice(0, 3).map((insight) => (
                    <div key={insight.id} className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}>
                      <div className="flex items-start space-x-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                          {insight.action && <p className="text-xs font-medium mt-2 text-blue-600">{insight.action}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">7-Day Averages</CardTitle>
                <CardDescription>Weekly health trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["sleep", "exercise", "mood", "stress"].map((type) => {
                    const weekMetrics = metrics
                      .filter((m) => m.type === type)
                      .filter((m) => {
                        const weekAgo = new Date()
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        return m.timestamp >= weekAgo
                      })

                    if (weekMetrics.length === 0) return null

                    const average = weekMetrics.reduce((sum, m) => sum + m.value, 0) / weekMetrics.length
                    const unit = weekMetrics[0].unit

                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getMetricIcon(type as HealthMetricType)}
                          <span className="text-sm capitalize">{type}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium">
                            {average.toFixed(1)} {unit}
                          </span>
                          {getTrendIcon(getMetricTrend(type as HealthMetricType))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Health Metrics</h2>
            <Dialog open={isAddingMetric} onOpenChange={setIsAddingMetric}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Log Metric
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Health Metric</DialogTitle>
                  <DialogDescription>Record a new health measurement</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type">Metric Type</Label>
                    <Select onValueChange={(value) => setNewMetric({ ...newMetric, type: value as HealthMetricType })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sleep">Sleep</SelectItem>
                        <SelectItem value="exercise">Exercise</SelectItem>
                        <SelectItem value="mood">Mood</SelectItem>
                        <SelectItem value="stress">Stress</SelectItem>
                        <SelectItem value="weight">Weight</SelectItem>
                        <SelectItem value="heart_rate">Heart Rate</SelectItem>
                        <SelectItem value="steps">Steps</SelectItem>
                        <SelectItem value="nutrition">Nutrition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="value">Value</Label>
                      <Input
                        id="value"
                        type="number"
                        value={newMetric.value || ""}
                        onChange={(e) => setNewMetric({ ...newMetric, value: Number(e.target.value) })}
                        placeholder="Enter value"
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        value={newMetric.unit || ""}
                        onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
                        placeholder="e.g., hours, minutes, lbs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={newMetric.notes || ""}
                      onChange={(e) => setNewMetric({ ...newMetric, notes: e.target.value })}
                      placeholder="Add any additional notes"
                    />
                  </div>
                  <Button onClick={addMetric} className="w-full">
                    Log Metric
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .map((metric) => (
                <Card key={metric.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getMetricIcon(metric.type)}
                        <CardTitle className="text-lg capitalize">{metric.type.replace("_", " ")}</CardTitle>
                      </div>
                      {getTrendIcon(getMetricTrend(metric.type))}
                    </div>
                    <CardDescription>{metric.timestamp.toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {metric.value} {metric.unit}
                    </div>
                    {metric.notes && <p className="text-sm text-muted-foreground">{metric.notes}</p>}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Health Goals</h2>
            <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Set Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Health Goal</DialogTitle>
                  <DialogDescription>Create a new health target to work towards</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="goalType">Goal Type</Label>
                    <Select onValueChange={(value) => setNewGoal({ ...newGoal, type: value as HealthMetricType })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select goal type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sleep">Sleep</SelectItem>
                        <SelectItem value="exercise">Exercise</SelectItem>
                        <SelectItem value="steps">Steps</SelectItem>
                        <SelectItem value="weight">Weight</SelectItem>
                        <SelectItem value="mood">Mood</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="target">Target Value</Label>
                      <Input
                        id="target"
                        type="number"
                        value={newGoal.target || ""}
                        onChange={(e) => setNewGoal({ ...newGoal, target: Number(e.target.value) })}
                        placeholder="Enter target"
                      />
                    </div>
                    <div>
                      <Label htmlFor="goalUnit">Unit</Label>
                      <Input
                        id="goalUnit"
                        value={newGoal.unit || ""}
                        onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                        placeholder="e.g., hours, steps"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newGoal.deadline?.toISOString().split("T")[0] || ""}
                      onChange={(e) => setNewGoal({ ...newGoal, deadline: new Date(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="goalDescription">Description</Label>
                    <Input
                      id="goalDescription"
                      value={newGoal.description || ""}
                      onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                      placeholder="Describe your goal"
                    />
                  </div>
                  <Button onClick={addGoal} className="w-full">
                    Set Goal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TargetIcon className="h-5 w-5" />
                      <CardTitle className="text-lg">{goal.description}</CardTitle>
                    </div>
                    <Badge variant={goal.current >= goal.target ? "default" : "secondary"}>
                      {goal.current >= goal.target ? "Achieved" : "In Progress"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Due: {goal.deadline.toLocaleDateString()} • {goal.type.replace("_", " ")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {goal.current} / {goal.target} {goal.unit}
                      </span>
                    </div>
                    <Progress value={(goal.current / goal.target) * 100} className="h-2" />
                    <div className="text-center text-sm text-muted-foreground">
                      {Math.round((goal.current / goal.target) * 100)}% complete
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold">Health Insights & Recommendations</h2>

          <div className="space-y-4">
            {insights.map((insight) => (
              <Card key={insight.id} className={getInsightColor(insight.type)}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{insight.title}</h3>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      {insight.action && (
                        <div className="bg-white/50 rounded-md p-3">
                          <p className="font-medium text-sm">Recommended Action:</p>
                          <p className="text-sm">{insight.action}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
