import Link from 'next/link'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header */}
      <header className="p-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          AI Messaging
        </Link>
      </header>
      
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
      
      {/* Simple footer */}
      <footer className="p-4 text-center text-sm text-gray-600">
        <p>&copy; 2025 AI Messaging Platform</p>
      </footer>
    </div>
  )
} 