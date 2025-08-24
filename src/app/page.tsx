'use client'

import { EmailVerifier } from "@/components/email-verifier";

export default function Home() {
  return (
    <main className="h-screen relative bg-[#f2f2f2]">
      <a href="https://pratikt.in" target="_blank" rel="noopener noreferrer" className="bg-green-200/50 border px-4 py-2 fixed right-8 bottom-8 border-green-500 rounded-md">
        <code>Built by Pratik Trivedi</code>
      </a>
      <div className="w-full mx-auto relative z-50 py-8 px-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">Email Verifier</h1>
          <p className="text-lg text-black max-w-2xl mx-auto">
            Professional bulk email verification with syntax checking, MX validation, and SMTP verification. Verify
            hundreds of emails at once with detailed results.
          </p>
        </div>
        <EmailVerifier />
      </div>
    </main>
  )
}
