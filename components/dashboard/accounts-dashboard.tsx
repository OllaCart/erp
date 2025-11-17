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
import {
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  PlusIcon,
  ShieldIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  RefreshCwIcon,
  DownloadIcon,
  UploadIcon,
  ShareIcon,
  FingerprintIcon,
  UsersIcon,
  TrendingUpIcon,
} from "lucide-react"

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
  securityScore: number
  twoFactorEnabled: boolean
  passwordExpiry?: Date
  tags?: string[]
}

interface SecurityAudit {
  id: string
  type: "weak_password" | "duplicate_password" | "expired_password" | "no_2fa" | "breach_detected"
  severity: "low" | "medium" | "high" | "critical"
  accountId: string
  description: string
  recommendation: string
  resolved: boolean
}

export const AccountsDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [securityAudits, setSecurityAudits] = useState<SecurityAudit[]>([])
  const [newAccount, setNewAccount] = useState<Partial<Account>>({})
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [generatedPassword, setGeneratedPassword] = useState("")

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
        securityScore: 85,
        twoFactorEnabled: true,
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
        securityScore: 92,
        twoFactorEnabled: true,
        passwordExpiry: new Date("2024-06-15"),
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
        securityScore: 45,
        twoFactorEnabled: false,
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
        securityScore: 78,
        twoFactorEnabled: true,
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
        securityScore: 62,
        twoFactorEnabled: false,
        tags: ["shopping", "prime"],
      },
    ]

    const sampleAudits: SecurityAudit[] = [
      {
        id: "1",
        type: "weak_password",
        severity: "high",
        accountId: "3",
        description: "Netflix account uses a weak password",
        recommendation:
          "Use a stronger password with at least 12 characters, including uppercase, lowercase, numbers, and symbols",
        resolved: false,
      },
      {
        id: "2",
        type: "no_2fa",
        severity: "medium",
        accountId: "3",
        description: "Netflix account doesn't have two-factor authentication enabled",
        recommendation: "Enable two-factor authentication for better security",
        resolved: false,
      },
      {
        id: "3",
        type: "no_2fa",
        severity: "high",
        accountId: "5",
        description: "Amazon account doesn't have two-factor authentication enabled",
        recommendation: "Enable two-factor authentication for your shopping account",
        resolved: false,
      },
      {
        id: "4",
        type: "expired_password",
        severity: "medium",
        accountId: "2",
        description: "Bank of America password will expire in 30 days",
        recommendation: "Update your password before it expires",
        resolved: false,
      },
    ]

    setAccounts(sampleAccounts)
    setSecurityAudits(sampleAudits)
  }

  const generatePassword = (length = 16) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setGeneratedPassword(password)
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
      securityScore: calculateSecurityScore(newAccount.password || ""),
      twoFactorEnabled: false,
      tags: [],
    }

    setAccounts([...accounts, account])
    setNewAccount({})
    setIsAddingAccount(false)
  }

  const calculateSecurityScore = (password: string): number => {
    let score = 0
    if (password.length >= 8) score += 20
    if (password.length >= 12) score += 20
    if (/[a-z]/.test(password)) score += 10
    if (/[A-Z]/.test(password)) score += 10
    if (/[0-9]/.test(password)) score += 10
    if (/[^A-Za-z0-9]/.test(password)) score += 20
    if (password.length >= 16) score += 10
    return Math.min(score, 100)
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

  const getSecurityBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
    if (score >= 40) return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>
  }

  const getSeverityIcon = (severity: SecurityAudit["severity"]) => {
    switch (severity) {
      case "critical":
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      case "high":
        return <AlertTriangleIcon className="h-5 w-5 text-red-500" />
      case "medium":
        return <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
      case "low":
        return <AlertTriangleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || account.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const overallSecurityScore =
    accounts.length > 0 ? Math.round(accounts.reduce((sum, acc) => sum + acc.securityScore, 0) / accounts.length) : 0

  const criticalIssues = securityAudits.filter((audit) => audit.severity === "critical" && !audit.resolved).length
  const highIssues = securityAudits.filter((audit) => audit.severity === "high" && !audit.resolved).length

  return (
    <div className="h-full overflow-auto">
      <Tabs defaultValue="accounts" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
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
                  <DialogDescription>Store your account credentials securely</DialogDescription>
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
                    <div className="flex items-center space-x-2">
                      {getCategoryBadge(account.category)}
                      {getSecurityBadge(account.securityScore)}
                    </div>
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

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Security Score:</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={account.securityScore} className="w-16 h-2" />
                        <span className="font-medium">{account.securityScore}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">2FA:</span>
                      <div className="flex items-center space-x-1">
                        {account.twoFactorEnabled ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-600" />
                        )}
                        <span>{account.twoFactorEnabled ? "Enabled" : "Disabled"}</span>
                      </div>
                    </div>

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

        <TabsContent value="security" className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Overall Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold text-blue-600">{overallSecurityScore}%</div>
                  <div className="flex-1">
                    <Progress value={overallSecurityScore} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {overallSecurityScore >= 80
                        ? "Excellent"
                        : overallSecurityScore >= 60
                          ? "Good"
                          : "Needs Improvement"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Critical Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <AlertTriangleIcon className="h-8 w-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{criticalIssues + highIssues}</div>
                    <p className="text-xs text-muted-foreground">Require attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">2FA Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <ShieldIcon className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {accounts.filter((acc) => acc.twoFactorEnabled).length}/{accounts.length}
                    </div>
                    <p className="text-xs text-muted-foreground">Accounts protected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security Audit Results</CardTitle>
              <CardDescription>Issues found in your accounts that need attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityAudits
                  .filter((audit) => !audit.resolved)
                  .map((audit) => {
                    const account = accounts.find((acc) => acc.id === audit.accountId)
                    return (
                      <div key={audit.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                        {getSeverityIcon(audit.severity)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{account?.name}</h4>
                            <Badge variant={audit.severity === "critical" ? "destructive" : "secondary"}>
                              {audit.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{audit.description}</p>
                          <p className="text-sm font-medium text-blue-600">{audit.recommendation}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Fix Issue
                        </Button>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold">Security Tools</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <KeyIcon className="h-5 w-5 mr-2" />
                  Password Generator
                </CardTitle>
                <CardDescription>Generate secure passwords for your accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input value={generatedPassword} readOnly placeholder="Generated password will appear here" />
                    <Button onClick={() => copyToClipboard(generatedPassword)} disabled={!generatedPassword}>
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => generatePassword(12)} variant="outline" size="sm">
                      12 chars
                    </Button>
                    <Button onClick={() => generatePassword(16)} variant="outline" size="sm">
                      16 chars
                    </Button>
                    <Button onClick={() => generatePassword(20)} variant="outline" size="sm">
                      20 chars
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <DownloadIcon className="h-5 w-5 mr-2" />
                  Import/Export
                </CardTitle>
                <CardDescription>Backup and restore your account data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full bg-transparent" variant="outline">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export Accounts
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Import Accounts
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <ShareIcon className="h-5 w-5 mr-2" />
                  Account Sharing
                </CardTitle>
                <CardDescription>Securely share account access with trusted contacts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full bg-transparent" variant="outline">
                    <ShareIcon className="h-4 w-4 mr-2" />
                    Share Account
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <UsersIcon className="h-4 w-4 mr-2" />
                    Manage Shared
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FingerprintIcon className="h-5 w-5 mr-2" />
                  Biometric Authentication
                </CardTitle>
                <CardDescription>Enable biometric login for enhanced security</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full bg-transparent" variant="outline">
                    <FingerprintIcon className="h-4 w-4 mr-2" />
                    Setup Fingerprint
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <EyeIcon className="h-4 w-4 mr-2" />
                    Setup Face ID
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold">Account Analytics</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{accounts.length}</div>
                <p className="text-xs text-muted-foreground">Stored securely</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Strong Passwords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{accounts.filter((acc) => acc.securityScore >= 80).length}</div>
                <p className="text-xs text-muted-foreground">80%+ security score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">2FA Enabled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{accounts.filter((acc) => acc.twoFactorEnabled).length}</div>
                <p className="text-xs text-muted-foreground">Two-factor protected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Category Distribution</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUpIcon className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Security Improving</span>
                    </div>
                    <span className="text-sm text-muted-foreground">+15% this month</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">3 accounts need stronger passwords</p>
                    <p className="text-sm text-muted-foreground">2 accounts missing two-factor authentication</p>
                    <p className="text-sm text-muted-foreground">1 password expires in 30 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
