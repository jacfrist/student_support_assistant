import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const client = await clientPromise;
    const db = client.db('student-support-assistant');
    
    // Verify assistant exists
    const assistant = await db.collection('assistants').findOne({ _id: new ObjectId(params.id) });
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get conversations analytics
    const conversationsAnalytics = await db.collection('conversations').aggregate([
      {
        $match: {
          assistantId: params.id,
          startedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } }
          },
          conversations: { $sum: 1 },
          totalMessages: { $sum: { $size: "$messages" } }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]).toArray();
    
    // Get most common questions
    const commonQuestions = await db.collection('conversations').aggregate([
      {
        $match: {
          assistantId: params.id,
          startedAt: { $gte: startDate }
        }
      },
      { $unwind: "$messages" },
      {
        $match: {
          "messages.role": "user"
        }
      },
      {
        $group: {
          _id: "$messages.content",
          frequency: { $sum: 1 }
        }
      },
      { $sort: { frequency: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    // Get document usage statistics
    const documentUsage = await db.collection('conversations').aggregate([
      {
        $match: {
          assistantId: params.id,
          startedAt: { $gte: startDate }
        }
      },
      { $unwind: "$messages" },
      {
        $match: {
          "messages.role": "assistant",
          "messages.citations": { $exists: true, $ne: [] }
        }
      },
      { $unwind: "$messages.citations" },
      {
        $group: {
          _id: {
            documentId: "$messages.citations.documentId",
            filename: "$messages.citations.filename"
          },
          citationCount: { $sum: 1 }
        }
      },
      { $sort: { citationCount: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    // Get user satisfaction (from feedback)
    const satisfactionStats = await db.collection('conversations').aggregate([
      {
        $match: {
          assistantId: params.id,
          startedAt: { $gte: startDate },
          "userFeedback.rating": { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$userFeedback.rating" },
          totalFeedback: { $sum: 1 }
        }
      }
    ]).toArray();
    
    // Get response time analytics
    const responseTimeStats = await db.collection('conversations').aggregate([
      {
        $match: {
          assistantId: params.id,
          startedAt: { $gte: startDate }
        }
      },
      { $unwind: "$messages" },
      {
        $match: {
          "messages.role": "assistant",
          "messages.metadata.responseTime": { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          averageResponseTime: { $avg: "$messages.metadata.responseTime" },
          minResponseTime: { $min: "$messages.metadata.responseTime" },
          maxResponseTime: { $max: "$messages.metadata.responseTime" }
        }
      }
    ]).toArray();
    
    // Calculate summary metrics
    const totalConversations = await db.collection('conversations').countDocuments({
      assistantId: params.id,
      startedAt: { $gte: startDate }
    });
    
    const totalMessages = await db.collection('conversations').aggregate([
      {
        $match: {
          assistantId: params.id,
          startedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $size: "$messages" } }
        }
      }
    ]).toArray();
    
    const totalDocuments = await db.collection('documents').countDocuments({
      assistantId: params.id,
      processed: true
    });
    
    return NextResponse.json({
      summary: {
        totalConversations,
        totalMessages: totalMessages[0]?.total || 0,
        totalDocuments,
        averageResponseTime: responseTimeStats[0]?.averageResponseTime || 0,
        userSatisfactionScore: satisfactionStats[0]?.averageRating || 0,
        totalFeedback: satisfactionStats[0]?.totalFeedback || 0
      },
      charts: {
        dailyConversations: conversationsAnalytics.map(item => ({
          date: item._id.date,
          conversations: item.conversations,
          messages: item.totalMessages
        })),
        commonQuestions: commonQuestions.map(item => ({
          question: item._id,
          frequency: item.frequency
        })),
        documentUsage: documentUsage.map(item => ({
          documentId: item._id.documentId,
          filename: item._id.filename,
          citationCount: item.citationCount
        })),
        responseTimeStats: responseTimeStats[0] || {
          averageResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}