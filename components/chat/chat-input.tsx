"use client"

import type React from "react"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessages } from "@/context/message-context"
import { PlaneIcon as PaperPlaneIcon, PlusCircleIcon, UsersIcon, UserPlusIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState("")
  const { sendMessage, isLoading, createGroupChat } = useMessages()
  const router = useRouter()
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [groupChatData, setGroupChatData] = useState({
    name: "",
    description: "",
    goal: "",
    participants: "",
    isGoalOriented: false,
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    await sendMessage(message)
    setMessage("")
  }

  const navigateToForm = (formType: string) => {
    router.push(`/forms/${formType}`)
  }

  const insertTemplate = (template: string) => {
    setMessage(template)
  }

  const handleCreateGroupChat = async () => {
    if (!groupChatData.name.trim()) return

    const participants = groupChatData.participants
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p)

    await createGroupChat({
      name: groupChatData.name,
      description: groupChatData.description,
      goal: groupChatData.goal,
      participants,
      isGoalOriented: groupChatData.isGoalOriented,
    })

    setGroupChatData({
      name: "",
      description: "",
      goal: "",
      participants: "",
      isGoalOriented: false,
    })
    setShowGroupDialog(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-4 border-t">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon" variant="ghost">
            <PlusCircleIcon className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Forms</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigateToForm("transaction")}>Log Transaction</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateToForm("task")}>Create Task</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigateToForm("event")}>Schedule Event</DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Group Chat</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setShowGroupDialog(true)}>
              <UsersIcon className="h-4 w-4 mr-2" />
              Create Group Chat
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => insertTemplate("Invite John (john@example.com) to discuss our project goals")}
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Invite to Chat
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Templates</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => insertTemplate("Log $50 expense for groceries")}>
              Log Expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertTemplate("Schedule meeting with John at 2 PM tomorrow")}>
              Schedule Meeting
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertTemplate("Remind me to pay rent on the 1st")}>
              Set Reminder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertTemplate("Show my pending tasks")}>View Tasks</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1"
        disabled={isLoading}
      />

      <Button type="submit" size="icon" disabled={isLoading || !message.trim()}>
        <PaperPlaneIcon className="h-5 w-5" />
      </Button>

      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Group Chat</DialogTitle>
            <DialogDescription>Create a goal-oriented group chat with AI facilitation</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupName" className="text-right">
                Name
              </Label>
              <Input
                id="groupName"
                value={groupChatData.name}
                onChange={(e) => setGroupChatData({ ...groupChatData, name: e.target.value })}
                className="col-span-3"
                placeholder="Group name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupDescription" className="text-right">
                Description
              </Label>
              <Textarea
                id="groupDescription"
                value={groupChatData.description}
                onChange={(e) => setGroupChatData({ ...groupChatData, description: e.target.value })}
                className="col-span-3"
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupGoal" className="text-right">
                Goal
              </Label>
              <Input
                id="groupGoal"
                value={groupChatData.goal}
                onChange={(e) => setGroupChatData({ ...groupChatData, goal: e.target.value })}
                className="col-span-3"
                placeholder="What do you want to achieve?"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="groupParticipants" className="text-right">
                Participants
              </Label>
              <Input
                id="groupParticipants"
                value={groupChatData.participants}
                onChange={(e) => setGroupChatData({ ...groupChatData, participants: e.target.value })}
                className="col-span-3"
                placeholder="email1@example.com, +1234567890"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="goalOriented" className="text-right">
                AI Facilitated
              </Label>
              <div className="col-span-3">
                <input
                  type="checkbox"
                  id="goalOriented"
                  checked={groupChatData.isGoalOriented}
                  onChange={(e) => setGroupChatData({ ...groupChatData, isGoalOriented: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="goalOriented" className="ml-2 text-sm">
                  Enable AI goal facilitation
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateGroupChat} disabled={!groupChatData.name.trim()}>
              Create Group Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
