"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BookOpenIcon,
  PlusIcon,
  FileTextIcon,
  LinkIcon,
  ImageIcon,
  SearchIcon,
  FolderIcon,
  ShoppingCartIcon,
  ExternalLinkIcon,
} from "lucide-react"

interface KnowledgeBase {
  id: string
  name: string
  description: string
  category: string
  type: "personal" | "purchased" | "shared"
  itemCount: number
  createdAt: Date
  lastModified: Date
}

interface KnowledgeItem {
  id: string
  title: string
  content: string
  type: "document" | "link" | "note" | "image"
  category: string
  knowledgeBaseId: string
  url?: string
  tags: string[]
  createdAt: Date
  lastModified: Date
}

const SAMPLE_KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: "kb-1",
    name: "Personal Notes",
    description: "My personal collection of notes and thoughts",
    category: "Personal",
    type: "personal",
    itemCount: 12,
    createdAt: new Date("2024-01-01"),
    lastModified: new Date(),
  },
  {
    id: "kb-2",
    name: "Work Resources",
    description: "Professional documents and references",
    category: "Professional",
    type: "personal",
    itemCount: 8,
    createdAt: new Date("2024-01-15"),
    lastModified: new Date(),
  },
]

const MARKETPLACE_KNOWLEDGE_BASES = [
  {
    id: "market-1",
    name: "Spanish Learning Pack",
    description: "Comprehensive Spanish language learning materials",
    category: "Education",
    price: "$9.99",
    rating: 4.8,
    downloads: 1250,
  },
  {
    id: "market-2",
    name: "Business Strategy Templates",
    description: "Professional business planning and strategy documents",
    category: "Business",
    price: "$19.99",
    rating: 4.9,
    downloads: 890,
  },
  {
    id: "market-3",
    name: "Cooking Recipes Collection",
    description: "International recipes and cooking techniques",
    category: "Lifestyle",
    price: "$7.99",
    rating: 4.7,
    downloads: 2100,
  },
]

export const KnowledgeDashboard: React.FC = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(SAMPLE_KNOWLEDGE_BASES)
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [isCreatingKB, setIsCreatingKB] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const [newKB, setNewKB] = useState({
    name: "",
    description: "",
    category: "",
  })

  const [newItem, setNewItem] = useState({
    title: "",
    content: "",
    type: "note" as "document" | "link" | "note" | "image",
    category: "",
    url: "",
    tags: "",
  })

  // Load data from localStorage
  useEffect(() => {
    const savedKBs = localStorage.getItem("personal-erp-knowledge-bases")
    const savedItems = localStorage.getItem("personal-erp-knowledge-items")

    if (savedKBs) {
      const parsedKBs = JSON.parse(savedKBs).map((kb: any) => ({
        ...kb,
        createdAt: new Date(kb.createdAt),
        lastModified: new Date(kb.lastModified),
      }))
      setKnowledgeBases(parsedKBs)
    }

    if (savedItems) {
      const parsedItems = JSON.parse(savedItems).map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        lastModified: new Date(item.lastModified),
      }))
      setKnowledgeItems(parsedItems)
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("personal-erp-knowledge-bases", JSON.stringify(knowledgeBases))
  }, [knowledgeBases])

  useEffect(() => {
    localStorage.setItem("personal-erp-knowledge-items", JSON.stringify(knowledgeItems))
  }, [knowledgeItems])

  const handleCreateKB = () => {
    if (!newKB.name || !newKB.description) return

    const knowledgeBase: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name: newKB.name,
      description: newKB.description,
      category: newKB.category || "General",
      type: "personal",
      itemCount: 0,
      createdAt: new Date(),
      lastModified: new Date(),
    }

    setKnowledgeBases((prev) => [...prev, knowledgeBase])
    setNewKB({ name: "", description: "", category: "" })
    setIsCreatingKB(false)
  }

  const handleAddItem = () => {
    if (!newItem.title || !selectedKnowledgeBase) return

    const item: KnowledgeItem = {
      id: `item-${Date.now()}`,
      title: newItem.title,
      content: newItem.content,
      type: newItem.type,
      category: newItem.category || "General",
      knowledgeBaseId: selectedKnowledgeBase.id,
      url: newItem.url || undefined,
      tags: newItem.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      createdAt: new Date(),
      lastModified: new Date(),
    }

    setKnowledgeItems((prev) => [...prev, item])

    // Update knowledge base item count
    setKnowledgeBases((prev) =>
      prev.map((kb) =>
        kb.id === selectedKnowledgeBase.id ? { ...kb, itemCount: kb.itemCount + 1, lastModified: new Date() } : kb,
      ),
    )

    setNewItem({
      title: "",
      content: "",
      type: "note",
      category: "",
      url: "",
      tags: "",
    })
    setIsAddingItem(false)
  }

  const filteredItems = knowledgeItems.filter((item) => {
    if (!selectedKnowledgeBase) return false
    if (item.knowledgeBaseId !== selectedKnowledgeBase.id) return false
    if (
      searchTerm &&
      !item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !item.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false
    return true
  })

  const categories = Array.from(new Set(knowledgeItems.map((item) => item.category)))

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileTextIcon className="h-4 w-4" />
      case "link":
        return <LinkIcon className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      default:
        return <FileTextIcon className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "personal":
        return "bg-blue-100 text-blue-800"
      case "purchased":
        return "bg-green-100 text-green-800"
      case "shared":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Knowledge Management
              </CardTitle>
              <CardDescription>Organize documents, links, and notes in categorized knowledge bases</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Dialog open={isCreatingKB} onOpenChange={setIsCreatingKB}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Knowledge Base
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Knowledge Base</DialogTitle>
                    <DialogDescription>Create a new knowledge base to organize your information</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="kbName">Name</Label>
                      <Input
                        id="kbName"
                        value={newKB.name}
                        onChange={(e) => setNewKB((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Project Research, Learning Materials"
                      />
                    </div>
                    <div>
                      <Label htmlFor="kbDescription">Description</Label>
                      <Textarea
                        id="kbDescription"
                        value={newKB.description}
                        onChange={(e) => setNewKB((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this knowledge base will contain..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="kbCategory">Category</Label>
                      <Input
                        id="kbCategory"
                        value={newKB.category}
                        onChange={(e) => setNewKB((prev) => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., Work, Personal, Education"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreatingKB(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateKB}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="my-knowledge" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="my-knowledge">My Knowledge</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            </TabsList>

            <TabsContent value="my-knowledge" className="flex-1 overflow-hidden">
              <div className="h-full flex">
                {/* Knowledge Bases List */}
                <div className="w-1/3 border-r pr-4">
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Knowledge Bases</h3>
                    <div className="space-y-2">
                      {knowledgeBases.map((kb) => (
                        <Card
                          key={kb.id}
                          className={`cursor-pointer transition-colors ${
                            selectedKnowledgeBase?.id === kb.id ? "bg-muted" : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedKnowledgeBase(kb)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm">{kb.name}</h4>
                              <Badge className={getTypeColor(kb.type)}>{kb.type}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{kb.description}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{kb.itemCount} items</span>
                              <span>{kb.category}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Knowledge Base Content */}
                <div className="flex-1 pl-4">
                  {selectedKnowledgeBase ? (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold">{selectedKnowledgeBase.name}</h2>
                          <p className="text-muted-foreground">{selectedKnowledgeBase.description}</p>
                        </div>
                        <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
                          <DialogTrigger asChild>
                            <Button>
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Add Item
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Add Knowledge Item</DialogTitle>
                              <DialogDescription>Add a new item to {selectedKnowledgeBase.name}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="itemTitle">Title</Label>
                                <Input
                                  id="itemTitle"
                                  value={newItem.title}
                                  onChange={(e) => setNewItem((prev) => ({ ...prev, title: e.target.value }))}
                                  placeholder="Item title..."
                                />
                              </div>
                              <div>
                                <Label htmlFor="itemType">Type</Label>
                                <Select
                                  value={newItem.type}
                                  onValueChange={(value: "document" | "link" | "note" | "image") =>
                                    setNewItem((prev) => ({ ...prev, type: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="note">Note</SelectItem>
                                    <SelectItem value="document">Document</SelectItem>
                                    <SelectItem value="link">Link</SelectItem>
                                    <SelectItem value="image">Image</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {newItem.type === "link" && (
                                <div>
                                  <Label htmlFor="itemUrl">URL</Label>
                                  <Input
                                    id="itemUrl"
                                    value={newItem.url}
                                    onChange={(e) => setNewItem((prev) => ({ ...prev, url: e.target.value }))}
                                    placeholder="https://..."
                                  />
                                </div>
                              )}
                              <div>
                                <Label htmlFor="itemContent">Content</Label>
                                <Textarea
                                  id="itemContent"
                                  value={newItem.content}
                                  onChange={(e) => setNewItem((prev) => ({ ...prev, content: e.target.value }))}
                                  placeholder="Content or description..."
                                  rows={4}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="itemCategory">Category</Label>
                                  <Input
                                    id="itemCategory"
                                    value={newItem.category}
                                    onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
                                    placeholder="Category..."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="itemTags">Tags (comma separated)</Label>
                                  <Input
                                    id="itemTags"
                                    value={newItem.tags}
                                    onChange={(e) => setNewItem((prev) => ({ ...prev, tags: e.target.value }))}
                                    placeholder="tag1, tag2, tag3"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsAddingItem(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleAddItem}>Add Item</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Search and Filter */}
                      <div className="flex space-x-2 mb-4">
                        <div className="flex-1 relative">
                          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Items List */}
                      <ScrollArea className="flex-1">
                        <div className="space-y-2">
                          {filteredItems.map((item) => (
                            <Card key={item.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    {getTypeIcon(item.type)}
                                    <h4 className="font-medium">{item.title}</h4>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline">{item.category}</Badge>
                                    {item.url && (
                                      <Button size="sm" variant="ghost" asChild>
                                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                                          <ExternalLinkIcon className="h-4 w-4" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{item.content}</p>
                                {item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.tags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <FolderIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Select a Knowledge Base</h3>
                        <p className="text-muted-foreground">Choose a knowledge base to view and manage its contents</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="marketplace" className="flex-1 overflow-auto">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Knowledge Base Marketplace</h3>
                <p className="text-muted-foreground">Discover and purchase pre-built knowledge bases</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {MARKETPLACE_KNOWLEDGE_BASES.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{item.name}</h4>
                        <Badge variant="outline">{item.price}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span>⭐ {item.rating}</span>
                        <span>{item.downloads} downloads</span>
                      </div>
                      <Badge className="mb-3">{item.category}</Badge>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1">
                          <ShoppingCartIcon className="h-4 w-4 mr-2" />
                          Purchase
                        </Button>
                        <Button size="sm" variant="outline">
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
