import Link from 'next/link';
import { Bot, Users, FileText, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Student Support Assistant Builder
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create intelligent AI assistants for your student support office. 
            Upload your guides and FAQs, and let students get 24/7 help with their questions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">For Staff</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Create and manage AI assistants for your department. Upload documents, 
              test responses, and monitor usage analytics.
            </p>
            <Link 
              href="/dashboard"
              className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Access Dashboard
            </Link>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="flex items-center mb-4">
              <Bot className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">For Students</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Chat with specialized assistants to get instant help with policies, 
              procedures, and common questions.
            </p>
            <Link 
              href="/assistants"
              className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Find Assistants
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Documents
              </h3>
              <p className="text-gray-600">
                Simply upload your existing guides, FAQs, and policy documents to a folder. 
                The system automatically processes all supported file types.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Bot className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Assistant Created
              </h3>
              <p className="text-gray-600">
                The AI learns from your documents and creates an intelligent assistant 
                that can answer questions and provide guidance to students.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Monitor & Improve
              </h3>
              <p className="text-gray-600">
                Track usage, test responses, and get insights on common questions 
                to continuously improve your student support.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 text-white rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-300 mb-6">
            Create your first AI assistant and start helping students 24/7.
          </p>
          <Link 
            href="/dashboard/assistants/new"
            className="inline-flex items-center bg-white text-gray-900 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
          >
            Create Your First Assistant
          </Link>
        </div>
      </div>
    </div>
  );
}