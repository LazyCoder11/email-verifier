"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { parseEmailList } from "../lib/verifier"
import { CheckCircle, Mail, Trash2, Play } from "lucide-react"

interface EmailInputProps {
  emails: string[]
  onEmailsChange: (emails: string[]) => void
  onVerify: () => void
  onClear: () => void
  isVerifying: boolean
}

export function EmailInput({ emails, onEmailsChange, onVerify, onClear, isVerifying }: EmailInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [validEmails, setValidEmails] = useState<string[]>([])

  useEffect(() => {
    // Update input value when emails prop changes (e.g., from CSV upload)
    if (emails.length > 0 && inputValue === "") {
      setInputValue(emails.join("\n"))
    }
  }, [emails, inputValue])

  const handleInputChange = (value: string) => {
    setInputValue(value)

    if (value.trim() === "") {
      setValidEmails([])
      onEmailsChange([])
      return
    }

    const parsedEmails = parseEmailList(value)
    setValidEmails(parsedEmails)
    onEmailsChange(parsedEmails)
  }

  const handleClear = () => {
    setInputValue("")
    setValidEmails([])
    onClear()
  }

  const handlePasteExample = () => {
    const exampleEmails = [
      "user@example.com",
      "test@gmail.com",
      "invalid-email",
      "disposable@mailinator.com",
      "business@company.org",
    ].join("\n")

    setInputValue(exampleEmails)
    handleInputChange(exampleEmails)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-input" className="text-sm font-medium text-gray-700">
          Email Addresses
        </Label>
        <p className="text-xs text-gray-500">
          Enter one email per line, or separate with commas. Duplicates will be automatically removed.
        </p>
        <Textarea
          id="email-input"
          placeholder="user@example.com&#10;test@domain.org&#10;another@company.net"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="min-h-[120px] font-mono text-sm resize-y"
          disabled={isVerifying}
        />
      </div>

      {validEmails.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            {validEmails.length} email{validEmails.length !== 1 ? "s" : ""} ready for verification
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onVerify}
          disabled={validEmails.length === 0 || isVerifying}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Play className="h-4 w-4 mr-2" />
          {isVerifying ? "Verifying..." : `Verify ${validEmails.length} Email${validEmails.length !== 1 ? "s" : ""}`}
        </Button>

        <Button variant="outline" onClick={handleClear} disabled={isVerifying}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear
        </Button>

        <Button
          variant="ghost"
          onClick={handlePasteExample}
          disabled={isVerifying}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Mail className="h-4 w-4 mr-2" />
          Load Example
        </Button>
      </div>

      {inputValue && validEmails.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">No valid emails found. Please check your input format.</p>
        </div>
      )}
    </div>
  )
}
