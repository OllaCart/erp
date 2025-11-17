import type React from "react"
import { FormNav } from "@/components/forms/form-nav"

export default function FormsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <FormNav />
      {children}
    </>
  )
}
