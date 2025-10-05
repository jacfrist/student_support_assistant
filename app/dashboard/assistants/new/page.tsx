'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FolderOpen, Palette, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function NewAssistantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    welcomeMessage: '',
    documentsFolder: '',
    theme: {
      primaryColor: '#2563eb'
    },
    behavior: {
      responseStyle: 'professional' as 'formal' | 'friendly' | 'professional',
      maxResponseLength: 500,
      includeCitations: true
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/assistants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          organizationId: 'demo-org', // In real app, get from auth
          createdBy: 'demo-user', // In real app, get from auth
          settings: {
            theme: formData.theme,
            behavior: formData.behavior
          }
        }),
      });

      if (response.ok) {
        const assistant = await response.json();
        console.log('Assistant created successfully:', assistant);
        router.push(`/dashboard/assistants/${assistant._id}`);
      } else {
        const error = await response.json();
        console.error('Assistant creation failed:', error);
        alert(`Failed to create assistant: ${error.error || 'Unknown error'}. Check console for details.`);
      }
    } catch (error) {
      console.error('Error creating assistant:', error);
      alert('Failed to create assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center mb-8">
        <Link
          href="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Assistant</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Assistant Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Financial Aid Helper"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                This will be visible to students and used in the URL
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Helps students with financial aid questions, applications, and deadlines"
                required
              />
            </div>

            <div>
              <label htmlFor="welcomeMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message *
              </label>
              <textarea
                id="welcomeMessage"
                value={formData.welcomeMessage}
                onChange={(e) => handleInputChange('welcomeMessage', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hi! I'm here to help you with financial aid questions. Feel free to ask about applications, deadlines, or any policies you need clarification on."
                required
              />
            </div>
          </div>
        </div>

        {/* Documents Folder */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <FolderOpen className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Documents Folder</h2>
          </div>
          
          <div>
            <label htmlFor="documentsFolder" className="block text-sm font-medium text-gray-700 mb-2">
              Folder Path *
            </label>
            <input
              type="text"
              id="documentsFolder"
              value={formData.documentsFolder}
              onChange={(e) => handleInputChange('documentsFolder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/path/to/your/documents/folder"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              The system will monitor this folder and automatically process any supported documents (PDF, DOCX, TXT, MD).
              The folder will be synced continuously for updates.
            </p>
          </div>
        </div>

        {/* Customization */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Palette className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Customization</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={formData.theme.primaryColor}
                  onChange={(e) => handleInputChange('theme.primaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={formData.theme.primaryColor}
                  onChange={(e) => handleInputChange('theme.primaryColor', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <div>
              <label htmlFor="responseStyle" className="block text-sm font-medium text-gray-700 mb-2">
                Response Style
              </label>
              <select
                id="responseStyle"
                value={formData.behavior.responseStyle}
                onChange={(e) => handleInputChange('behavior.responseStyle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>

            <div>
              <label htmlFor="maxResponseLength" className="block text-sm font-medium text-gray-700 mb-2">
                Max Response Length
              </label>
              <input
                type="number"
                id="maxResponseLength"
                value={formData.behavior.maxResponseLength}
                onChange={(e) => handleInputChange('behavior.maxResponseLength', parseInt(e.target.value))}
                min="100"
                max="2000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Maximum number of characters in responses (100-2000)
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.behavior.includeCitations}
                  onChange={(e) => handleInputChange('behavior.includeCitations', e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Include citations in responses</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Assistant'}
          </button>
        </div>
      </form>
    </div>
  );
}