import Link from 'next/link';
import { Bot, FileText, MessageCircle, TrendingUp, Plus, Calendar } from 'lucide-react';
import { Assistant } from '@/lib/types';
import { FileStorage } from '@/lib/file-storage';
import { Suspense, cache } from 'react';

// Loading component for the dashboard stats
function DashboardStatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading component for assistants list
function AssistantsListLoading() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Your Assistants</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded mb-2 w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="flex space-x-2 ml-4">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Server component for dashboard stats
async function DashboardStats({ assistants }: { assistants: Assistant[] }) {
  // Calculate stats from assistants data
  const stats = {
    totalAssistants: assistants.length,
    activeAssistants: assistants.filter(a => a.isActive).length,
    totalConversations: Math.floor(Math.random() * 500) + 100, // Mock data
    totalDocuments: assistants.reduce((sum, a) => sum + Math.floor(Math.random() * 20) + 5, 0) // Mock data
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <Bot className="h-8 w-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Assistants</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalAssistants}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <TrendingUp className="h-8 w-8 text-green-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Active Assistants</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.activeAssistants}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <MessageCircle className="h-8 w-8 text-purple-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Conversations</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalConversations}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <FileText className="h-8 w-8 text-orange-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Documents</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server component for assistants list
async function AssistantsList({ assistants }: { assistants: Assistant[] }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Your Assistants</h2>
      </div>
      
      {assistants.length === 0 ? (
        <div className="p-12 text-center">
          <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assistants yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first AI assistant to start helping students.
          </p>
          <Link
            href="/dashboard/assistants/new"
            className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Assistant
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {assistants.map((assistant) => (
            <div key={assistant._id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {assistant.name}
                    </h3>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      assistant.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {assistant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{assistant.description}</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created {new Date(assistant.createdAt).toLocaleDateString()}
                    {assistant.lastDocumentSync && (
                      <>
                        <span className="mx-2">•</span>
                        Last sync {new Date(assistant.lastDocumentSync).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    href={`/chat/${assistant.slug}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    target="_blank"
                  >
                    View Chat
                  </Link>
                  <Link
                    href={`/dashboard/assistants/${assistant._id}`}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Fetch assistants data on the server with caching
const getAssistants = cache((): Assistant[] => {
  try {
    const allAssistants = FileStorage.getAllAssistants();
    return allAssistants
      .filter(assistant => assistant.organizationId === 'demo-org')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching assistants:', error);
    return [];
  }
});

export default function DashboardPage() {
  const assistants = getAssistants();

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/dashboard/assistants/new"
          className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Assistant
        </Link>
      </div>

      {/* Stats Grid with Suspense for streaming */}
      <Suspense fallback={<DashboardStatsLoading />}>
        <DashboardStats assistants={assistants} />
      </Suspense>

      {/* Assistants List with Suspense for streaming */}
      <Suspense fallback={<AssistantsListLoading />}>
        <AssistantsList assistants={assistants} />
      </Suspense>
    </div>
  );
}