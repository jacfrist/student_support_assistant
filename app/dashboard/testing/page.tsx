'use client';

import { useState, useEffect } from 'react';
import { TestTube, Play, Plus, Trash2, FileText, Clock, Star } from 'lucide-react';
import { Assistant, TestResult } from '@/lib/types';

interface TestQuestion {
  _id?: string;
  question: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

export default function TestingPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([
    { question: "What are the financial aid application deadlines?", category: "Financial Aid", priority: "high" },
    { question: "How do I appeal a financial aid decision?", category: "Financial Aid", priority: "medium" },
    { question: "What documents do I need for FAFSA?", category: "Financial Aid", priority: "high" },
  ]);
  const [newQuestion, setNewQuestion] = useState({ question: '', category: '', priority: 'medium' as const });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [testSummary, setTestSummary] = useState<any>(null);

  useEffect(() => {
    fetchAssistants();
  }, []);

  useEffect(() => {
    if (selectedAssistant) {
      fetchTestResults();
    }
  }, [selectedAssistant]);

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

  const fetchTestResults = async () => {
    if (!selectedAssistant) return;
    
    try {
      const response = await fetch(`/api/assistants/${selectedAssistant}/test`);
      const data = await response.json();
      setTestResults(data.testResults || []);
      setTestSummary(data.summary);
    } catch (error) {
      console.error('Error fetching test results:', error);
    }
  };

  const runTests = async () => {
    if (!selectedAssistant || testQuestions.length === 0) return;
    
    setTesting(true);
    try {
      const response = await fetch(`/api/assistants/${selectedAssistant}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: testQuestions })
      });
      
      const data = await response.json();
      setTestResults(data.testResults || []);
      setTestSummary(data.summary);
      
    } catch (error) {
      console.error('Error running tests:', error);
      alert('Failed to run tests');
    } finally {
      setTesting(false);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.question.trim() || !newQuestion.category.trim()) return;
    
    setTestQuestions(prev => [...prev, { ...newQuestion, _id: crypto.randomUUID() }]);
    setNewQuestion({ question: '', category: '', priority: 'medium' });
  };

  const removeQuestion = (id: string) => {
    setTestQuestions(prev => prev.filter(q => q._id !== id));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <TestTube className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Quality Assurance Testing</h1>
        </div>
        
        <div className="flex items-center space-x-4">
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
          
          <button
            onClick={runTests}
            disabled={!selectedAssistant || testQuestions.length === 0 || testing}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4 mr-2" />
            {testing ? 'Running Tests...' : 'Run Tests'}
          </button>
        </div>
      </div>

      {/* Test Summary */}
      {testSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TestTube className="h-6 w-6 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-2xl font-semibold">{testSummary.totalTests}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Star className="h-6 w-6 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-semibold">{testSummary.averageRating?.toFixed(1) || '0.0'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-semibold">{Math.round(testSummary.averageResponseTime || 0)}ms</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Test Questions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Test Questions</h2>
          </div>
          
          <div className="p-6">
            {/* Add New Question */}
            <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Enter test question..."
                value={newQuestion.question}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Category"
                  value={newQuestion.category}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, category: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <select
                  value={newQuestion.priority}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                
                <button
                  onClick={addQuestion}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Questions List */}
            <div className="space-y-3">
              {testQuestions.map((question) => (
                <div key={question._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 mb-1">{question.question}</p>
                      <div className="flex items-center space-x-3 text-sm">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {question.category}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          question.priority === 'high' ? 'bg-red-100 text-red-700' :
                          question.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {question.priority.charAt(0).toUpperCase() + question.priority.slice(1)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeQuestion(question._id!)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Test Results</h2>
          </div>
          
          <div className="p-6">
            {testResults.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No test results yet. Run some tests to see results here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testResults.slice(0, 5).map((result) => (
                  <div key={result._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">{result.question}</p>
                      <div className="flex items-center">
                        {getRatingStars(result.rating)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{result.answer}</p>
                    
                    {result.citations && result.citations.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Sources:</p>
                        <div className="space-y-1">
                          {result.citations.map((citation, index) => (
                            <div key={index} className="text-xs text-gray-600">
                              <FileText className="h-3 w-3 inline mr-1" />
                              {citation.filename}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Response Time: {result.responseTime}ms</span>
                      <span>{new Date(result.testedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}