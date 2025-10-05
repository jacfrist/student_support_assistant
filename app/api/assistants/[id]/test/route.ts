import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';
import { AIService } from '@/lib/ai-service';
import { TestQuestion, TestResult } from '@/lib/types';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { questions } = body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Questions array is required' }, { status: 400 });
    }
    
    // Verify assistant exists
    const assistant = FileStorage.getAssistantById(params.id);
    
    if (!assistant || !assistant.isActive) {
      return NextResponse.json({ error: 'Assistant not found or inactive' }, { status: 404 });
    }
    
    const testResults: TestResult[] = [];
    
    // Test each question
    for (const question of questions) {
      try {
        const startTime = Date.now();
        const result = await AIService.generateTestResponse(params.id, question.question);
        const endTime = Date.now();
        
        const testResult: TestResult = {
          _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          assistantId: params.id,
          testQuestionId: question._id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          question: question.question,
          answer: result.answer,
          responseTime: endTime - startTime,
          citations: result.citations,
          rating: Math.ceil(result.confidence * 5) as 1 | 2 | 3 | 4 | 5, // Convert confidence to 1-5 scale
          testedAt: new Date(),
          testedBy: 'system' // In real app, get from auth
        };
        
        FileStorage.createTestResult(testResult);
        testResults.push(testResult);
        
      } catch (error) {
        console.error(`Error testing question "${question.question}":`, error);
        // Continue with other questions even if one fails
      }
    }
    
    return NextResponse.json({
      testResults,
      summary: {
        totalQuestions: questions.length,
        successfulTests: testResults.length,
        averageRating: testResults.length > 0 
          ? testResults.reduce((sum, r) => sum + r.rating, 0) / testResults.length 
          : 0,
        averageResponseTime: testResults.length > 0
          ? testResults.reduce((sum, r) => sum + r.responseTime, 0) / testResults.length
          : 0
      }
    });
    
  } catch (error) {
    console.error('Error running tests:', error);
    return NextResponse.json({ error: 'Failed to run tests' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Get recent test results
    const allTestResults = FileStorage.getTestResultsByAssistant(params.id);
    const testResults = allTestResults
      .sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime())
      .slice(0, limit);
    
    // Get summary statistics
    const totalTests = allTestResults.length;
    
    const averageRating = totalTests > 0 
      ? allTestResults.reduce((sum, r) => sum + r.rating, 0) / totalTests 
      : 0;
    
    const averageResponseTime = totalTests > 0
      ? allTestResults.reduce((sum, r) => sum + r.responseTime, 0) / totalTests
      : 0;
    
    return NextResponse.json({
      testResults,
      summary: {
        totalTests,
        averageRating,
        averageResponseTime
      }
    });
    
  } catch (error) {
    console.error('Error fetching test results:', error);
    return NextResponse.json({ error: 'Failed to fetch test results' }, { status: 500 });
  }
}