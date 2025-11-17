"use client"

import type React from "react"
import { useEffect, useState } from "react"
import type { FinancialTransaction } from "@/types/erp"
import { FinancialService } from "@/lib/financial-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"
import { PlusIcon, TrendingUpIcon, TrendingDownIcon, DollarSignIcon, AlertCircleIcon } from "lucide-react"

interface BudgetCategory {
  id: string
  name: string
  limit: number
  spent: number
  color: string
}

interface SavingsGoal {
  id: string
  name: string
  target: number
  current: number
  deadline: Date
}

export const FinancialDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [balance, setBalance] = useState(0)
  const [spendingByCategory, setSpendingByCategory] = useState<Record<string, number>>({})
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([
    { id: "1", name: "Housing", limit: 1500, spent: 1200, color: "#0088FE" },
    { id: "2", name: "Food", limit: 600, spent: 450, color: "#00C49F" },
    { id: "3", name: "Transportation", limit: 300, spent: 280, color: "#FFBB28" },
    { id: "4", name: "Entertainment", limit: 200, spent: 150, color: "#FF8042" },
    { id: "5", name: "Utilities", limit: 250, spent: 220, color: "#8884D8" },
  ])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([
    {
      id: "1",
      name: "Emergency Fund",
      target: 10000,
      current: 5000,
      deadline: new Date(2023, 11, 31),
    },
    {
      id: "2",
      name: "Vacation",
      target: 3000,
      current: 1200,
      deadline: new Date(2023, 8, 30),
    },
  ])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryLimit, setNewCategoryLimit] = useState("")
  const [newGoalName, setNewGoalName] = useState("")
  const [newGoalTarget, setNewGoalTarget] = useState("")
  const [newGoalDeadline, setNewGoalDeadline] = useState("")
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("monthly")
  const userId = "user-123" // In a real app, get from auth

  useEffect(() => {
    const fetchFinancialData = async () => {
      const userTransactions = await FinancialService.getUserTransactions(userId)
      const userBalance = await FinancialService.calculateBalance(userId)
      const categorySpending = await FinancialService.getSpendingByCategory(userId)

      setTransactions(userTransactions)
      setBalance(userBalance)
      setSpendingByCategory(categorySpending)

      // Update budget categories with actual spending
      setBudgetCategories((prev) =>
        prev.map((category) => ({
          ...category,
          spent: categorySpending[category.name] || 0,
        })),
      )
    }

    fetchFinancialData()
  }, [userId])

  // Prepare data for category spending chart
  const categoryData = Object.entries(spendingByCategory).map(([category, amount]) => ({
    name: category,
    value: amount,
  }))

  // Prepare data for income vs expense chart
  const incomeTotal = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const expenseTotal = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

  const summaryData = [
    { name: "Income", value: incomeTotal },
    { name: "Expenses", value: expenseTotal },
  ]

  // Prepare data for spending over time chart
  const currentMonth = new Date()
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const dailySpendingData = daysInMonth.map((day) => {
    const dayTransactions = transactions.filter((t) => t.type === "expense" && isSameDay(new Date(t.date), day))
    const total = dayTransactions.reduce((sum, t) => sum + t.amount, 0)

    return {
      date: format(day, "MMM d"),
      amount: total,
    }
  })

  // Colors for the charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  const handleAddBudgetCategory = () => {
    if (!newCategoryName.trim() || !newCategoryLimit.trim()) return

    const limit = Number.parseFloat(newCategoryLimit)
    if (isNaN(limit) || limit <= 0) return

    const newCategory: BudgetCategory = {
      id: Date.now().toString(),
      name: newCategoryName,
      limit,
      spent: spendingByCategory[newCategoryName] || 0,
      color: COLORS[budgetCategories.length % COLORS.length],
    }

    setBudgetCategories([...budgetCategories, newCategory])
    setNewCategoryName("")
    setNewCategoryLimit("")
  }

  const handleAddSavingsGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget.trim() || !newGoalDeadline) return

    const target = Number.parseFloat(newGoalTarget)
    if (isNaN(target) || target <= 0) return

    const newGoal: SavingsGoal = {
      id: Date.now().toString(),
      name: newGoalName,
      target,
      current: 0,
      deadline: new Date(newGoalDeadline),
    }

    setSavingsGoals([...savingsGoals, newGoal])
    setNewGoalName("")
    setNewGoalTarget("")
    setNewGoalDeadline("")
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Summary of your financial situation</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">${incomeTotal.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Total Income</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">${expenseTotal.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="budget" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="spending">Spending</TabsTrigger>
              <TabsTrigger value="savings">Savings Goals</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="budget" className="pt-4 flex-1 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Budget Categories</CardTitle>
                    <CardDescription>Track your spending against budget limits</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[300px] overflow-auto">
                    <div className="space-y-4">
                      {budgetCategories.map((category) => (
                        <div key={category.id} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{category.name}</span>
                            <span className="text-sm">
                              ${category.spent.toFixed(2)} / ${category.limit.toFixed(2)}
                            </span>
                          </div>
                          <Progress
                            value={(category.spent / category.limit) * 100}
                            className="h-2"
                            indicatorClassName={category.spent > category.limit ? "bg-red-500" : undefined}
                          />
                          {category.spent > category.limit && (
                            <div className="flex items-center text-xs text-red-500">
                              <AlertCircleIcon className="h-3 w-3 mr-1" />
                              Over budget by ${(category.spent - category.limit).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div>
                        <Label htmlFor="categoryName">Category</Label>
                        <Input
                          id="categoryName"
                          placeholder="Category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryLimit">Monthly Limit</Label>
                        <Input
                          id="categoryLimit"
                          placeholder="0.00"
                          value={newCategoryLimit}
                          onChange={(e) => setNewCategoryLimit(e.target.value)}
                          type="number"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddBudgetCategory}
                      disabled={!newCategoryName.trim() || !newCategoryLimit.trim()}
                      className="w-full"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Budget Category
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Budget Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={budgetCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="limit"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {budgetCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="spending" className="pt-4 flex-1 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Spending by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>Spending Over Time</CardTitle>
                      <Select
                        value={timeframe}
                        onValueChange={(value: "daily" | "weekly" | "monthly") => setTimeframe(value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailySpendingData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={timeframe === "daily" ? 2 : 0} />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                        <Line type="monotone" dataKey="amount" stroke="#8884d8" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="savings" className="pt-4 flex-1 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Savings Goals</CardTitle>
                    <CardDescription>Track progress towards your financial goals</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[300px] overflow-auto">
                    <div className="space-y-6">
                      {savingsGoals.map((goal) => (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{goal.name}</span>
                            <span className="text-sm">
                              ${goal.current.toFixed(2)} / ${goal.target.toFixed(2)}
                            </span>
                          </div>
                          <Progress value={(goal.current / goal.target) * 100} className="h-2" />
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{((goal.current / goal.target) * 100).toFixed(0)}% complete</span>
                            <span>Target date: {format(new Date(goal.deadline), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <div className="grid grid-cols-3 gap-2 w-full">
                      <div>
                        <Label htmlFor="goalName">Goal Name</Label>
                        <Input
                          id="goalName"
                          placeholder="Goal name"
                          value={newGoalName}
                          onChange={(e) => setNewGoalName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="goalTarget">Target Amount</Label>
                        <Input
                          id="goalTarget"
                          placeholder="0.00"
                          value={newGoalTarget}
                          onChange={(e) => setNewGoalTarget(e.target.value)}
                          type="number"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="goalDeadline">Target Date</Label>
                        <Input
                          id="goalDeadline"
                          type="date"
                          value={newGoalDeadline}
                          onChange={(e) => setNewGoalDeadline(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddSavingsGoal}
                      disabled={!newGoalName.trim() || !newGoalTarget.trim() || !newGoalDeadline}
                      className="w-full"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Savings Goal
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Income vs Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summaryData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                          <Bar dataKey="value" fill="var(--color-value)">
                            <Cell fill="#4ade80" />
                            <Cell fill="#f87171" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="flex items-center p-4 border rounded-md">
                        <div className="mr-4 bg-green-100 p-2 rounded-full">
                          <TrendingUpIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Monthly Income</div>
                          <div className="text-xl font-bold">${incomeTotal.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="flex items-center p-4 border rounded-md">
                        <div className="mr-4 bg-red-100 p-2 rounded-full">
                          <TrendingDownIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Monthly Expenses</div>
                          <div className="text-xl font-bold">${expenseTotal.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="pt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground">No transactions recorded yet.</p>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-auto">
                      {transactions
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                        .slice(0, 10)
                        .map((transaction) => (
                          <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-md">
                            <div className="flex items-center">
                              <div
                                className={`p-2 rounded-full mr-3 ${
                                  transaction.type === "income" ? "bg-green-100" : "bg-red-100"
                                }`}
                              >
                                <DollarSignIcon
                                  className={`h-5 w-5 ${
                                    transaction.type === "income" ? "text-green-600" : "text-red-600"
                                  }`}
                                />
                              </div>
                              <div>
                                <div className="font-medium">{transaction.description}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(transaction.date), "MMM d, yyyy")}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                className={
                                  transaction.type === "income"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }
                              >
                                {transaction.category}
                              </Badge>
                              <span className={transaction.type === "income" ? "text-green-600" : "text-red-600"}>
                                {transaction.type === "income" ? "+" : "-"}${transaction.amount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View All Transactions
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
