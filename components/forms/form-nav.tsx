"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"

export const FormNav: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <Link href="/" passHref>
        <Button variant="ghost" className="flex items-center">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Chat
        </Button>
      </Link>
    </div>
  )
}
