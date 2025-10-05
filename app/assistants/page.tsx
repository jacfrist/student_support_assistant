'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageCircle, ExternalLink, Search } from 'lucide-react';
import { Assistant } from '@/lib/types';

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/assistants');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // Only show active assistants to students
        const activeAssistants = data.filter(assistant => assistant.isActive);
        setAssistants(activeAssistants);
      }
    } catch (error) {
      console.error('Error fetching assistants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssistants = assistants.filter(assistant =>
    assistant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistant.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Assistants
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant help from our specialized AI assistants. Each one is trained on specific topics to provide you with accurate, helpful information.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search assistants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Assistants Grid */}
        {filteredAssistants.length === 0 ? (
          <div className="text-center py-16">
            <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No assistants found' : 'No assistants available'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms or browse all available assistants.' 
                : 'Our AI assistants are currently being set up. Please check back soon!'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {filteredAssistants.map((assistant) => (
              <div key={assistant._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                {/* Header with color theme */}
                <div 
                  className="h-24 relative"
                  style={{ backgroundColor: assistant.settings.theme.primaryColor }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                  <div className="absolute bottom-4 left-6">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {assistant.name}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {assistant.description}
                  </p>
                  
                  {/* Topics/Keywords */}
                  {assistant.settings.behavior && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {assistant.settings.behavior.responseStyle} style
                      </span>
                    </div>
                  )}

                  {/* Chat Button */}
                  <Link
                    href={`/chat/${assistant.slug}`}
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg text-white font-medium transition-colors"
                    style={{ 
                      backgroundColor: assistant.settings.theme.primaryColor,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = assistant.settings.theme.primaryColor + 'dd';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = assistant.settings.theme.primaryColor;
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Start Chatting
                  </Link>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Available 24/7</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                      Online
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="max-w-4xl mx-auto mt-16 bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How to Use AI Assistants
            </h2>
            <div className="grid md:grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Choose an Assistant</h3>
                <p className="text-gray-600 text-sm">
                  Select the assistant that best matches your question or topic area.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Bot className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Ask Your Question</h3>
                <p className="text-gray-600 text-sm">
                  Type your question naturally. The AI will understand and provide helpful answers.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <ExternalLink className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Get Detailed Help</h3>
                <p className="text-gray-600 text-sm">
                  Receive accurate answers with sources and follow-up guidance as needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}