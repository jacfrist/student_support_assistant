import { FileStorage } from './file-storage';
import { Assistant, Document, Citation, Message } from './types';

export class AIService {
  static async generateResponse(
    assistantId: string,
    userMessage: string,
    conversationHistory: Message[] = []
  ): Promise<{
    response: string;
    citations: Citation[];
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Get assistant configuration
      const assistant = await this.getAssistant(assistantId);
      if (!assistant) {
        throw new Error('Assistant not found');
      }

      // Get relevant documents
      const relevantDocs = await this.findRelevantDocuments(assistantId, userMessage);
      
      // Build context from documents
      const context = this.buildContext(relevantDocs);
      
      // Generate response using Amplify Assistant
      const response = await this.callAmplifyAssistant(
        assistant,
        userMessage,
        context,
        conversationHistory
      );

      // Generate citations
      const citations = this.generateCitations(relevantDocs, response);
      
      const responseTime = Date.now() - startTime;

      return {
        response,
        citations,
        responseTime
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  private static async getAssistant(assistantId: string): Promise<Assistant | null> {
    return FileStorage.getAssistantById(assistantId);
  }

  private static async findRelevantDocuments(
    assistantId: string,
    query: string,
    limit: number = 5
  ): Promise<Document[]> {
    return FileStorage.searchDocuments(assistantId, query, limit);
  }

  private static buildContext(documents: Document[]): string {
    if (documents.length === 0) {
      return 'No relevant documents found in the knowledge base.';
    }

    let context = 'Relevant information from the knowledge base:\n\n';
    
    documents.forEach((doc, index) => {
      context += `Document ${index + 1}: ${doc.metadata.title || doc.filename}\n`;
      // Include first 500 characters of content
      const excerpt = doc.content.length > 500 
        ? doc.content.substring(0, 500) + '...'
        : doc.content;
      context += `Content: ${excerpt}\n\n`;
    });

    return context;
  }

  private static async callAmplifyAssistant(
    assistant: Assistant,
    userMessage: string,
    context: string,
    conversationHistory: Message[]
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(assistant, context);
    
    // Build conversation array for Amplify
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 5 messages)
    const recentHistory = conversationHistory.slice(-5);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    try {
      // Call Amplify assistant API
      const response = await fetch('https://prod-api.vanderbilt.ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AMPLIFY_API_KEY}`,
        },
        body: JSON.stringify({
          data: {
            temperature: 0.5,
            max_tokens: assistant.settings.behavior.maxResponseLength || 4096,
            dataSources: [],
            messages,
            options: {
              assistantId: process.env.AMPLIFY_ASSISTANT_ID,
              model: { id: 'gpt-4o-mini' },
              prompt: messages[0]?.content || ''
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Amplify API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Amplify API error:', error);
      // Fallback to a simple response based on context
      return this.generateFallbackResponse(userMessage, context);
    }
  }

  private static generateFallbackResponse(userMessage: string, context: string): string {
    // Simple fallback response when Amplify API is unavailable
    if (context.includes('No relevant documents found')) {
      return "I don't have specific information about that topic in my knowledge base. Please contact our support staff for personalized assistance.";
    }
    
    return `Thank you for your question about "${userMessage}". Based on the available information, I recommend reviewing the relevant documentation or contacting our support team for detailed assistance. I apologize that I cannot provide a more specific answer at this time.`;
  }

  private static buildSystemPrompt(assistant: Assistant, context: string): string {
    const styleInstructions = {
      formal: 'Respond in a formal, professional manner.',
      friendly: 'Respond in a warm, friendly, and approachable manner.',
      professional: 'Respond in a professional but conversational tone.'
    };

    return `You are ${assistant.name}, a helpful assistant for student support. 

Your role is to help students by providing accurate information based on the knowledge base provided to you.

Response Style: ${styleInstructions[assistant.settings.behavior.responseStyle]}

Guidelines:
- Always prioritize accuracy over speed
- If you're not certain about something, say so clearly
- ${assistant.settings.behavior.includeCitations ? 'Always cite your sources when providing information' : 'Provide helpful information without needing citations'}
- Keep responses concise but comprehensive
- Be empathetic to student concerns
- If a question is outside your knowledge base, guide students to appropriate human support

Knowledge Base Context:
${context}

Welcome Message: ${assistant.welcomeMessage}`;
  }

  private static generateCitations(documents: Document[], response: string): Citation[] {
    const citations: Citation[] = [];
    
    documents.forEach(doc => {
      // Simple citation generation - check if document content appears in response
      const docWords = doc.content.toLowerCase().split(' ');
      const responseWords = response.toLowerCase().split(' ');
      
      let matches = 0;
      docWords.forEach(word => {
        if (word.length > 3 && responseWords.includes(word)) {
          matches++;
        }
      });
      
      if (matches > 2) {
        // Create excerpt around first match
        const excerpt = this.extractRelevantExcerpt(doc.content, response);
        
        citations.push({
          documentId: doc._id!,
          filename: doc.filename,
          excerpt,
          relevanceScore: matches / Math.max(docWords.length, responseWords.length)
        });
      }
    });

    return citations.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
  }

  private static extractRelevantExcerpt(content: string, response: string, maxLength: number = 150): string {
    const responseWords = response.toLowerCase().split(' ').filter(w => w.length > 3);
    const sentences = content.split(/[.!?]+/);
    
    let bestSentence = sentences[0] || content.substring(0, maxLength);
    let bestScore = 0;
    
    sentences.forEach(sentence => {
      const sentenceWords = sentence.toLowerCase().split(' ');
      const score = responseWords.reduce((acc, word) => {
        return acc + (sentenceWords.includes(word) ? 1 : 0);
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    });
    
    return bestSentence.length > maxLength 
      ? bestSentence.substring(0, maxLength) + '...'
      : bestSentence;
  }

  static async generateTestResponse(assistantId: string, question: string): Promise<{
    answer: string;
    citations: Citation[];
    responseTime: number;
    confidence: number;
  }> {
    const result = await this.generateResponse(assistantId, question);
    
    // Simple confidence calculation based on citations
    const confidence = Math.min(0.9, result.citations.length * 0.3 + 0.1);
    
    return {
      answer: result.response,
      citations: result.citations,
      responseTime: result.responseTime,
      confidence
    };
  }
}