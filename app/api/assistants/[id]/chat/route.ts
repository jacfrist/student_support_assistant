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
    
    // Verify assistant exists and is active
    const assistant = FileStorage.getAssistantById(params.id);
    
    if (!assistant || !assistant.isActive) {
      return NextResponse.json({ error: 'Assistant not found or inactive' }, { status: 404 });
    }
    
    // Get or create conversation
    let conversation: Conversation;
    const currentSessionId = sessionId || uuidv4();
    
    if (conversationId) {
      const existingConversation = FileStorage.getConversationById(conversationId);
      
      if (existingConversation && existingConversation.assistantId === params.id) {
        conversation = existingConversation;
      } else {
        // Create new conversation if not found
        conversation = FileStorage.createConversation({
          assistantId: params.id,
          sessionId: currentSessionId,
          messages: [],
          startedAt: new Date(),
          lastMessageAt: new Date()
        });
      }
    } else {
      // Try to find existing conversation by sessionId, or create new one
      const existingConversation = FileStorage.getConversationBySession(params.id, currentSessionId);
      
      if (existingConversation) {
        conversation = existingConversation;
      } else {
        // Create new conversation
        conversation = FileStorage.createConversation({
          assistantId: params.id,
          sessionId: currentSessionId,
          messages: [],
          startedAt: new Date(),
          lastMessageAt: new Date()
        });
      }
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
    
    // Update conversation in file storage
    FileStorage.updateConversation(conversation._id!, {
      messages: conversation.messages,
      lastMessageAt: conversation.lastMessageAt
    });
    
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
    
    let conversation: Conversation | null = null;
    
    if (conversationId) {
      conversation = FileStorage.getConversationById(conversationId);
      if (conversation && conversation.assistantId !== params.id) {
        conversation = null; // Ensure conversation belongs to this assistant
      }
    } else if (sessionId) {
      conversation = FileStorage.getConversationBySession(params.id, sessionId);
    } else {
      return NextResponse.json({ error: 'conversationId or sessionId required' }, { status: 400 });
    }
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json(conversation);
    
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}