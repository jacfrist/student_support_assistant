import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { AIService } from '@/lib/ai-service';
import { TestQuestion, TestResult } from '@/lib/types';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { questions } = body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Questions array is required' }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('student-support-assistant');
    
    // Verify assistant exists
    const assistant = await db.collection('assistants').findOne({ 
      _id: new ObjectId(params.id),
      isActive: true 
    });
    
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found or inactive' }, { status: 404 });
    }
    
    const testResults: TestResult[] = [];
    
    // Test each question
    for (const question of questions) {
      try {
        const startTime = Date.now();
        const result = await AIService.generateTestResponse(params.id, question.question);
        const endTime = Date.now();
        
        const testResult: Omit<TestResult, '_id'> = {
          assistantId: params.id,
          testQuestionId: question._id || new ObjectId().toString(),
          question: question.question,
          answer: result.answer,
          responseTime: endTime - startTime,
          citations: result.citations,
          rating: Math.ceil(result.confidence * 5) as 1 | 2 | 3 | 4 | 5, // Convert confidence to 1-5 scale
          testedAt: new Date(),
          testedBy: 'system' // In real app, get from auth
        };
        
        const insertResult = await db.collection('testResults').insertOne(testResult);
        testResults.push({
          ...testResult,
          _id: insertResult.insertedId.toString()
        });
        
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
    
    const client = await clientPromise;
    const db = client.db('student-support-assistant');
    
    // Get recent test results
    const testResults = await db.collection('testResults')
      .find({ assistantId: params.id })
      .sort({ testedAt: -1 })
      .limit(limit)
      .toArray();
    
    // Get summary statistics
    const totalTests = await db.collection('testResults').countDocuments({ assistantId: params.id });
    
    const avgRatingPipeline = [
      { $match: { assistantId: params.id } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, avgResponseTime: { $avg: '$responseTime' } } }
    ];
    
    const avgStats = await db.collection('testResults').aggregate(avgRatingPipeline).toArray();
    
    return NextResponse.json({
      testResults,
      summary: {
        totalTests,
        averageRating: avgStats[0]?.avgRating || 0,
        averageResponseTime: avgStats[0]?.avgResponseTime || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching test results:', error);
    return NextResponse.json({ error: 'Failed to fetch test results' }, { status: 500 });
  }
}