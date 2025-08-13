/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { parseEmailList } from "@/lib/verifier"
import { Upload, FileText, CheckCircle, AlertCircle, Play, Trash2, Download } from "lucide-react"
import Papa from "papaparse"

interface CsvUploaderProps {
  onEmailsLoaded: (emails: string[]) => void
  onVerify: () => void
  onClear: () => void
  isVerifying: boolean
  emailCount: number
}

export function CsvUploader({ onEmailsLoaded, onVerify, onClear, isVerifying, emailCount }: CsvUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    setFileName(file.name)
    setUploadStatus("idle")
    setErrorMessage("")

    Papa.parse(file, {
      complete: (results) => {
        try {
          // Extract emails from CSV data
          const emails: string[] = []

          // Handle different CSV structures
          results.data.forEach((row: any) => {
            if (Array.isArray(row)) {
              // Take the first column that looks like an email
              const emailCandidate = row.find((cell: any) => typeof cell === "string" && cell.includes("@"))
              if (emailCandidate) {
                emails.push(emailCandidate.trim())
              }
            } else if (typeof row === "object" && row !== null) {
              // Handle object format (with headers)
              const values = Object.values(row)
              const emailCandidate = values.find((cell: any) => typeof cell === "string" && cell.includes("@"))
              if (emailCandidate) {
                emails.push(emailCandidate.toString().trim())
              }
            }
          })

          if (emails.length === 0) {
            setUploadStatus("error")
            setErrorMessage(
              "No email addresses found in the CSV file. Make sure emails are in the first column or clearly identifiable.",
            )
            return
          }

          // Parse and validate emails
          const validEmails = parseEmailList(emails.join("\n"))

          if (validEmails.length === 0) {
            setUploadStatus("error")
            setErrorMessage("No valid email addresses found in the CSV file.")
            return
          }

          onEmailsLoaded(validEmails)
          setUploadStatus("success")
        } catch (error) {
          setUploadStatus("error")
          setErrorMessage("Error processing CSV file. Please check the file format.")
        }
      },
      error: (error) => {
        setUploadStatus("error")
        setErrorMessage(`CSV parsing error: ${error.message}`)
      },
      skipEmptyLines: true,
      header: false, // We'll handle headers manually
    })
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setUploadStatus("error")
      setErrorMessage("Please select a CSV file.")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus("error")
      setErrorMessage("File size must be less than 5MB.")
      return
    }

    processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleClear = () => {
    setFileName("")
    setUploadStatus("idle")
    setErrorMessage("")
    onClear()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const downloadSampleCsv = () => {
    const sampleData = [
      ["email"],
      ["user@example.com"],
      ["test@gmail.com"],
      ["business@company.org"],
      ["disposable@tempmail.org"],
      ["invalid-email-format"],
    ]

    const csv = Papa.unparse(sampleData)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample-emails.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Upload CSV File</Label>
        <p className="text-xs text-gray-500">
          Upload a CSV file with email addresses. The system will automatically detect the email column.
        </p>
      </div>

      {/* File Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? "border-green-400 bg-green-50" : "border-gray-300"}
          ${uploadStatus === "error" ? "border-red-300 bg-red-50" : ""}
          ${uploadStatus === "success" ? "border-green-300 bg-green-50" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isVerifying}
        />

        {uploadStatus === "idle" && (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600">
              Drag and drop your CSV file here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-green-600 hover:text-green-700 font-medium"
                disabled={isVerifying}
              >
                browse to upload
              </button>
            </p>
            <p className="text-xs text-gray-400">Maximum file size: 5MB</p>
          </div>
        )}

        {uploadStatus === "success" && (
          <div className="space-y-2">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
            <p className="text-sm text-green-700">
              <FileText className="h-4 w-4 inline mr-1" />
              {fileName}
            </p>
            <p className="text-sm text-green-600">
              {emailCount} email{emailCount !== 1 ? "s" : ""} loaded successfully
            </p>
          </div>
        )}

        {uploadStatus === "error" && (
          <div className="space-y-2">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
              disabled={isVerifying}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onVerify}
          disabled={emailCount === 0 || isVerifying}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Play className="h-4 w-4 mr-2" />
          {isVerifying ? "Verifying..." : `Verify ${emailCount} Email${emailCount !== 1 ? "s" : ""}`}
        </Button>

        <Button variant="outline" onClick={handleClear} disabled={isVerifying}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear
        </Button>

        <Button
          variant="ghost"
          onClick={downloadSampleCsv}
          disabled={isVerifying}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Sample CSV
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <strong>CSV Format Tips:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Put email addresses in the first column or any column</li>
          <li>Headers are optional - the system will auto-detect emails</li>
          <li>Supports both comma and semicolon separators</li>
          <li>Empty rows and invalid emails will be automatically filtered</li>
        </ul>
      </div>
    </div>
  )
}
