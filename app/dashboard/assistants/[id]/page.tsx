'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Bot, Save, FileText, MessageCircle, BarChart3, TestTube } from 'lucide-react';
import Link from 'next/link';
import { Assistant } from '@/lib/types';

export default function AssistantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assistantId = params.id as string;
  
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalConversations: 0,
    lastSync: null as Date | null
  });

  useEffect(() => {
    fetchAssistant();
    fetchDocuments();
    fetchStats();
  }, [assistantId]);

  const fetchAssistant = async () => {
    try {
      const response = await fetch(`/api/assistants/${assistantId}`);
      if (response.ok) {
        const data = await response.json();
        setAssistant(data);
      } else {
        router.push('/dashboard/assistants');
      }
    } catch (error) {
      console.error('Error fetching assistant:', error);
      router.push('/dashboard/assistants');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/assistants/${assistantId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // This would fetch real stats from your analytics API
      setStats({
        totalDocuments: Math.floor(Math.random() * 20) + 5,
        totalConversations: Math.floor(Math.random() * 100) + 10,
        lastSync: new Date()
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    if (!assistant) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/assistants/${assistantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: assistant.name,
          description: assistant.description,
          welcomeMessage: assistant.welcomeMessage,
          documentsFolder: assistant.documentsFolder,
          settings: assistant.settings,
          isActive: assistant.isActive
        })
      });

      if (response.ok) {
        alert('Assistant updated successfully!');
      } else {
        alert('Failed to update assistant');
      }
    } catch (error) {
      console.error('Error updating assistant:', error);
      alert('Failed to update assistant');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (!assistant) return;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setAssistant(prev => ({
        ...prev!,
        [parent]: {
          ...prev![parent as keyof Assistant] as any,
          [child]: value
        }
      }));
    } else {
      setAssistant(prev => ({ ...prev!, [field]: value }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Assistant not found</h2>
        <Link href="/dashboard/assistants" className="text-blue-600 hover:text-blue-700">
          Return to assistants list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            href="/dashboard/assistants"
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assistants
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assistant.name}</h1>
            <p className="text-gray-600">Manage your AI assistant</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            href={`/chat/${assistant.slug}`}
            target="_blank"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Test Chat
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <MessageCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalConversations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Bot className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className={`text-2xl font-semibold ${assistant.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                {assistant.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/dashboard/analytics?assistant=${assistantId}`}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-600">Usage stats and insights</p>
            </div>
          </Link>

          <Link
            href={`/dashboard/testing?assistant=${assistantId}`}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TestTube className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Run Tests</p>
              <p className="text-sm text-gray-600">Quality assurance testing</p>
            </div>
          </Link>

          <Link
            href={`/chat/${assistant.slug}`}
            target="_blank"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Test Chat</p>
              <p className="text-sm text-gray-600">Try the student interface</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assistant Name
            </label>
            <input
              type="text"
              value={assistant.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={assistant.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Welcome Message
            </label>
            <textarea
              value={assistant.welcomeMessage}
              onChange={(e) => handleInputChange('welcomeMessage', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documents Folder Path
            </label>
            <input
              type="text"
              value={assistant.documentsFolder}
              onChange={(e) => handleInputChange('documentsFolder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              The system monitors this folder for document changes
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={assistant.settings.theme.primaryColor}
                onChange={(e) => handleInputChange('settings.theme.primaryColor', e.target.value)}
                className="w-12 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={assistant.settings.theme.primaryColor}
                onChange={(e) => handleInputChange('settings.theme.primaryColor', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Style
            </label>
            <select
              value={assistant.settings.behavior.responseStyle}
              onChange={(e) => handleInputChange('settings.behavior.responseStyle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Response Length
            </label>
            <input
              type="number"
              value={assistant.settings.behavior.maxResponseLength}
              onChange={(e) => handleInputChange('settings.behavior.maxResponseLength', parseInt(e.target.value))}
              min="100"
              max="2000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={assistant.settings.behavior.includeCitations}
                onChange={(e) => handleInputChange('settings.behavior.includeCitations', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Include citations in responses</span>
            </label>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={assistant.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Assistant is active and available to students</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}