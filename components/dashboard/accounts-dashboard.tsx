"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LockIcon, EyeIcon, EyeOffIcon, CopyIcon, PlusIcon, RefreshCwIcon } from "lucide-react"

interface Account {
  id: string
  userId: string
  name: string
  username: string
  email?: string
  password: string
  website?: string
  category: "social" | "financial" | "work" | "entertainment" | "shopping" | "other"
  notes?: string
  lastUsed?: Date
  createdAt: Date
  tags?: string[]
}

export const AccountsDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [newAccount, setNewAccount] = useState<Partial<Account>>({})
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const userId = "user-123"

  useEffect(() => {
    loadSampleData()
  }, [])

  const loadSampleData = () => {
    const sampleAccounts: Account[] = [
      {
        id: "1",
        userId,
        name: "Gmail",
        username: "john.doe@gmail.com",
        email: "john.doe@gmail.com",
        password: "MySecurePass123!",
        website: "https://gmail.com",
        category: "work",
        notes: "Primary email account",
        lastUsed: new Date("2024-01-22"),
        createdAt: new Date("2020-01-15"),
        tags: ["email", "primary"],
      },
      {
        id: "2",
        userId,
        name: "Bank of America",
        username: "johndoe123",
        password: "BankPass456$",
        website: "https://bankofamerica.com",
        category: "financial",
        notes: "Primary checking account",
        lastUsed: new Date("2024-01-21"),
        createdAt: new Date("2019-03-10"),
        tags: ["banking", "primary"],
      },
      {
        id: "3",
        userId,
        name: "Netflix",
        username: "john.doe@gmail.com",
        password: "netflix123",
        website: "https://netflix.com",
        category: "entertainment",
        notes: "Family plan subscription",
        lastUsed: new Date("2024-01-20"),
        createdAt: new Date("2021-05-20"),
        tags: ["streaming", "entertainment"],
      },
      {
        id: "4",
        userId,
        name: "LinkedIn",
        username: "john.doe",
        email: "john.doe@gmail.com",
        password: "LinkedIn2024!",
        website: "https://linkedin.com",
        category: "social",
        notes: "Professional networking",
        lastUsed: new Date("2024-01-19"),
        createdAt: new Date("2018-08-12"),
        tags: ["professional", "networking"],
      },
      {
        id: "5",
        userId,
        name: "Amazon",
        username: "john.doe@gmail.com",
        password: "AmazonShop789",
        website: "https://amazon.com",
        category: "shopping",
        notes: "Prime member",
        lastUsed: new Date("2024-01-18"),
        createdAt: new Date("2017-12-05"),
        tags: ["shopping", "prime"],
      },
    ]

    setAccounts(sampleAccounts)
  }

  const generatePassword = (length = 16) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  const addAccount = () => {
    if (!newAccount.name || !newAccount.username || !newAccount.password) return

    const account: Account = {
      id: Date.now().toString(),
      userId,
      name: newAccount.name,
      username: newAccount.username,
      email: newAccount.email,
      password: newAccount.password,
      website: newAccount.website,
      category: newAccount.category || "other",
      notes: newAccount.notes,
      createdAt: new Date(),
      tags: [],
    }

    setAccounts([...accounts, account])
    setNewAccount({})
    setIsAddingAccount(false)
  }

  const togglePasswordVisibility = (accountId: string) => {
    const newVisible = new Set(visiblePasswords)
    if (newVisible.has(accountId)) {
      newVisible.delete(accountId)
    } else {
      newVisible.add(accountId)
    }
    setVisiblePasswords(newVisible)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getCategoryBadge = (category: Account["category"]) => {
    const colors = {
      social: "bg-blue-100 text-blue-800",
      financial: "bg-green-100 text-green-800",
      work: "bg-purple-100 text-purple-800",
      entertainment: "bg-pink-100 text-pink-800",
      shopping: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800",
    }
    return <Badge className={colors[category]}>{category}</Badge>
  }

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || account.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="h-full overflow-auto">
      <Tabs defaultValue="accounts" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Account Management</h2>
            <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                  <DialogDescription>Store your account credentials</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={newAccount.name || ""}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      placeholder="e.g., Gmail, Netflix, Bank"
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username/Email</Label>
                    <Input
                      id="username"
                      value={newAccount.username || ""}
                      onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                      placeholder="Enter username or email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="password"
                        type="password"
                        value={newAccount.password || ""}
                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                        placeholder="Enter password"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewAccount({ ...newAccount, password: generatePassword() })}
                      >
                        <RefreshCwIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="website">Website (optional)</Label>
                    <Input
                      id="website"
                      value={newAccount.website || ""}
                      onChange={(e) => setNewAccount({ ...newAccount, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      onValueChange={(value) =>
                        setNewAccount({ ...newAccount, category: value as Account["category"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={newAccount.notes || ""}
                      onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })}
                      placeholder="Additional notes"
                    />
                  </div>
                  <Button onClick={addAccount} className="w-full">
                    Add Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex space-x-4 mb-4">
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAccounts.map((account) => (
              <Card key={account.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <CardDescription>{account.username}</CardDescription>
                    </div>
                    {getCategoryBadge(account.category)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <LockIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 flex items-center space-x-2">
                        <Input
                          type={visiblePasswords.has(account.id) ? "text" : "password"}
                          value={account.password}
                          readOnly
                          className="text-sm"
                        />
                        <Button variant="ghost" size="sm" onClick={() => togglePasswordVisibility(account.id)}>
                          {visiblePasswords.has(account.id) ? (
                            <EyeOffIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(account.password)}>
                          <CopyIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {account.email && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <span className="text-sm">{account.email}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(account.email!)}>
                          <CopyIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {account.website && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Website:</span>
                        <a
                          href={account.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {account.website}
                        </a>
                      </div>
                    )}

                    {account.lastUsed && (
                      <div className="text-xs text-muted-foreground">
                        Last used: {account.lastUsed.toLocaleDateString()}
                      </div>
                    )}

                    {account.notes && (
                      <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">{account.notes}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold">Analytics</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{accounts.length}</div>
                <p className="text-xs text-muted-foreground">Stored</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recent activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {
                    accounts.filter(
                      (acc) => acc.lastUsed && acc.lastUsed > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    ).length
                  }
                </div>
                <p className="text-xs text-muted-foreground">Used this week</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Category distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {["social", "financial", "work", "entertainment", "shopping", "other"].map((category) => {
                  const count = accounts.filter((acc) => acc.category === category).length
                  const percentage = accounts.length > 0 ? (count / accounts.length) * 100 : 0
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getCategoryBadge(category as Account["category"])}
                        <span className="text-sm capitalize">{category}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={percentage} className="w-16 h-2" />
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
