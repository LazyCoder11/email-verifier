import { EmailVerifier } from "@/components/email-verifier";



export default function Home() {
  return (
    <main className="min-h-screen py-8 px-4 relative">
      <a href="https://pratikt.in" target="_blank" rel="noopener noreferrer" className="bg-green-200/50 border px-4 py-2 absolute right-8 bottom-8 border-green-500 rounded-md">
        Built by Pratik Trivedi
      </a>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Email Verifier</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Professional bulk email verification with syntax checking, MX validation, and SMTP verification. Verify
            hundreds of emails at once with detailed results.
          </p>
        </div>
        <EmailVerifier />
      </div>
    </main>
  )
}
