import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    // Verify assistant exists
    const assistant = FileStorage.getAssistantById(params.id);
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get conversations for this assistant
    const conversations = FileStorage.getConversationsByAssistant(params.id);
    
    // Filter conversations by date range
    const recentConversations = conversations.filter(conv => {
      const convDate = new Date(conv.startedAt);
      return convDate >= startDate;
    });

    // Get documents for this assistant
    const documents = FileStorage.getDocumentsByAssistant(params.id);
    
    // Calculate response time statistics
    const responseTimes = recentConversations.flatMap(conv => 
      conv.messages
        .filter(msg => msg.role === 'assistant' && msg.metadata?.responseTime)
        .map(msg => msg.metadata!.responseTime!)
    );
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length 
      : 0;
    
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    // Calculate basic analytics matching frontend expectations
    const analytics = {
      summary: {
        totalConversations: recentConversations.length,
        totalMessages: recentConversations.reduce((sum, conv) => sum + conv.messages.length, 0),
        totalDocuments: documents.length,
        averageResponseTime: Math.round(avgResponseTime),
        totalFeedback: Math.floor(recentConversations.length * 0.3) // Mock data
      },
      charts: {
        dailyConversations: generateDailyStats(recentConversations, 10), // Limit to past 10 days
        commonQuestions: getTopQuestions(recentConversations),
        documentUsage: generateDocumentUsage(documents),
        responseTimeStats: {
          averageResponseTime: Math.round(avgResponseTime),
          minResponseTime: Math.round(minResponseTime),
          maxResponseTime: Math.round(maxResponseTime)
        }
      }
    };
    
    return NextResponse.json(analytics);
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

function generateDailyStats(conversations: any[], days: number) {
  const dailyStats = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayConversations = conversations.filter(conv => {
      const convDate = new Date(conv.startedAt).toISOString().split('T')[0];
      return convDate === dateStr;
    });
    
    dailyStats.push({
      date: dateStr,
      conversations: dayConversations.length,
      messages: dayConversations.reduce((sum: number, conv: any) => sum + conv.messages.length, 0),
      uniqueUsers: new Set(dayConversations.map((conv: any) => conv.sessionId)).size
    });
  }
  
  return dailyStats;
}

function getTopQuestions(conversations: any[]) {
  const questions: { [key: string]: number } = {};
  
  conversations.forEach(conv => {
    conv.messages
      .filter((msg: any) => msg.role === 'user')
      .forEach((msg: any) => {
        // Simple question extraction - just use first 100 characters
        const question = msg.content.substring(0, 100);
        if (question.length > 10) { // Filter out very short messages
          questions[question] = (questions[question] || 0) + 1;
        }
      });
  });
  
  return Object.entries(questions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([question, frequency]) => ({ question, frequency }));
}

function generateDocumentUsage(documents: any[]) {
  // Mock document usage data since we don't track citations anymore
  return documents.map(doc => ({
    documentId: doc._id,
    filename: doc.filename,
    citationCount: Math.floor(Math.random() * 20) + 1 // Mock citation count
  })).sort((a, b) => b.citationCount - a.citationCount);
}