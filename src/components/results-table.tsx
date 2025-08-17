/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useMemo } from "react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Progress } from "./ui/progress"
import { StatusPill } from "./status-pill"
import { Badge } from "./ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import {
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Clock,
  Server,
  AlertTriangle,
  Timer,
} from "lucide-react"
import Papa from "papaparse"
import type { VerificationResult } from "./email-verifier"

interface ResultsTableProps {
  results: VerificationResult[]
  isVerifying: boolean
  progress: { processed: number; total: number }
  estimatedTimeRemaining?: number | null
}

export function ResultsTable({ results, isVerifying, progress, estimatedTimeRemaining }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Calculate statistics
  const stats = useMemo(() => {
    const total = results.length
    const deliverable = results.filter((r) => r.status === "deliverable").length
    const notDeliverable = results.filter((r) => r.status === "not_deliverable").length
    const invalid = results.filter((r) => r.status === "invalid").length
    const disposable = results.filter((r) => r.status === "disposable").length
    const unknown = results.filter((r) => r.status === "unknown").length

    return { total, deliverable, notDeliverable, invalid, disposable, unknown }
  }, [results])

  // Filter and search results
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const matchesSearch = result.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = statusFilter === "all" || result.status === statusFilter
      return matchesSearch && matchesFilter
    })
  }, [results, searchTerm, statusFilter])

  const toggleRowExpansion = (email: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(email)) {
      newExpanded.delete(email)
    } else {
      newExpanded.add(email)
    }
    setExpandedRows(newExpanded)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  const exportToCsv = () => {
    const csvData = results.map((result) => ({
      email: result.email,
      status: result.status,
      syntaxOk: result.details.syntaxOk,
      disposable: result.details.disposable,
      mxRecords: result.details.mxRecords.join("; "),
      smtpCode: result.details.smtpResponse?.code || "",
      smtpText: result.details.smtpResponse?.text || "",
      timeTakenMs: result.details.timeTakenMs,
      error: result.details.error || "",
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `email-verification-results-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const progressPercentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0

  return (
    <Card className="p-6 shadow-lg h-full border-none bg-white backdrop-blur-xl">
      <div className="border-l-4 border-green-500 pl-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Verification Results</h2>
        <p className="text-sm text-gray-600">
          {isVerifying
            ? `Processing ${progress.processed} of ${progress.total} emails...`
            : `${results.length} email${results.length !== 1 ? "s" : ""} verified`}
        </p>
      </div>

      {/* Enhanced Progress Bar */}
      {isVerifying && (
        <div className="mb-6 space-y-3">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span className="font-medium">Verification Progress</span>
            <div className="flex items-center gap-4">
              <span>
                {progress.processed} / {progress.total} ({Math.round(progressPercentage)}%)
              </span>
              {estimatedTimeRemaining && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Timer className="h-3 w-3" />
                  <span className="text-xs">~{estimatedTimeRemaining}s remaining</span>
                </div>
              )}
            </div>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Started verification...</span>
            <span>
              {progress.processed > 0 && (
                <>
                  Average: {Math.round(results.reduce((sum, r) => sum + r.details.timeTakenMs, 0) / results.length)}ms
                  per email
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Statistics */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.deliverable}</div>
            <div className="text-xs text-gray-600">Deliverable</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.notDeliverable}</div>
            <div className="text-xs text-gray-600">Not Deliverable</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{stats.disposable}</div>
            <div className="text-xs text-gray-600">Disposable</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.invalid}</div>
            <div className="text-xs text-gray-600">Invalid</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.unknown}</div>
            <div className="text-xs text-gray-600">Unknown</div>
          </div>
        </div>
      )}

      {/* Controls */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="deliverable">Deliverable</SelectItem>
              <SelectItem value="not_deliverable">Not Deliverable</SelectItem>
              <SelectItem value="invalid">Invalid</SelectItem>
              <SelectItem value="disposable">Disposable</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCsv} variant="outline" className="whitespace-nowrap bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Results Table */}
      {filteredResults.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                {/* <TableHead className="w-12"></TableHead> */}
                <TableHead>Email Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Time (ms)</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result, index) => (
                <TableRow className="group" key={index}>
                  {/* <TableCell>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleRowExpansion(result.email)}
                      >
                        {expandedRows.has(result.email) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell> */}
                  <TableCell className="font-mono text-sm">{result.email}</TableCell>
                  <TableCell>
                    <StatusPill status={result.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-600">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {result.details.timeTakenMs}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(result.email)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* No Results */}
      {results.length === 0 && !isVerifying && (
        <div className="text-center py-8 text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No verification results yet. Add some emails and click verify to get started.</p>
        </div>
      )}

      {/* No Filtered Results */}
      {results.length > 0 && filteredResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No results match your current filters.</p>
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm("")
              setStatusFilter("all")
            }}
            className="mt-2"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </Card>
  )
}
