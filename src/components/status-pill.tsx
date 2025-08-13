import { cn } from "../lib/utils"
import { CheckCircle, XCircle, AlertCircle, Shield, HelpCircle } from "lucide-react"

interface StatusPillProps {
  status: "deliverable" | "not_deliverable" | "invalid" | "disposable" | "unknown"
  className?: string
}

const statusConfig = {
  deliverable: {
    label: "Deliverable",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  not_deliverable: {
    label: "Not Deliverable",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
  invalid: {
    label: "Invalid",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: AlertCircle,
  },
  disposable: {
    label: "Disposable",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Shield,
  },
  unknown: {
    label: "Unknown",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: HelpCircle,
  },
}

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.color,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
