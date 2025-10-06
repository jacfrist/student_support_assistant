import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';
import { FileStorage } from '@/lib/file-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TESTING AMPLIFY CHAT API ===');
    
    // Minimal test payload for Amplify chat API
    const testPayload = {
      prompt: 'You are a helpful residential life assistant. A student asks: Can I have a microwave and a fridge in my dorm room? Please provide a helpful answer.',
      assistantId: process.env.AMPLIFY_ASSISTANT_ID,
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 500
    };

    console.log('Test payload:', JSON.stringify(testPayload, null, 2));
    
    let chatResponse = null;
    let chatError = null;
    
    try {
      const response = await fetch('https://prod-api.vanderbilt.ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AMPLIFY_API_KEY}`,
        },
        body: JSON.stringify(testPayload),
      });

      console.log('Chat API Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Chat API Error Text:', errorText);
        chatError = `HTTP ${response.status}: ${errorText}`;
      } else {
        chatResponse = await response.json();
        console.log('Chat API Success Response:', JSON.stringify(chatResponse, null, 2));
      }
      
    } catch (error) {
      chatError = error instanceof Error ? error.message : String(error);
      console.error('Chat API request error:', error);
    }
    
    return NextResponse.json({
      chatSuccess: !!chatResponse,
      chatResponse: chatResponse,
      chatError: chatError,
      amplifyApiKey: process.env.AMPLIFY_API_KEY ? 'Present (length: ' + process.env.AMPLIFY_API_KEY.length + ')' : 'Missing',
      amplifyAssistantId: process.env.AMPLIFY_ASSISTANT_ID || 'Missing'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}