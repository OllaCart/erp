"use client"

import type React from "react"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IntegrationsDashboard } from "./integrations-dashboard"
import { ContextVisualization } from "./context-visualization"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NetworkIcon, LinkIcon, UserIcon, BellIcon, PaletteIcon, ShieldIcon } from "lucide-react"

export const SettingsDashboard: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      taskReminders: true,
      goalUpdates: true,
      financialAlerts: true,
    },
    privacy: {
      profilePublic: false,
      shareProgress: true,
      allowAIAnalysis: true,
    },
    preferences: {
      theme: "system",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/dd/yyyy",
    },
  })

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }))
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Settings & Personalization
          </CardTitle>
          <CardDescription>Customize your personal ERP experience</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex-shrink-0 grid grid-cols-2 md:grid-cols-6 w-full">
              <TabsTrigger value="profile" className="flex items-center">
                <UserIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center">
                <BellIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center">
                <ShieldIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center">
                <PaletteIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="contexts" className="flex items-center">
                <NetworkIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Contexts</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center">
                <LinkIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Integrations</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Manage your personal information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john.doe@example.com" />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings.preferences.timezone}
                      onValueChange={(value) => updateSetting("preferences", "timezone", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button>Save Profile</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Delivery Methods</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="emailNotifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={settings.notifications.email}
                        onCheckedChange={(checked) => updateSetting("notifications", "email", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="pushNotifications">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                      </div>
                      <Switch
                        id="pushNotifications"
                        checked={settings.notifications.push}
                        onCheckedChange={(checked) => updateSetting("notifications", "push", checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Types</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="taskReminders">Task Reminders</Label>
                        <p className="text-sm text-muted-foreground">Get reminded about upcoming tasks</p>
                      </div>
                      <Switch
                        id="taskReminders"
                        checked={settings.notifications.taskReminders}
                        onCheckedChange={(checked) => updateSetting("notifications", "taskReminders", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="goalUpdates">Goal Updates</Label>
                        <p className="text-sm text-muted-foreground">Notifications about goal progress</p>
                      </div>
                      <Switch
                        id="goalUpdates"
                        checked={settings.notifications.goalUpdates}
                        onCheckedChange={(checked) => updateSetting("notifications", "goalUpdates", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="financialAlerts">Financial Alerts</Label>
                        <p className="text-sm text-muted-foreground">Budget and spending notifications</p>
                      </div>
                      <Switch
                        id="financialAlerts"
                        checked={settings.notifications.financialAlerts}
                        onCheckedChange={(checked) => updateSetting("notifications", "financialAlerts", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="mt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security</CardTitle>
                  <CardDescription>Control your privacy and data sharing preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="profilePublic">Public Profile</Label>
                      <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                    </div>
                    <Switch
                      id="profilePublic"
                      checked={settings.privacy.profilePublic}
                      onCheckedChange={(checked) => updateSetting("privacy", "profilePublic", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="shareProgress">Share Progress</Label>
                      <p className="text-sm text-muted-foreground">Allow sharing of goal progress with group members</p>
                    </div>
                    <Switch
                      id="shareProgress"
                      checked={settings.privacy.shareProgress}
                      onCheckedChange={(checked) => updateSetting("privacy", "shareProgress", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allowAIAnalysis">AI Analysis</Label>
                      <p className="text-sm text-muted-foreground">Allow AI to analyze your data for insights</p>
                    </div>
                    <Switch
                      id="allowAIAnalysis"
                      checked={settings.privacy.allowAIAnalysis}
                      onCheckedChange={(checked) => updateSetting("privacy", "allowAIAnalysis", checked)}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-4">Data Management</h4>
                    <div className="space-y-2">
                      <Button variant="outline">Export My Data</Button>
                      <Button variant="outline">Download Privacy Report</Button>
                      <Button variant="destructive">Delete Account</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="mt-4 flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance & Preferences</CardTitle>
                  <CardDescription>Customize the look and feel of your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={settings.preferences.theme}
                      onValueChange={(value) => updateSetting("preferences", "theme", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={settings.preferences.language}
                      onValueChange={(value) => updateSetting("preferences", "language", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select
                      value={settings.preferences.dateFormat}
                      onValueChange={(value) => updateSetting("preferences", "dateFormat", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button>Save Preferences</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contexts" className="mt-4 flex-1 overflow-hidden">
              <ContextVisualization />
            </TabsContent>

            <TabsContent value="integrations" className="mt-4 flex-1 overflow-hidden">
              <IntegrationsDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
