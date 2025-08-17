import { render, screen } from "@testing-library/react"
import { StatusPill } from "@/components/status-pill"

describe("StatusPill", () => {
  test("renders deliverable status correctly", () => {
    render(<StatusPill status="deliverable" />)
    expect(screen.getByText("Deliverable")).toBeInTheDocument()
    expect(screen.getByRole("generic")).toHaveClass("bg-green-100", "text-green-800")
  })

  test("renders not_deliverable status correctly", () => {
    render(<StatusPill status="not_deliverable" />)
    expect(screen.getByText("Not Deliverable")).toBeInTheDocument()
    expect(screen.getByRole("generic")).toHaveClass("bg-red-100", "text-red-800")
  })

  test("renders invalid status correctly", () => {
    render(<StatusPill status="invalid" />)
    expect(screen.getByText("Invalid")).toBeInTheDocument()
    expect(screen.getByRole("generic")).toHaveClass("bg-gray-100", "text-gray-800")
  })

  test("renders disposable status correctly", () => {
    render(<StatusPill status="disposable" />)
    expect(screen.getByText("Disposable")).toBeInTheDocument()
    expect(screen.getByRole("generic")).toHaveClass("bg-amber-100", "text-amber-800")
  })

  test("renders unknown status correctly", () => {
    render(<StatusPill status="unknown" />)
    expect(screen.getByText("Unknown")).toBeInTheDocument()
    expect(screen.getByRole("generic")).toHaveClass("bg-blue-100", "text-blue-800")
  })

  test("applies custom className", () => {
    render(<StatusPill status="deliverable" className="custom-class" />)
    expect(screen.getByRole("generic")).toHaveClass("custom-class")
  })
})
