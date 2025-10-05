import Link from 'next/link';
import { Bot, BarChart3, TestTube, Settings, Home } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                Student Support Assistant
              </span>
            </Link>
            
            <div className="flex space-x-1">
              <Link 
                href="/dashboard"
                className="flex items-center px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              <Link 
                href="/dashboard/assistants"
                className="flex items-center px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Bot className="h-4 w-4 mr-2" />
                Assistants
              </Link>
              <Link 
                href="/dashboard/analytics"
                className="flex items-center px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Link>
              <Link 
                href="/dashboard/testing"
                className="flex items-center px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Testing
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}