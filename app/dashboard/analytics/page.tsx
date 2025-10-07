'use client';

import { useState, useEffect } from 'react';
import { BarChart3, MessageCircle, Clock, Users, FileText, Star, TrendingUp } from 'lucide-react';
import { Assistant } from '@/lib/types';

interface AnalyticsData {
  summary: {
    totalConversations: number;
    totalMessages: number;
    totalDocuments: number;
    averageResponseTime: number;
    totalFeedback: number;
  };
  charts: {
    dailyConversations: Array<{
      date: string;
      conversations: number;
      messages: number;
    }>;
    commonQuestions: Array<{
      question: string;
      frequency: number;
    }>;
    documentUsage: Array<{
      documentId: string;
      filename: string;
      citationCount: number;
    }>;
    responseTimeStats: {
      averageResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
    };
  };
}

export default function AnalyticsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<string>('30');

  useEffect(() => {
    fetchAssistants();
  }, []);

  useEffect(() => {
    if (selectedAssistant) {
      fetchAnalytics();
    }
  }, [selectedAssistant, timeRange]);

  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/assistants?organizationId=demo-org');
      const data = await response.json();
      if (Array.isArray(data)) {
        setAssistants(data);
        if (data.length > 0 && !selectedAssistant) {
          setSelectedAssistant(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching assistants:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedAssistant) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/assistants/${selectedAssistant}/analytics?days=${timeRange}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          
          <select
            value={selectedAssistant}
            onChange={(e) => setSelectedAssistant(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Assistant</option>
            {assistants.map(assistant => (
              <option key={assistant._id} value={assistant._id}>
                {assistant.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!analytics ? (
        <div className="text-center text-gray-500 py-12">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p>Select an assistant to view analytics</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <MessageCircle className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conversations</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.summary.totalConversations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Messages</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.summary.totalMessages}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Documents</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.summary.totalDocuments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Response</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round(analytics.summary.averageResponseTime || 0)}ms
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Feedback</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.summary.totalFeedback}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Activity Chart */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Daily Activity</h3>
              </div>
              <div className="p-6">
                {analytics.charts.dailyConversations.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.charts.dailyConversations.map((day) => (
                      <div key={day.date} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span className="text-sm text-gray-700">{day.conversations} conversations</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm text-gray-700">{day.messages} messages</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No activity data available</p>
                )}
              </div>
            </div>

            {/* Common Questions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Most Asked Questions</h3>
              </div>
              <div className="p-6">
                {analytics.charts.commonQuestions.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.charts.commonQuestions.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-start justify-between">
                        <p className="text-sm text-gray-700 flex-1 mr-4">
                          {item.question.length > 80 
                            ? item.question.substring(0, 80) + '...' 
                            : item.question}
                        </p>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          {item.frequency}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No questions data available</p>
                )}
              </div>
            </div>

            {/* Document Usage */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Most Cited Documents</h3>
              </div>
              <div className="p-6">
                {analytics.charts.documentUsage.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.charts.documentUsage.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700 truncate">{item.filename}</span>
                        </div>
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                          {item.citationCount} citations
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No document usage data available</p>
                )}
              </div>
            </div>

            {/* Response Time Stats */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Response Time Statistics</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average</span>
                    <span className="font-semibold text-gray-900">
                      {Math.round(analytics.charts.responseTimeStats.averageResponseTime || 0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fastest</span>
                    <span className="font-semibold text-green-600">
                      {Math.round(analytics.charts.responseTimeStats.minResponseTime || 0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Slowest</span>
                    <span className="font-semibold text-red-600">
                      {Math.round(analytics.charts.responseTimeStats.maxResponseTime || 0)}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}