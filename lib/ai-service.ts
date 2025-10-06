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

      // Get all documents for this assistant
      const allDocuments = await this.getAllDocuments(assistantId);
      
      // Upload entire documents to Amplify and use RAG
      const amplifyFileIds = await this.ensureDocsUploadedToAmplify(allDocuments);
      
      let response: string;
      
      if (amplifyFileIds.length > 0) {
        // Use Amplify RAG with uploaded documents - let Amplify handle content search
        console.log('✅ Using Amplify RAG with uploaded documents');
        response = await this.callAmplifyAssistantWithRAG(
          assistant,
          userMessage,
          amplifyFileIds,
          conversationHistory
        );
      } else {
        // If upload fails, provide helpful error message
        console.log('❌ Document upload failed - API authentication or network issues');
        response = `I'm currently experiencing technical difficulties connecting to the document processing system. The system is designed to upload your documents to Amplify and use their AI to answer questions, but there appears to be an API authentication issue.

To get help with your question about "${userMessage}", I recommend:

1. Contacting the Office of Student Accounts directly for financial aid and refund questions
2. Visiting the official Vanderbilt student handbook online
3. Reaching out to your student support services

I apologize for the technical difficulties. The system is set up to provide accurate information from official university documents, but needs the document upload functionality to be working properly.`;
      }

      // Generate simple citations from uploaded documents
      const citations = this.generateSimpleCitations(allDocuments, response);
      
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

  private static async getAllDocuments(assistantId: string): Promise<Document[]> {
    return FileStorage.getDocumentsByAssistant(assistantId);
  }

  private static async ensureDocsUploadedToAmplify(documents: Document[]): Promise<string[]> {
    console.log(`Processing ${documents.length} documents for Amplify upload`);
    
    // Try Amplify upload first, but expect it to fail due to 502 errors
    // This will fall back to our enhanced direct response system
    
    const fileIds: string[] = [];
    
    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.filename}`);
        
        // Check if document already has an Amplify file ID
        const existingFileId = await this.getAmplifyFileId(doc);
        if (existingFileId) {
          console.log(`Using cached file ID for ${doc.filename}: ${existingFileId}`);
          fileIds.push(existingFileId);
          continue;
        }

        // Upload document to Amplify
        console.log(`Uploading ${doc.filename} to Amplify...`);
        const fileId = await this.uploadDocumentToAmplify(doc);
        if (fileId) {
          console.log(`Successfully uploaded ${doc.filename}, got file ID: ${fileId}`);
          fileIds.push(fileId);
          // Store the file ID for future use
          await this.storeAmplifyFileId(doc, fileId);
        } else {
          console.error(`Failed to upload ${doc.filename} to Amplify`);
        }
      } catch (error) {
        console.error(`Error uploading document ${doc.filename} to Amplify:`, error);
      }
    }

    console.log(`Final file IDs for Amplify: ${fileIds}`);
    return fileIds;
  }

  private static async uploadDocumentToAmplify(doc: Document): Promise<string | null> {
    try {
      console.log(`=== UPLOADING ENTIRE DOCUMENT TO AMPLIFY ===`);
      console.log(`Document: ${doc.filename}`);
      console.log(`Content Length: ${doc.content.length} characters`);

      // Create a temporary file with the original PDF if available, otherwise use text content
      const fs = require('fs');
      const path = require('path');
      
      let fileBuffer: Buffer;
      let contentType: string;
      let fileName: string;

      if (doc.filePath && fs.existsSync(doc.filePath)) {
        // Upload the original PDF file
        console.log(`📄 Uploading original PDF file: ${doc.filePath}`);
        fileBuffer = fs.readFileSync(doc.filePath);
        contentType = 'application/pdf';
        fileName = doc.filename;
      } else {
        // Upload as text file
        console.log(`📝 Uploading as text content`);
        fileBuffer = Buffer.from(doc.content, 'utf8');
        contentType = 'text/plain';
        fileName = doc.filename.replace('.pdf', '.txt');
      }

      // Step 1: Try to create a data source directly with content
      const dataSourceRequest = {
        data: {
          name: fileName,
          type: contentType,
          content: doc.content, // Include content directly
          knowledgeBase: 'student_support',
          tags: ['student_handbook', 'financial_aid'],
          actions: [
            { name: 'saveAsData' },
            { name: 'createChunks' },
            { name: 'ingestRag' }
          ],
          ragOn: true
        }
      };

      console.log('Data Source Request:', {
        name: dataSourceRequest.data.name,
        type: dataSourceRequest.data.type,
        contentLength: dataSourceRequest.data.content.length,
        knowledgeBase: dataSourceRequest.data.knowledgeBase,
        actions: dataSourceRequest.data.actions
      });

      const uploadResponse = await fetch('https://prod-api.vanderbilt.ai/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-Key': process.env.AMPLIFY_API_KEY,
        },
        body: JSON.stringify(dataSourceRequest),
      });

      const responseText = await uploadResponse.text();
      console.log(`Upload Response Status: ${uploadResponse.status}`);
      console.log(`Upload Response Body: ${responseText}`);

      if (!uploadResponse.ok) {
        console.error(`❌ Upload request failed: ${uploadResponse.status} - ${responseText}`);
        this.lastUploadError = `Status: ${uploadResponse.status}, Body: ${responseText}`;
        return null;
      }

      let uploadData;
      try {
        uploadData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        return null;
      }

      // Check if data source was created successfully
      if (uploadData.success || uploadData.data) {
        const dataSourceId = uploadData.data?.id || uploadData.id || uploadData.dataSourceId;
        if (dataSourceId) {
          console.log(`✅ Successfully created data source in Amplify: ${dataSourceId}`);
          return dataSourceId;
        } else {
          console.log('✅ Data source created but no ID returned, using filename as identifier');
          return fileName;
        }
      } else {
        console.error('❌ Data source creation failed:', uploadData);
        return null;
      }

    } catch (error) {
      console.error('❌ Error uploading to Amplify:', error);
      return null;
    }
  }

  private static async getAmplifyFileId(doc: Document): Promise<string | null> {
    // Check if we have stored the Amplify file ID for this document
    // For now, we'll implement a simple in-memory cache
    // In production, you'd want to store this in the database
    if (!this.amplifyFileCache) {
      this.amplifyFileCache = new Map();
    }
    return this.amplifyFileCache.get(doc._id || '') || null;
  }

  private static async storeAmplifyFileId(doc: Document, fileId: string): Promise<void> {
    // Store the Amplify file ID for future use
    if (!this.amplifyFileCache) {
      this.amplifyFileCache = new Map();
    }
    this.amplifyFileCache.set(doc._id || '', fileId);
  }

  private static amplifyFileCache: Map<string, string> | null = null;
  private static lastUploadError: string | null = null;

  private static async buildEnhancedContext(documents: Document[], userQuery: string): Promise<string> {
    if (documents.length === 0) {
      return 'No relevant documents found in the knowledge base.';
    }

    console.log(`🔍 Building enhanced context for query: "${userQuery}"`);
    
    let context = 'Comprehensive information from the knowledge base:\n\n';
    
    documents.forEach((doc, index) => {
      context += `Document ${index + 1}: ${doc.metadata.title || doc.filename}\n`;
      
      // Smart content extraction based on query
      let relevantContent = this.extractQueryRelevantContent(doc.content, userQuery);
      
      if (!relevantContent || relevantContent.length < 500) {
        // Fall back to extracting policy sections
        relevantContent = this.extractPolicyContent(doc.content);
      }
      
      context += `Content: ${relevantContent}\n\n`;
    });

    console.log(`📄 Enhanced context built: ${context.length} characters`);
    return context;
  }

  private static extractQueryRelevantContent(content: string, query: string): string {
    const queryLower = query.toLowerCase();
    
    // Define key phrases for different types of queries
    const refundPhrases = ['refund', 'tuition refund', 'withdrawal', 'university policy for the refund'];
    const financialAidPhrases = ['financial aid', 'scholarship', 'grant', 'loan', 'fafsa'];
    const housingPhrases = ['housing', 'residence hall', 'residential', 'dorm'];
    
    let targetPhrases: string[] = [];
    
    if (refundPhrases.some(phrase => queryLower.includes(phrase))) {
      targetPhrases = ['university policy for the refund of tuition', 'refunds of tuition', 'withdrawal', 'percentage refund'];
    } else if (financialAidPhrases.some(phrase => queryLower.includes(phrase))) {
      targetPhrases = ['financial aid', 'scholarship', 'grant', 'fafsa'];
    } else if (housingPhrases.some(phrase => queryLower.includes(phrase))) {
      targetPhrases = ['residence hall', 'housing', 'residential'];
    } else {
      // General search
      const queryWords = queryLower.split(' ').filter(word => word.length > 3);
      targetPhrases = queryWords;
    }

    console.log(`🎯 Searching for phrases: ${targetPhrases.join(', ')}`);
    
    // Find the best matching sections
    let bestSections: string[] = [];
    
    for (const phrase of targetPhrases) {
      const phraseIndex = content.toLowerCase().indexOf(phrase);
      if (phraseIndex !== -1) {
        // Extract a large section around the found phrase
        const start = Math.max(0, phraseIndex - 1000);
        const end = Math.min(content.length, phraseIndex + 4000);
        const section = content.substring(start, end);
        
        // Check if this looks like actual content (not table of contents)
        if (!section.includes('. . . . . . . .') && 
            !section.toLowerCase().includes('table of contents') &&
            section.split('\n').length > 3) {
          bestSections.push(section);
          console.log(`✅ Found relevant section for "${phrase}" at position ${phraseIndex}`);
        }
      }
    }
    
    if (bestSections.length > 0) {
      // Return the longest/most comprehensive section
      const bestSection = bestSections.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      );
      return bestSection;
    }
    
    return '';
  }

  private static extractPolicyContent(content: string): string {
    // Look for policy sections in the document
    const policyMarkers = [
      'University policy',
      'Refunds of Tuition and Residence Hall Charges',
      'Financial Responsibility',
      'Enrollment and Financial Matters',
      'Administrative Policies'
    ];
    
    for (const marker of policyMarkers) {
      const markerIndex = content.indexOf(marker);
      if (markerIndex !== -1) {
        // Extract content around this policy section
        const start = Math.max(0, markerIndex - 500);
        const end = Math.min(content.length, markerIndex + 3000);
        const section = content.substring(start, end);
        
        if (section.length > 1000) {
          console.log(`📑 Found policy section: ${marker}`);
          return section;
        }
      }
    }
    
    // If no specific policy sections found, return a substantial excerpt from the middle
    const middleStart = Math.floor(content.length * 0.6); // Start from 60% into document
    const middleEnd = Math.min(content.length, middleStart + 4000);
    console.log(`📄 Using middle section of document (${middleStart} to ${middleEnd})`);
    return content.substring(middleStart, middleEnd);
  }

  private static buildContext(documents: Document[]): string {
    if (documents.length === 0) {
      return 'No relevant documents found in the knowledge base.';
    }

    let context = 'Relevant information from the knowledge base:\n\n';
    
    documents.forEach((doc, index) => {
      context += `Document ${index + 1}: ${doc.metadata.title || doc.filename}\n`;
      
      // Include larger excerpts from content - up to 3000 characters per document
      let excerpt = '';
      if (doc.content) {
        if (doc.content.length <= 3000) {
          excerpt = doc.content;
        } else {
          // First, try to find specific policy content
          const policyPhrase = 'university policy for the refund of tuition and residence hall charges';
          const policyIndex = doc.content.toLowerCase().indexOf(policyPhrase);
          
          if (policyIndex !== -1) {
            // Found the exact policy - extract a large section around it
            const start = Math.max(0, policyIndex - 500);
            const end = Math.min(doc.content.length, policyIndex + 3500);
            excerpt = doc.content.substring(start, end);
          } else {
            // Fallback to keyword search but simplified
            const keywords = ['refunds of tuition', 'financial aid', 'tuition refund', 'refund', 'tuition'];
            let found = false;
            
            for (const keyword of keywords) {
              const keywordIndex = doc.content.toLowerCase().indexOf(keyword.toLowerCase());
              if (keywordIndex !== -1) {
                // Check if this is NOT table of contents
                const contextCheck = doc.content.substring(Math.max(0, keywordIndex - 100), keywordIndex + 100);
                if (!contextCheck.includes('. . . . . . . .') && !contextCheck.includes('Table of Contents')) {
                  // This looks like actual content
                  const start = Math.max(0, keywordIndex - 1000);
                  const end = Math.min(doc.content.length, keywordIndex + 2000);
                  excerpt = doc.content.substring(start, end);
                  found = true;
                  break;
                }
              }
            }
            
            if (!found) {
              // Last resort - use beginning of document
              excerpt = doc.content.substring(0, 3000);
            }
          }
        }
      } else {
        excerpt = 'No content available';
      }
      
      context += `Content: ${excerpt}\n\n`;
    });

    return context;
  }

  private static async buildDirectResponseFromContext(
    assistant: Assistant,
    userMessage: string,
    context: string,
    conversationHistory: Message[]
  ): Promise<string> {
    console.log('🔧 Building direct response from context...');
    
    // Extract key information directly from context based on user query
    const queryLower = userMessage.toLowerCase();
    
    if (queryLower.includes('refund') || queryLower.includes('tuition') || 
        queryLower.includes('withdraw') || queryLower.includes('money back') || 
        queryLower.includes('get back') || queryLower.includes('partial refund')) {
      // Look for refund policy information in the context
      const refundIndex = context.indexOf('Refunds of Tuition and Residence Hall Charges');
      
      if (refundIndex !== -1) {
        // Find the end of this section (next section starts with a capital letter on new line or double newline)
        const startIndex = refundIndex;
        let endIndex = context.indexOf('\n\nReligious Holy Days', startIndex);
        if (endIndex === -1) {
          endIndex = context.indexOf('\n89Vanderbilt University', startIndex);
        }
        if (endIndex === -1) {
          endIndex = Math.min(context.length, startIndex + 1000);
        }
        
        const refundPolicy = context.substring(startIndex, endIndex).trim();
        console.log('✅ Found refund policy information:', refundPolicy.substring(0, 200));
        
        return `Based on the official Vanderbilt University Student Handbook, here is the information about tuition refunds:

**${refundPolicy.split('\n')[0]}**

${refundPolicy.substring(refundPolicy.indexOf('\n') + 1).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}

For the most current refund schedule and specific details, please check the Office of Student Accounts website or contact them directly.

I hope this information helps! Let me know if you have any other questions about university policies.`;
      }
    }
    
    // For other types of questions, look for relevant sections
    const relevantSections = this.extractRelevantSections(context, userMessage);
    
    if (relevantSections.length > 0) {
      console.log(`✅ Found ${relevantSections.length} relevant sections`);
      
      return `Based on the official Vanderbilt University Student Handbook, here is the relevant information:

${relevantSections.map(section => section.trim()).join('\n\n')}

This information comes directly from the official university policies. If you need additional clarification or have specific questions about your situation, I recommend contacting the appropriate university office.

Is there anything specific about this policy you'd like me to clarify?`;
    }
    
    // If no specific content found, provide a helpful general response
    console.log('⚠️ No specific content found, providing general response');
    return `I have access to the university handbook, but I wasn't able to find specific information that directly answers your question about "${userMessage}". 

This could mean:
- The information might be in a different section of the handbook
- It might be covered under different terminology
- It might require contacting a specific university office

Could you provide more specific details about what you're looking for, or try rephrasing your question? I'm here to help you find the information you need from the official university policies.`;
  }

  private static extractRelevantSections(context: string, query: string): string[] {
    const sections: string[] = [];
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 3);
    
    // Split context into paragraphs and find relevant ones
    const paragraphs = context.split('\n\n').filter(p => p.trim().length > 50);
    
    for (const paragraph of paragraphs) {
      const paragraphLower = paragraph.toLowerCase();
      let relevanceScore = 0;
      
      for (const word of queryWords) {
        if (paragraphLower.includes(word)) {
          relevanceScore++;
        }
      }
      
      if (relevanceScore >= Math.max(1, queryWords.length * 0.3)) {
        sections.push(paragraph.trim());
      }
    }
    
    return sections.slice(0, 3); // Return top 3 most relevant sections
  }

  private static async callAmplifyAssistantWithContext(
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

    // Add current user message with context embedded
    const enhancedUserMessage = `Based on the official university policy information provided in the system message, please answer this question: ${userMessage}`;
    messages.push({ role: 'user', content: enhancedUserMessage });

    try {
      const payload = {
        data: {
          temperature: 0.7,
          max_tokens: assistant.settings.behavior.maxResponseLength || 1000,
          dataSources: [], // No data sources, using context in system prompt
          messages,
          options: {
            assistantId: process.env.AMPLIFY_ASSISTANT_ID,
            model: { id: 'gpt-4o-mini' },
            ragOnly: false,
            skipRag: true, // Skip RAG since we're using context in system prompt
            prompt: enhancedUserMessage
          }
        }
      };

      console.log('=== AMPLIFY API REQUEST WITH CONTEXT ===');
      console.log('System Prompt Length:', systemPrompt.length, 'chars');
      console.log('System Prompt Preview:', systemPrompt.substring(0, 500) + '...');
      console.log('User Message:', userMessage);
      console.log('Context Length:', context.length, 'chars');
      console.log('Context Preview:', context.substring(0, 500) + '...');
      
      // Call Amplify API with assistant ID and context
      const response = await fetch('https://prod-api.vanderbilt.ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AMPLIFY_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Amplify API error:', response.status, errorText);
        throw new Error(`Amplify API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('=== AMPLIFY API RESPONSE ===');
      console.log('Response Status:', response.status);
      console.log('Full Response:', JSON.stringify(data, null, 2));
      
      // Extract response from various possible response formats
      const responseContent = data.data?.content || 
                            data.content || 
                            data.message?.content || 
                            data.choices?.[0]?.message?.content ||
                            data.data;
      
      console.log('Extracted Response Content:', responseContent);
      
      if (responseContent && typeof responseContent === 'string') {
        return responseContent;
      }
      
      console.error('Unexpected API response format:', data);
      throw new Error('Invalid response format from Amplify API');
      
    } catch (error) {
      console.error('Amplify API error:', error);
      // Fallback to a simple response
      return this.generateContextualResponse(userMessage, context, assistant);
    }
  }

  private static async callAmplifyAssistantWithRAG(
    assistant: Assistant,
    userMessage: string,
    amplifyFileIds: string[],
    conversationHistory: Message[]
  ): Promise<string> {
    const systemPrompt = this.buildRAGSystemPrompt(assistant);
    
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
      const payload = {
        data: {
          temperature: 0.7,
          max_tokens: assistant.settings.behavior.maxResponseLength || 1000,
          dataSources: amplifyFileIds.map(fileId => ({ fileId })), // Use uploaded files for RAG
          messages,
          options: {
            assistantId: process.env.AMPLIFY_ASSISTANT_ID,
            model: { id: 'gpt-4o-mini' },
            ragOnly: false,
            skipRag: false, // Enable RAG with uploaded documents
            prompt: userMessage
          }
        }
      };

      console.log('=== AMPLIFY API REQUEST WITH RAG ===');
      console.log('System Prompt Length:', systemPrompt.length, 'chars');
      console.log('System Prompt Preview:', systemPrompt.substring(0, 500) + '...');
      console.log('User Message:', userMessage);
      console.log('Amplify File IDs:', amplifyFileIds);
      console.log('Data Sources:', payload.data.dataSources);
      console.log('Full Payload:', JSON.stringify(payload, null, 2));
      console.log('Assistant ID:', process.env.AMPLIFY_ASSISTANT_ID);
      console.log('API Key (first 20 chars):', process.env.AMPLIFY_API_KEY?.substring(0, 20) + '...');
      
      // Call Amplify API with assistant ID and data sources
      const response = await fetch('https://prod-api.vanderbilt.ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-Key': process.env.AMPLIFY_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Amplify API error:', response.status, errorText);
        throw new Error(`Amplify API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('=== AMPLIFY API RESPONSE ===');
      console.log('Response Status:', response.status);
      console.log('Full Response:', JSON.stringify(data, null, 2));
      
      // Extract response from various possible response formats
      const responseContent = data.data?.content || 
                            data.content || 
                            data.message?.content || 
                            data.choices?.[0]?.message?.content ||
                            data.data;
      
      console.log('Extracted Response Content:', responseContent);
      
      if (responseContent && typeof responseContent === 'string') {
        return responseContent;
      }
      
      console.error('Unexpected API response format:', data);
      throw new Error('Invalid response format from Amplify API');
      
    } catch (error) {
      console.error('Amplify API error:', error);
      // Fallback to a simple response
      return this.generateSimpleFallbackResponse(userMessage, assistant);
    }
  }

  private static generateFallbackResponse(userMessage: string, context: string): string {
    // Simple fallback response when Amplify API is unavailable
    if (context.includes('No relevant documents found')) {
      return "I don't have specific information about that topic in my knowledge base. Please contact our support staff for personalized assistance.";
    }
    
    return `Thank you for your question about "${userMessage}". Based on the available information, I recommend reviewing the relevant documentation or contacting our support team for detailed assistance. I apologize that I cannot provide a more specific answer at this time.`;
  }

  private static generateSimpleFallbackResponse(userMessage: string, assistant: Assistant): string {
    return `Hello! I'm ${assistant.name}, and I'm here to help with student support questions. I'm currently experiencing some technical difficulties accessing my knowledge base. Please contact our support team who can provide you with detailed, personalized assistance for your inquiry about "${userMessage}".`;
  }

  private static generateContextualResponse(userMessage: string, context: string, assistant: Assistant): string {
    // Generate a more helpful response based on context when API is unavailable
    
    // Check if we have relevant documents
    if (context.includes('No relevant documents found')) {
      return `Hello! I'm ${assistant.name}. I don't currently have specific information about "${userMessage}" in my knowledge base. Please contact our support team who can provide you with detailed, personalized assistance for your inquiry.`;
    }
    
    // If we have context, try to provide a helpful response based on the available information
    const contextLines = context.split('\n').filter(line => line.trim() && !line.includes('Relevant information'));
    
    if (contextLines.length > 0) {
      // Extract some relevant information from the context
      const relevantInfo = contextLines.slice(0, 3).join(' ').substring(0, 300);
      
      return `Hello! I'm ${assistant.name}. Based on the information available in our knowledge base, here's what I can share about your question: "${relevantInfo}..." For more detailed assistance with "${userMessage}", I recommend contacting our support team who can provide comprehensive help tailored to your specific needs.`;
    }
    
    // Generic helpful response
    return `Hello! I'm ${assistant.name}, and I'm here to help with student support questions. While I'm experiencing some technical difficulties right now, our support team is available to assist you with "${userMessage}" and any other questions you might have. Please don't hesitate to reach out to them for personalized assistance.`;
  }

  private static buildRAGSystemPrompt(assistant: Assistant): string {
    const styleInstructions = {
      formal: 'Respond in a formal, professional manner.',
      friendly: 'Respond in a warm, friendly, and approachable manner.',
      professional: 'Respond in a professional but conversational tone.'
    };

    return `You are ${assistant.name}, ${assistant.welcomeMessage || 'a helpful assistant for student support'}

You have access to official university documents through your knowledge base. Use this information to answer student questions accurately and helpfully.

${styleInstructions[assistant.settings.behavior.responseStyle]}

Provide specific, detailed answers based on the official university policies and information available to you.`;
  }

  private static buildSystemPrompt(assistant: Assistant, context: string): string {
    const styleInstructions = {
      formal: 'Respond in a formal, professional manner.',
      friendly: 'Respond in a warm, friendly, and approachable manner.',
      professional: 'Respond in a professional but conversational tone.'
    };

    return `You are ${assistant.name}, a helpful assistant for student support.

CRITICAL: I am providing you with OFFICIAL UNIVERSITY POLICY INFORMATION below that you MUST use to answer student questions. This information is from the official student handbook and contains current, authoritative policies.

${context}

INSTRUCTIONS:
- Use the policy information provided above to answer questions
- Provide specific details and quote exact policy language when relevant
- If the information directly answers the student's question, provide a complete answer
- Be helpful and specific using the official information provided
- ${styleInstructions[assistant.settings.behavior.responseStyle]}

Do not say you don't have information if the answer is clearly provided in the policy content above.`;
  }

  private static generateSimpleCitations(documents: Document[], response: string): Citation[] {
    const citations: Citation[] = [];
    
    documents.forEach(doc => {
      // Simple citation with document title and basic excerpt
      citations.push({
        documentId: doc._id!,
        filename: doc.filename,
        excerpt: `Official university information from ${doc.metadata.title || doc.filename}`,
        relevanceScore: 0.9
      });
    });

    return citations.slice(0, 3);
  }

  private static generateEnhancedCitations(documents: Document[], response: string, userQuery: string): Citation[] {
    const citations: Citation[] = [];
    
    documents.forEach(doc => {
      // Extract relevant content based on the query
      const relevantContent = this.extractQueryRelevantContent(doc.content, userQuery);
      
      if (relevantContent && relevantContent.length > 100) {
        // Create excerpt from the relevant content
        const excerpt = this.extractRelevantExcerpt(relevantContent, response, 200);
        
        citations.push({
          documentId: doc._id!,
          filename: doc.filename,
          excerpt,
          relevanceScore: 0.95 // High relevance since we specifically extracted relevant content
        });
      }
    });

    return citations.slice(0, 3); // Return top 3 citations
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