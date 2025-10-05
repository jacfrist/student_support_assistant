import Link from 'next/link';
import { Bot, Plus, Calendar, Settings, ExternalLink } from 'lucide-react';
import { Assistant } from '@/lib/types';
import { FileStorage } from '@/lib/file-storage';
import { Suspense, cache } from 'react';
import AssistantActions from './AssistantActions';

// Loading component for assistants list
function AssistantsLoading() {
  return (
    <div className="grid gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow animate-pulse">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 bg-gray-200 rounded mr-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="ml-3 w-16 h-5 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
                <div className="flex space-x-4">
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-28"></div>
                </div>
                <div className="mt-3 h-3 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="flex space-x-2 ml-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="w-8 h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Server component for assistants list
async function AssistantsList({ assistants }: { assistants: Assistant[] }) {
  if (assistants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No assistants yet</h3>
        <p className="text-gray-500 mb-6">
          Create your first AI assistant to start helping students with their questions.
        </p>
        <Link
          href="/dashboard/assistants/new"
          className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Assistant
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {assistants.map((assistant) => (
        <div key={assistant._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Bot className="h-6 w-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    {assistant.name}
                  </h2>
                  <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    assistant.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {assistant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-3">{assistant.description}</p>
                
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created {new Date(assistant.createdAt).toLocaleDateString()}
                  </div>
                  {assistant.lastDocumentSync && (
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Last sync {new Date(assistant.lastDocumentSync).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <div className="mt-3 text-sm text-gray-600">
                  <strong>Documents folder:</strong> {assistant.documentsFolder}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <AssistantActions assistant={assistant} />
                
                <Link
                  href={`/chat/${assistant.slug}`}
                  target="_blank"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="View Chat Interface"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                
                <Link
                  href={`/dashboard/assistants/${assistant._id}`}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  title="Edit Assistant"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
            <div className="flex justify-between items-center text-sm">
              <div className="flex space-x-4">
                <Link
                  href={`/dashboard/analytics?assistant=${assistant._id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Analytics
                </Link>
                <Link
                  href={`/dashboard/testing?assistant=${assistant._id}`}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Run Tests
                </Link>
              </div>
              
              <div className="text-gray-500">
                Chat URL: /chat/{assistant.slug}
              </div>
            </div>
          </div>
        </div>
      ))}
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

export default function AssistantsPage() {
  const assistants = getAssistants();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">AI Assistants</h1>
        <Link
          href="/dashboard/assistants/new"
          className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Assistant
        </Link>
      </div>

      <Suspense fallback={<AssistantsLoading />}>
        <AssistantsList assistants={assistants} />
      </Suspense>
    </div>
  );
}