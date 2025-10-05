import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';
import { AIService } from '@/lib/ai-service';
import { Conversation, Message } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { message, sessionId, conversationId } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('student-support-assistant');
    
    // Verify assistant exists and is active
    const assistant = await db.collection('assistants').findOne({ 
      _id: new ObjectId(params.id),
      isActive: true 
    });
    
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found or inactive' }, { status: 404 });
    }
    
    // Get or create conversation
    let conversation: Conversation;
    const currentSessionId = sessionId || uuidv4();
    
    if (conversationId) {
      const existingConversation = await db.collection('conversations').findOne({
        _id: new ObjectId(conversationId),
        assistantId: params.id
      });
      
      if (existingConversation) {
        conversation = existingConversation as any as Conversation;
      } else {
        // Create new conversation if not found
        conversation = {
          assistantId: params.id,
          sessionId: currentSessionId,
          messages: [],
          startedAt: new Date(),
          lastMessageAt: new Date()
        };
        
        const result = await db.collection('conversations').insertOne(conversation as any);
        conversation._id = result.insertedId.toString();
      }
    } else {
      // Create new conversation
      conversation = {
        assistantId: params.id,
        sessionId: currentSessionId,
        messages: [],
        startedAt: new Date(),
        lastMessageAt: new Date()
      };
      
      const result = await db.collection('conversations').insertOne(conversation as any);
      conversation._id = result.insertedId.toString();
    }
    
    // Add user message to conversation
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    conversation.messages.push(userMessage);
    
    // Generate AI response
    const aiResponse = await AIService.generateResponse(
      params.id,
      message,
      conversation.messages.slice(0, -1) // Exclude the current message
    );
    
    // Add assistant message to conversation
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse.response,
      timestamp: new Date(),
      citations: aiResponse.citations,
      metadata: {
        responseTime: aiResponse.responseTime
      }
    };
    
    conversation.messages.push(assistantMessage);
    conversation.lastMessageAt = new Date();
    
    // Update conversation in database
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversation._id!) },
      { 
        $set: { 
          messages: conversation.messages,
          lastMessageAt: conversation.lastMessageAt 
        } 
      }
    );
    
    return NextResponse.json({
      conversationId: conversation._id,
      sessionId: currentSessionId,
      message: assistantMessage,
      assistant: {
        name: assistant.name,
        welcomeMessage: assistant.welcomeMessage
      }
    });
    
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const sessionId = searchParams.get('sessionId');
    
    const client = await clientPromise;
    const db = client.db('student-support-assistant');
    
    let query: any = { assistantId: params.id };
    
    if (conversationId) {
      query._id = new ObjectId(conversationId);
    } else if (sessionId) {
      query.sessionId = sessionId;
    } else {
      return NextResponse.json({ error: 'conversationId or sessionId required' }, { status: 400 });
    }
    
    const conversation = await db.collection('conversations').findOne(query);
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json(conversation);
    
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}