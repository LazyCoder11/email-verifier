/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { EmailVerifier } from "@/lib/email-verifier";
import { rateLimiter } from "@/lib/rate-limiter";
import { parseEmailList } from "@/lib/verifier";

export const runtime = "nodejs";

// Configuration from environment variables
const config = {
  smtpTimeout: Number.parseInt(process.env.SMTP_TIMEOUT_MS || "8000"),
  maxConcurrent: Number.parseInt(process.env.MAX_CONCURRENT_SMTP || "5"),
  fromEmail: process.env.SMTP_FROM_EMAIL || "no-reply@example.com",
  allowSmtpVerification: process.env.ALLOW_SMTP_VERIFICATION !== "false",
  maxEmailsPerRequest: Number.parseInt(
    process.env.MAX_EMAILS_PER_REQUEST || "200"
  ),
};

// Initialize email verifier
const emailVerifier = new EmailVerifier({
  smtpTimeout: config.smtpTimeout,
  maxConcurrent: config.maxConcurrent,
  fromEmail: config.fromEmail,
  allowSmtpVerification: config.allowSmtpVerification,
});

function getClientIP(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to a default identifier
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Check rate limit
    if (!rateLimiter.isAllowed(clientIP)) {
      const resetTime = rateLimiter.getResetTime(clientIP);
      const remainingTime = Math.ceil((resetTime - Date.now()) / 1000 / 60); // minutes

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Try again in ${remainingTime} minutes.`,
          resetTime: resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": config.maxEmailsPerRequest.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime.toString(),
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();

    if (!body.emails || !Array.isArray(body.emails)) {
      return NextResponse.json(
        { error: "Invalid request", message: "emails array is required" },
        { status: 400 }
      );
    }

    // Normalize and validate email list
    let emails: string[] = [];

    if (typeof body.emails[0] === "string" && body.emails.length === 1) {
      // Handle case where emails might be passed as a single string
      emails = parseEmailList(body.emails[0]);
    } else {
      emails = body.emails
        .filter((email: any) => typeof email === "string")
        .map((email: string) => email.trim().toLowerCase())
        .filter((email: string) => email.length > 0);
    }

    // Remove duplicates
    emails = [...new Set(emails)];

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "Invalid request", message: "No valid emails provided" },
        { status: 400 }
      );
    }

    if (emails.length > config.maxEmailsPerRequest) {
      return NextResponse.json(
        {
          error: "Too many emails",
          message: `Maximum ${config.maxEmailsPerRequest} emails allowed per request. You provided ${emails.length}.`,
        },
        { status: 400 }
      );
    }

    // Perform email verification
    console.log(
      `Starting verification of ${emails.length} emails for IP: ${clientIP}`
    );
    const startTime = Date.now();

    const results = await emailVerifier.verifyEmails(emails);

    const totalTime = Date.now() - startTime;
    console.log(
      `Completed verification of ${emails.length} emails in ${totalTime}ms`
    );

    // Add rate limit headers to response
    const remaining = rateLimiter.getRemainingRequests(clientIP);
    const resetTime = rateLimiter.getResetTime(clientIP);

    return NextResponse.json(
      {
        results,
        meta: {
          totalEmails: emails.length,
          totalTimeMs: totalTime,
          averageTimeMs: Math.round(totalTime / emails.length),
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": config.maxEmailsPerRequest.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Email verification error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An error occurred during email verification",
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
