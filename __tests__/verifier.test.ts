import { validateEmailSyntax, extractDomain, parseEmailList } from "@/lib/verifier"
import { isDisposableDomain } from "@/lib/disposable-domains"

describe("Email Syntax Validation", () => {
  test("validates correct email formats", () => {
    expect(validateEmailSyntax("user@example.com")).toBe(true)
    expect(validateEmailSyntax("test.email+tag@domain.co.uk")).toBe(true)
    expect(validateEmailSyntax("user123@test-domain.org")).toBe(true)
  })

  test("rejects invalid email formats", () => {
    expect(validateEmailSyntax("invalid-email")).toBe(false)
    expect(validateEmailSyntax("@domain.com")).toBe(false)
    expect(validateEmailSyntax("user@")).toBe(false)
    expect(validateEmailSyntax("user..double.dot@domain.com")).toBe(false)
    expect(validateEmailSyntax("")).toBe(false)
  })

  test("handles edge cases", () => {
    expect(validateEmailSyntax("a".repeat(65) + "@domain.com")).toBe(false) // local part too long
    expect(validateEmailSyntax("user@" + "a".repeat(254) + ".com")).toBe(false) // domain too long
  })
})

describe("Domain Extraction", () => {
  test("extracts domain correctly", () => {
    expect(extractDomain("user@example.com")).toBe("example.com")
    expect(extractDomain("test@sub.domain.org")).toBe("sub.domain.org")
  })

  test("handles invalid emails", () => {
    expect(extractDomain("invalid-email")).toBe("")
    expect(extractDomain("@domain.com")).toBe("domain.com")
  })
})

describe("Email List Parsing", () => {
  test("parses comma-separated emails", () => {
    const input = "user1@example.com, user2@test.org, user3@domain.net"
    const expected = ["user1@example.com", "user2@test.org", "user3@domain.net"]
    expect(parseEmailList(input)).toEqual(expected)
  })

  test("parses newline-separated emails", () => {
    const input = "user1@example.com\nuser2@test.org\nuser3@domain.net"
    const expected = ["user1@example.com", "user2@test.org", "user3@domain.net"]
    expect(parseEmailList(input)).toEqual(expected)
  })

  test("removes duplicates", () => {
    const input = "user@example.com, user@example.com, test@domain.org"
    const expected = ["user@example.com", "test@domain.org"]
    expect(parseEmailList(input)).toEqual(expected)
  })

  test("handles mixed separators and whitespace", () => {
    const input = " user1@example.com , user2@test.org\n user3@domain.net  "
    const expected = ["user1@example.com", "user2@test.org", "user3@domain.net"]
    expect(parseEmailList(input)).toEqual(expected)
  })
})

describe("Disposable Domain Detection", () => {
  test("detects known disposable domains", () => {
    expect(isDisposableDomain("mailinator.com")).toBe(true)
    expect(isDisposableDomain("tempmail.org")).toBe(true)
    expect(isDisposableDomain("guerrillamail.com")).toBe(true)
  })

  test("allows legitimate domains", () => {
    expect(isDisposableDomain("gmail.com")).toBe(false)
    expect(isDisposableDomain("example.com")).toBe(false)
    expect(isDisposableDomain("company.org")).toBe(false)
  })

  test("is case insensitive", () => {
    expect(isDisposableDomain("MAILINATOR.COM")).toBe(true)
    expect(isDisposableDomain("TempMail.ORG")).toBe(true)
  })
})
