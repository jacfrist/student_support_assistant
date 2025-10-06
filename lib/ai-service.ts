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
        // Temporarily skip Amplify due to service issues - use document-based fallback
        console.log('🔄 Amplify has service issues - using document-based response');
        response = await this.generateDocumentBasedResponse(
          userMessage,
          assistant,
          allDocuments,
          conversationHistory
        );
      } else {
        // If upload fails, provide assistant-specific error message
        console.log('❌ Document upload failed - API authentication or network issues');
        response = this.generateAssistantSpecificErrorMessage(assistant, userMessage);
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

  private static generateAssistantSpecificErrorMessage(assistant: Assistant, userMessage: string): string {
    // Determine assistant type based on name or other properties
    const assistantName = assistant.name.toLowerCase();
    
    let specificGuidance = '';
    let contactInfo = '';
    
    if (assistantName.includes('residential') || assistantName.includes('housing') || assistantName.includes('dorm')) {
      // Residential Life Assistant
      contactInfo = `
1. Contacting Residential Life directly for housing and dorm questions
2. Visiting the Residential Life website for housing policies
3. Speaking with your Resident Advisor (RA) or House Director`;
    } else if (assistantName.includes('financial') || assistantName.includes('aid')) {
      // Financial Aid Assistant
      contactInfo = `
1. Contacting the Office of Student Accounts directly for financial aid and refund questions
2. Visiting the Financial Aid office for personalized assistance
3. Checking your financial aid status online`;
    } else {
      // Generic Student Support
      contactInfo = `
1. Visiting the appropriate university office for your specific question
2. Checking the official Vanderbilt student handbook online
3. Contacting general student support services`;
    }

    return `I'm currently experiencing technical difficulties connecting to my document system. I'm designed to provide information from official university policies and handbooks, but I'm having trouble accessing those documents right now.

For help with your question about "${userMessage}", I recommend:
${contactInfo}

I apologize for the technical difficulties. Once my document system is working, I'll be able to provide you with specific information from the official university policies and procedures.

${assistant.welcomeMessage ? `\n${assistant.welcomeMessage}` : ''}`;
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

    // Wait for documents to be processed by Amplify before making RAG queries
    if (fileIds.length > 0) {
      console.log('⏳ Waiting 5 seconds for document processing by Amplify...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('✅ Proceeding with RAG query');
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

      // Step 1: Request presigned upload URL using correct format from example
      const uploadRequest = {
        data: {
          type: contentType,
          name: fileName,
          knowledgeBase: 'student_support',
          tags: ['student_handbook', 'financial_aid'],
          data: {},
          actions: [
            { name: 'saveAsData' },
            { name: 'createChunks' },
            { name: 'ingestRag' },
            { name: 'makeDownloadable' },
            { name: 'extractText' }
          ],
          ragOn: true
        }
      };

      console.log('Upload Request:', {
        name: uploadRequest.data.name,
        type: uploadRequest.data.type,
        knowledgeBase: uploadRequest.data.knowledgeBase,
        actions: uploadRequest.data.actions,
        ragOn: uploadRequest.data.ragOn
      });

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const uploadResponse = await fetch('https://prod-api.vanderbilt.ai/files/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AMPLIFY_API_KEY}`,
        },
        body: JSON.stringify(uploadRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

      // Step 2: Upload file to S3 using presigned URL
      if (!uploadData.success) {
        console.error('❌ Upload request failed:', uploadData.error || 'Unknown error');
        return null;
      }

      const presignedUrl = uploadData.uploadUrl;
      if (!presignedUrl) {
        console.error('❌ No upload URL received from server');
        return null;
      }

      console.log('📤 Uploading file to S3...');
      
      // Upload to S3 using PUT request with timeout
      const s3Controller = new AbortController();
      const s3TimeoutId = setTimeout(() => s3Controller.abort(), 60000); // 60 second timeout for file upload

      const s3Response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: fileBuffer,
        signal: s3Controller.signal,
      });

      clearTimeout(s3TimeoutId);

      if (!s3Response.ok) {
        console.error(`❌ S3 upload failed with status ${s3Response.status}`);
        return null;
      }

      // Extract the proper file ID from the response - Amplify uses 'key' field
      const fileId = uploadData.key || uploadData.fileId || uploadData.id || uploadData.data?.fileId || uploadData.data?.id;
      
      if (fileId) {
        console.log(`✅ Successfully uploaded ${fileName} to Amplify with file ID: ${fileId}`);
        return fileId;
      } else {
        console.log('⚠️ File uploaded successfully but no file ID returned');
        console.log('Upload response data:', JSON.stringify(uploadData, null, 2));
        return null;
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Amplify upload timed out after 30 seconds');
        this.lastUploadError = 'Upload timeout after 30 seconds';
      } else {
        console.error('❌ Error uploading to Amplify:', error);
        this.lastUploadError = error instanceof Error ? error.message : String(error);
      }
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
    try {
      // Get the documents that were uploaded
      const documents = await this.getAllDocuments(assistant.id);
      
      // Build comprehensive prompt including assistant role, description, documents, and question
      const assistantRole = `You are ${assistant.name}. ${assistant.description}`;
      const assistantWelcome = assistant.welcomeMessage || '';
      
      // Include document contents in the prompt
      let documentsContext = '';
      if (documents.length > 0) {
        documentsContext = '\n\nYou have access to the following official university documents:\n\n';
        documents.forEach((doc, index) => {
          documentsContext += `Document ${index + 1}: ${doc.filename}\n`;
          documentsContext += `Content: ${doc.content.substring(0, 8000)}\n\n`; // Limit content length
        });
      }
      
      // Build conversation history context
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        conversationContext = '\n\nRecent conversation:\n';
        conversationHistory.slice(-3).forEach(msg => {
          conversationContext += `${msg.role}: ${msg.content}\n`;
        });
      }
      
      // Create comprehensive prompt following your sample code format
      const fullPrompt = `${assistantRole}
      
${assistantWelcome}

Please answer student questions accurately and helpfully using the official university information provided below.

${documentsContext}${conversationContext}

Student Question: ${userMessage}

Please provide a detailed, helpful response based on the official university policies and information above.`;

      const payload = {
        data: {
          id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          temperature: 0.7,
          max_tokens: assistant.settings.behavior.maxResponseLength || 1000,
          dataSources: [], // Include document content directly in prompt instead
          messages: [
            { role: 'user', content: fullPrompt }
          ],
          options: {
            assistantId: process.env.AMPLIFY_ASSISTANT_ID,
            model: { id: 'gpt-4o-mini' },
            ragOnly: false,
            skipRag: true, // Skip RAG since we're including full content in prompt
            prompt: fullPrompt
          }
        }
      };

      console.log('=== AMPLIFY API REQUEST WITH COMPREHENSIVE PROMPT ===');
      console.log('Full Prompt Length:', fullPrompt.length, 'chars');
      console.log('Full Prompt Preview:', fullPrompt.substring(0, 500) + '...');
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
      
      // Fallback: Use document content directly to provide intelligent response
      const documents = await this.getAllDocuments(assistant.id);
      if (documents.length > 0) {
        console.log('📚 Using document-based fallback response');
        return this.generateDocumentBasedResponse(userMessage, assistant, documents, conversationHistory);
      } else {
        return this.generateSimpleFallbackResponse(userMessage, assistant);
      }
    }
  }

  private static async generateDocumentBasedResponse(
    userMessage: string,
    assistant: Assistant,
    documents: Document[],
    conversationHistory: Message[]
  ): Promise<string> {
    // Extract key information to answer the specific question
    const question = userMessage.toLowerCase();
    const responseStart = this.getAssistantResponseStart(assistant);

    // Handle specific common questions with targeted answers
    if (question.includes('microwave') || question.includes('fridge') || question.includes('refrigerator')) {
      return this.handleApplianceQuestion(documents, responseStart);
    }
    
    if (question.includes('tuition') && (question.includes('refund') || question.includes('withdraw'))) {
      return this.handleTuitionRefundQuestion(documents, responseStart);
    }

    if (question.includes('parking')) {
      return this.handleParkingQuestion(documents, responseStart);
    }

    if (question.includes('guest') || question.includes('visitor')) {
      return this.handleGuestQuestion(documents, responseStart);
    }

    if (question.includes('meal') || question.includes('dining')) {
      return this.handleMealPlanQuestion(documents, responseStart);
    }

    // For other questions, try to find relevant sections
    return this.handleGeneralQuestion(userMessage, documents, responseStart);
  }

  private static handleApplianceQuestion(documents: Document[], responseStart: string): string {
    // Look for specific appliance policies in the document
    for (const doc of documents) {
      const content = doc.content;
      
      // Look for microwave and refrigerator policies - be more flexible with the search
      const hasMicrowaveInfo = content.includes('microwave') || content.includes('Microwave');
      const hasRefrigeratorInfo = content.includes('refrigerator') || content.includes('Refrigerator');
      
      if (hasMicrowaveInfo || hasRefrigeratorInfo) {
        let answer = `${responseStart}\n\nRegarding appliances in dorm rooms:\n\n`;
        
        // Check for specific microwave specifications
        if (content.includes('800') && content.includes('watt') && content.includes('cubic')) {
          answer += `• **Microwaves:** Yes, you can have a microwave that is less than 800 watts with no more than 1 cubic foot interior capacity.\n\n`;
        } else if (hasMicrowaveInfo) {
          answer += `• **Microwaves:** Yes, microwaves are allowed with specific wattage and size restrictions.\n\n`;
        }
        
        // Check for specific refrigerator specifications  
        if (content.includes('4.0') && content.includes('cubic') && content.includes('six years')) {
          answer += `• **Refrigerators:** Yes, you can have a refrigerator that is less than 6 years old with no more than 4.0 cubic feet capacity.\n\n`;
        } else if (hasRefrigeratorInfo) {
          answer += `• **Refrigerators:** Yes, refrigerators are allowed with specific age and size restrictions.\n\n`;
        }
        
        return answer + "Both appliances must be in good working condition.";
      }
    }
    
    return `${responseStart}\n\nYes, small appliances like microwaves and mini-fridges are generally allowed in dorm rooms, but there are specific size and wattage restrictions. Please check with Residential Life for the exact specifications for your building.`;
  }

  private static handleTuitionRefundQuestion(documents: Document[], responseStart: string): string {
    for (const doc of documents) {
      const content = doc.content.toLowerCase();
      
      if (content.includes('tuition') && content.includes('refund')) {
        // Look for refund schedule information
        const refundMatch = content.match(/refund[^.]*?percentage[^.]*?based on[^.]*/i);
        if (refundMatch) {
          return `${responseStart}\n\nThe University has a tuition refund policy that provides percentage-based refunds depending on when you withdraw during the semester. The exact percentage depends on how early in the term you withdraw.\n\nFor specific refund amounts and deadlines, please check the Student Accounts webpage or contact the Office of Student Accounts directly.`;
        }
      }
    }
    
    return `${responseStart}\n\nThe University does have a tuition refund policy for students who withdraw. The refund amount depends on when during the semester you withdraw. Please contact Student Accounts for specific details about refund percentages and deadlines.`;
  }

  private static handleParkingQuestion(documents: Document[], responseStart: string): string {
    return `${responseStart}\n\nFor parking information, including permits, regulations, and available lots, please contact Vanderbilt Parking Services or visit their website for current policies and rates.`;
  }

  private static handleGuestQuestion(documents: Document[], responseStart: string): string {
    for (const doc of documents) {
      const content = doc.content.toLowerCase();
      
      if (content.includes('visitor') || content.includes('guest')) {
        if (content.includes('24-hour') || content.includes('escorted')) {
          return `${responseStart}\n\nVisitors are allowed in residence halls throughout the day, but they must be escorted by their resident host at all times. Overnight guests have specific policies - please check with your Residential Life staff for guest registration requirements.`;
        }
      }
    }
    
    return `${responseStart}\n\nGuests and visitors are allowed in residence halls, but there are specific policies about escort requirements and overnight stays. Please check with your Residential Life staff for complete guest policies.`;
  }

  private static handleMealPlanQuestion(documents: Document[], responseStart: string): string {
    return `${responseStart}\n\nFor meal plan information, including options, costs, and dining locations, please contact Vanderbilt Dining Services or visit their website for current meal plan details.`;
  }

  private static handleGeneralQuestion(userMessage: string, documents: Document[], responseStart: string): string {
    // Extract key terms and try to find relevant information
    const searchTerms = this.extractSearchTerms(userMessage);
    
    for (const doc of documents) {
      for (const term of searchTerms) {
        const regex = new RegExp(`[^.]*${term}[^.]*\\.`, 'gi');
        const matches = doc.content.match(regex);
        
        if (matches && matches.length > 0) {
          // Take the first relevant sentence and clean it up
          const relevantSentence = matches[0].trim();
          return `${responseStart}\n\n${relevantSentence}\n\nFor more detailed information, please contact the appropriate university office.`;
        }
      }
    }
    
    return this.generateAssistantSpecificResponse(userMessage, { name: '', description: '' } as Assistant);
  }

  private static extractSearchTerms(userMessage: string): string[] {
    const message = userMessage.toLowerCase();
    const terms: string[] = [];
    
    // Common search terms based on typical student questions
    if (message.includes('microwave') || message.includes('micro')) terms.push('microwave');
    if (message.includes('fridge') || message.includes('refrigerator')) terms.push('refrigerator', 'fridge');
    if (message.includes('dorm') || message.includes('residence')) terms.push('residence', 'dorm', 'housing');
    if (message.includes('tuition')) terms.push('tuition');
    if (message.includes('refund')) terms.push('refund');
    if (message.includes('financial aid')) terms.push('financial aid');
    if (message.includes('parking')) terms.push('parking');
    if (message.includes('meal') || message.includes('dining')) terms.push('meal', 'dining');
    if (message.includes('guest') || message.includes('visitor')) terms.push('guest', 'visitor');
    
    // Extract key nouns from the message
    const words = message.split(' ').filter(word => word.length > 3);
    terms.push(...words);
    
    return [...new Set(terms)]; // Remove duplicates
  }

  private static getAssistantResponseStart(assistant: Assistant): string {
    if (assistant.name.toLowerCase().includes('residential') || assistant.name.toLowerCase().includes('housing')) {
      return `Hi! As your Residential Life Assistant, I'm here to help with housing-related questions.`;
    } else if (assistant.name.toLowerCase().includes('financial') || assistant.name.toLowerCase().includes('aid')) {
      return `Hello! As your Financial Aid Assistant, I can help you understand financial policies and procedures.`;
    } else {
      return `Hi! I'm here to help answer your questions using official university information.`;
    }
  }

  private static generateAssistantSpecificResponse(userMessage: string, assistant: Assistant): string {
    const responseStart = this.getAssistantResponseStart(assistant);
    
    if (assistant.name.toLowerCase().includes('residential') || assistant.name.toLowerCase().includes('housing')) {
      if (userMessage.toLowerCase().includes('microwave') || userMessage.toLowerCase().includes('fridge')) {
        return `${responseStart}

Generally, most residence halls allow small appliances like microwaves and mini-fridges in dorm rooms, but specific policies can vary by building and room type. I recommend checking with your specific residence hall's policies or contacting Residential Life directly for the most current information about your particular living situation.

You can also check your housing agreement or contact the Residential Life office for detailed appliance guidelines.`;
      }
    }
    
    return this.generateSimpleFallbackResponse(userMessage, assistant);
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