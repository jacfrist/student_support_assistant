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
      
      // Upload documents to Amplify and get response directly
      const response = await this.chatWithAmplify(assistant, allDocuments, userMessage, conversationHistory);
      
      // Citations disabled per user request
      const citations: Citation[] = [];
      
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

  private static async chatWithAmplify(
    assistant: Assistant,
    documents: Document[],
    userMessage: string,
    conversationHistory: Message[]
  ): Promise<string> {
    try {
      // Upload documents to Amplify if not already uploaded
      const dataSourceIds = await this.ensureDocsUploadedToAmplify(documents);
      
      // Create system message based on assistant role
      const systemMessage = this.createSystemMessage(assistant);
      
      // Build messages array for conversation history
      const messages = this.buildMessagesArray(systemMessage, conversationHistory, userMessage);
      
      // Call Amplify chat API
      const payload = {
        data: {
          temperature: 0.7,
          max_tokens: 1000,
          messages,
          dataSources: dataSourceIds,
          options: {
            ragOnly: false,
            skipRag: false,
            model: { id: "gpt-4o" },
            prompt: userMessage,
            assistantId: process.env.AMPLIFY_ASSISTANT_ID
          }
        }
      };

      console.log('=== CALLING AMPLIFY API ===');
      console.log('Assistant:', assistant.name);
      console.log('Message:', userMessage);
      console.log('Data Sources:', dataSourceIds);
      console.log('Payload:', JSON.stringify(payload, null, 2));

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
      console.log('Response Data:', JSON.stringify(data, null, 2));
      
      // Extract response content from various possible response formats
      const responseContent = data.data?.content || 
                            data.content || 
                            data.message?.content || 
                            data.choices?.[0]?.message?.content ||
                            data.data;
      
      if (responseContent && typeof responseContent === 'string') {
        // Clean up any citations or page references that might have slipped through
        return this.cleanUpCitations(responseContent);
      }
      
      console.error('Unexpected API response format:', data);
      throw new Error('Invalid response format from Amplify API');
      
    } catch (error) {
      console.error('Amplify chat error:', error);
      throw error;
    }
  }

  private static createSystemMessage(assistant: Assistant): string {
    // Create system message based on assistant type and role
    const baseCitationInstruction = "IMPORTANT: You must provide answers in your own words. Never mention documents, policies, handbooks, guides, or any source materials. Do not use quotation marks or quote any text. Do not use phrases like 'According to the document', 'The document states', 'The policy says', 'Based on the information provided', or similar references. Students should not know that you are referencing any materials. Speak naturally as if you have the knowledge directly, without referencing where the information comes from.";
    
    if (assistant.name.toLowerCase().includes('residential') || assistant.name.toLowerCase().includes('housing')) {
      return `You are ${assistant.name}. You are a helpful assistant that provides information about residential life, housing policies, and campus living. Use the uploaded documents to answer questions accurately and helpfully. Provide clear, direct answers based on the official policies and information in the documents. ${baseCitationInstruction}`;
    } else if (assistant.name.toLowerCase().includes('financial') || assistant.name.toLowerCase().includes('aid')) {
      return `You are ${assistant.name}. You are a helpful assistant that provides information about financial aid, tuition policies, and financial procedures. Use the uploaded documents to answer questions accurately and helpfully. Provide clear, direct answers based on the official policies and information in the documents. ${baseCitationInstruction}`;
    } else {
      return `You are ${assistant.name}. ${assistant.description || 'You are a helpful assistant.'} Use the uploaded documents to answer questions accurately and helpfully. Provide clear, direct answers based on the official information in the documents. ${baseCitationInstruction}`;
    }
  }

  private static buildMessagesArray(systemMessage: string, conversationHistory: Message[], userMessage: string): any[] {
    const messages = [];
    
    // Add system message
    messages.push({
      role: 'system',
      content: systemMessage
    });
    
    // Add conversation history (last 5 messages to keep context manageable)
    const recentHistory = conversationHistory.slice(-5);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });
    
    return messages;
  }

  private static async ensureDocsUploadedToAmplify(documents: Document[]): Promise<string[]> {
    const dataSourceIds: string[] = [];
    
    for (const doc of documents) {
      try {
        // Check if document has an amplify file ID stored
        if (doc.amplifyFileId) {
          console.log(`📄 Using existing Amplify file ID for ${doc.filename}: ${doc.amplifyFileId}`);
          dataSourceIds.push(doc.amplifyFileId);
          continue;
        }
        
        // Upload document to Amplify
        console.log(`📤 Uploading ${doc.filename} to Amplify...`);
        const fileId = await this.uploadDocumentToAmplify(doc);
        
        if (fileId) {
          // Store the Amplify file ID for future use
          FileStorage.updateDocument(doc.assistantId, doc.filePath, { amplifyFileId: fileId });
          dataSourceIds.push(fileId);
          console.log(`✅ Uploaded ${doc.filename} successfully: ${fileId}`);
        } else {
          console.log(`❌ Failed to upload ${doc.filename}`);
        }
        
      } catch (error) {
        console.error(`Error uploading ${doc.filename}:`, error);
      }
    }
    
    return dataSourceIds;
  }

  private static async uploadDocumentToAmplify(document: Document): Promise<string | null> {
    try {
      // Determine MIME type
      let mimeType = 'application/pdf';
      const filename = document.filename.toLowerCase();
      if (filename.endsWith('.txt')) mimeType = 'text/plain';
      if (filename.endsWith('.doc') || filename.endsWith('.docx')) mimeType = 'application/msword';
      
      // Step 1: Request upload URL from Amplify
      const uploadPayload = {
        data: {
          type: mimeType,
          name: document.filename,
          knowledgeBase: "university_documents",
          tags: ["university", "policy", "student_support"],
          data: {},
          actions: [
            { name: "saveAsData" },
            { name: "createChunks" },
            { name: "ingestRag" },
            { name: "makeDownloadable" },
            { name: "extractText" }
          ],
          ragOn: true
        }
      };

      const uploadResponse = await fetch('https://prod-api.vanderbilt.ai/files/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AMPLIFY_API_KEY}`,
        },
        body: JSON.stringify(uploadPayload),
      });

      if (!uploadResponse.ok) {
        console.error('Upload request failed:', uploadResponse.status);
        return null;
      }

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success || !uploadResult.uploadUrl) {
        console.error('No upload URL received');
        return null;
      }

      // Step 2: Upload file content to S3 using presigned URL
      const fileContent = Buffer.from(document.content, 'base64');
      
      const s3Response = await fetch(uploadResult.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: fileContent,
      });

      if (!s3Response.ok) {
        console.error('S3 upload failed:', s3Response.status);
        return null;
      }

      // Step 3: Wait for file to be processed (simplified)
      console.log(`⏳ Waiting for ${document.filename} to be processed...`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      // Step 4: Query for the file ID
      const fileId = await this.getAmplifyFileId(document.filename);
      
      return fileId;
      
    } catch (error) {
      console.error('Error uploading to Amplify:', error);
      return null;
    }
  }

  private static async getAmplifyFileId(filename: string): Promise<string | null> {
    try {
      const queryPayload = {
        data: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          pageSize: 50,
          pageIndex: 0,
          forwardScan: true,
          sortIndex: "createdAt",
          types: ["application/pdf", "text/plain", "application/msword"],
          tags: []
        }
      };

      const queryResponse = await fetch('https://prod-api.vanderbilt.ai/files/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AMPLIFY_API_KEY}`,
        },
        body: JSON.stringify(queryPayload),
      });

      if (!queryResponse.ok) {
        console.error('File query failed:', queryResponse.status);
        return null;
      }

      const queryResult = await queryResponse.json();
      const files = queryResult.data?.items || [];

      // Find the file by name
      for (const file of files) {
        if (file.name === filename) {
          return file.id;
        }
      }

      console.log(`File ${filename} not found in Amplify`);
      return null;
      
    } catch (error) {
      console.error('Error querying Amplify files:', error);
      return null;
    }
  }

  private static cleanUpCitations(response: string): string {
    // Remove various citation patterns that might appear in responses
    let cleanedResponse = response;
    
    // Remove page references like [Page 67], (Page 67), [p. 67], etc.
    cleanedResponse = cleanedResponse.replace(/\[Page \d+\]/gi, '');
    cleanedResponse = cleanedResponse.replace(/\(Page \d+\)/gi, '');
    cleanedResponse = cleanedResponse.replace(/\[p\. \d+\]/gi, '');
    cleanedResponse = cleanedResponse.replace(/\(p\. \d+\)/gi, '');
    
    // Remove document references like [Document: filename.pdf]
    cleanedResponse = cleanedResponse.replace(/\[Document: [^\]]+\]/gi, '');
    cleanedResponse = cleanedResponse.replace(/\(Document: [^\)]+\)/gi, '');
    
    // Remove source references like [Source: ...]
    cleanedResponse = cleanedResponse.replace(/\[Source: [^\]]+\]/gi, '');
    cleanedResponse = cleanedResponse.replace(/\(Source: [^\)]+\)/gi, '');
    
    // Remove reference numbers like [1], [2], etc.
    cleanedResponse = cleanedResponse.replace(/\[\d+\]/gi, '');
    
    // Remove any remaining bracket or parenthetical citations
    cleanedResponse = cleanedResponse.replace(/\[[^\]]*(?:page|doc|source)[^\]]*\]/gi, '');
    cleanedResponse = cleanedResponse.replace(/\([^\)]*(?:page|doc|source)[^\)]*\)/gi, '');
    
    // Remove ALL references to source materials and documents
    cleanedResponse = cleanedResponse.replace(/According to the (?:document|policy|handbook|guide|material|information),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/The (?:document|policy|handbook|guide|material) (?:states|says|mentions|indicates|explains|notes|specifies),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/As stated in the (?:document|policy|handbook|guide|material),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/Based on the (?:document|policy|handbook|guide|material|information|provided information),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/According to (?:the\s+)?(?:provided\s+)?(?:university\s+)?(?:policy|information|material|handbook|guide),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/This is stated in the (?:document|policy|handbook|guide) as follows:?\.?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/The (?:document|policy|handbook|guide|material) (?:also\s+)?(?:explains|indicates|shows|notes),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/As (?:mentioned|outlined|described) in the (?:document|policy|handbook|guide|material),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/The (?:document|policy|handbook|guide|material) (?:also\s+)?mentions:?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/(?:From|In) (?:the\s+)?(?:document|handbook|policy|guide|material),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/As (?:per|outlined in|described in|noted in) (?:the\s+)?(?:document|policy|handbook|guide|material),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/The (?:provided\s+)?(?:information|material) (?:states|indicates|shows|suggests),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/(?:This|The) (?:document|handbook|guide|policy|material) (?:also\s+)?(?:states|mentions|says|indicates|explains|notes|specifies),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/As (?:the\s+)?(?:document|policy|handbook|guide|material) (?:states|mentions|explains|indicates),?\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/(?:Referring to|Reference to|Per) (?:the\s+)?(?:document|policy|handbook|guide|material),?\s*/gi, '');
    
    // Remove ALL quoted text - students should never see quoted material
    // Remove quotes containing policy/formal language
    cleanedResponse = cleanedResponse.replace(/,?\s*"[^"]*(?:permit|allow|require|prohibit|must|shall|students?|campus|university|policy|rule|regulation)[^"]*"/gi, '');
    
    // Remove quotes that contain residential/housing terms
    cleanedResponse = cleanedResponse.replace(/,?\s*"[^"]*(?:First-year|sophomore|junior|senior|residence|dormitory|hall|building|room|housing)[^"]*"/gi, '');
    
    // Remove any long quoted sentences (likely from documents)
    cleanedResponse = cleanedResponse.replace(/,?\s*"[A-Z][^"]{20,}"/g, '');
    
    // Remove colon-introduced quotes
    cleanedResponse = cleanedResponse.replace(/:?\s*"[^"]*"/gi, '');
    
    // Remove any remaining quotes that start with capital letters (formal text)
    cleanedResponse = cleanedResponse.replace(/"[A-Z][^"]+"/g, '');
    
    // Remove single quotes used for quoting as well
    cleanedResponse = cleanedResponse.replace(/'[A-Z][^']{20,}'/g, '');
    
    // Clean up sentence structure after removing quotes and references
    cleanedResponse = cleanedResponse.replace(/,\s*\./g, '.');
    cleanedResponse = cleanedResponse.replace(/\s+but\s*$/gi, '');
    cleanedResponse = cleanedResponse.replace(/\s+and\s*$/gi, '');
    cleanedResponse = cleanedResponse.replace(/\s+or\s*$/gi, '');
    cleanedResponse = cleanedResponse.replace(/\s*:\s*$/gi, '');
    cleanedResponse = cleanedResponse.replace(/\.\s*,/g, '.');
    cleanedResponse = cleanedResponse.replace(/,\s*,/g, ',');
    
    // Remove phrases that indicate quoting or referencing
    cleanedResponse = cleanedResponse.replace(/(?:states that|indicates that|mentions that|explains that|notes that)\s*/gi, '');
    cleanedResponse = cleanedResponse.replace(/(?:It states|It mentions|It explains|It indicates|It notes)\s*/gi, '');
    
    // Remove leftover partial sentences
    cleanedResponse = cleanedResponse.replace(/^[,.]\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/\s+[,.]$/g, '');
    
    // Clean up extra whitespace that might be left behind
    cleanedResponse = cleanedResponse.replace(/\s+/g, ' ');
    cleanedResponse = cleanedResponse.replace(/\s+\./g, '.');
    cleanedResponse = cleanedResponse.replace(/\s+,/g, ',');
    cleanedResponse = cleanedResponse.trim();
    
    return cleanedResponse;
  }

  private static async getAssistant(assistantId: string): Promise<Assistant | null> {
    return FileStorage.getAssistantById(assistantId);
  }

  private static async getAllDocuments(assistantId: string): Promise<Document[]> {
    return FileStorage.getDocumentsByAssistant(assistantId);
  }

  static async generateTestResponse(assistantId: string, question: string): Promise<{
    answer: string;
    citations: Citation[];
    responseTime: number;
    confidence: number;
  }> {
    const result = await this.generateResponse(assistantId, question);
    
    // Simple confidence calculation
    const confidence = Math.min(0.9, 0.8);
    
    return {
      answer: result.response,
      citations: result.citations,
      responseTime: result.responseTime,
      confidence
    };
  }
}