import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId') || 'mge6qt2ige2ux9ctmg';
    const query = searchParams.get('query') || 'refund policies';

    // Get assistant
    const assistant = FileStorage.getAssistantById(assistantId);
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    // Get documents using same logic as AI service
    const documents = FileStorage.searchDocuments(assistantId, query, 3);
    
    // Build context using exact same logic as AIService.buildContext
    let context = '';
    if (documents.length === 0) {
      context = 'No relevant documents found in the knowledge base.';
    } else {
      context = 'Relevant information from the knowledge base:\n\n';
      
      documents.forEach((doc, index) => {
        context += `Document ${index + 1}: ${doc.metadata?.title || doc.filename}\n`;
        
        // Include larger excerpts from content - up to 3000 characters per document
        let excerpt = '';
        if (doc.content) {
          if (doc.content.length <= 3000) {
            excerpt = doc.content;
          } else {
            // Try to find the most relevant sections by looking for common keywords
            const keywords = ['refunds of tuition and residence hall charges', 'tuition refund', 'financial aid', 'refund', 'tuition', 'ship', 'insurance', 'scholarship', 'grant', 'fee', 'payment'];
            let bestExcerpt = '';
            let bestScore = 0;
            
            for (const keyword of keywords) {
              const lowerContent = doc.content.toLowerCase();
              const lowerKeyword = keyword.toLowerCase();
              
              // Find all occurrences of this keyword
              let index = lowerContent.indexOf(lowerKeyword);
              while (index !== -1) {
                // Get 3000 characters around the keyword
                const start = Math.max(0, index - 1000);
                const end = Math.min(doc.content.length, index + 2000);
                const candidateExcerpt = doc.content.substring(start, end);
                
                // Score based on content richness and keyword density
                let score = 0;
                
                // Base score from keyword matches
                keywords.forEach(kw => {
                  const kwMatches = (candidateExcerpt.toLowerCase().match(new RegExp(kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                  score += kwMatches * kw.length;
                });
                
                // Boost score if this looks like actual content (not table of contents)
                const excerptLower = candidateExcerpt.toLowerCase();
                
                // Penalize table of contents patterns
                if (excerptLower.includes('table of contents') || 
                    excerptLower.includes('. . . . . . . .') || 
                    (excerptLower.match(/\d+\s*\n/g)?.length || 0) > 5) {
                  score *= 0.3; // Reduce score significantly
                }
                
                // Boost for policy language
                if (excerptLower.includes('policy') || 
                    excerptLower.includes('students who') || 
                    excerptLower.includes('university') ||
                    excerptLower.includes('procedure') ||
                    excerptLower.includes('process')) {
                  score *= 2;
                }
                
                // Boost for percentage/dates (likely actual policy content)
                if (excerptLower.includes('percentage') || 
                    excerptLower.includes('withdrawal') ||
                    excerptLower.includes('based on') ||
                    excerptLower.includes('provides')) {
                  score *= 3;
                }
                
                if (score > bestScore) {
                  bestScore = score;
                  bestExcerpt = candidateExcerpt;
                }
                
                // Find next occurrence
                index = lowerContent.indexOf(lowerKeyword, index + 1);
              }
            }
            
            // If no keywords found, use beginning of document
            if (!bestExcerpt) {
              bestExcerpt = doc.content.substring(0, 3000);
            }
            
            excerpt = bestExcerpt + (bestExcerpt.length < doc.content.length ? '...' : '');
          }
        } else {
          excerpt = 'No content available';
        }
        
        context += `Content: ${excerpt}\n\n`;
      });
    }

    // Build system prompt using exact same logic as AIService.buildSystemPrompt
    const styleInstructions = {
      formal: 'Respond in a formal, professional manner.',
      friendly: 'Respond in a warm, friendly, and approachable manner.',
      professional: 'Respond in a professional but conversational tone.'
    };

    const systemPrompt = `You are ${assistant.name}, a helpful assistant for student support. 

IMPORTANT: You have access to a comprehensive knowledge base with detailed information about policies, procedures, and guidelines. You MUST use this information to answer student questions whenever possible.

Your role is to help students by providing accurate information based on the knowledge base provided below.

Response Style: ${styleInstructions[assistant.settings.behavior.responseStyle]}

Guidelines:
- ALWAYS use the knowledge base content provided below to answer questions
- Provide specific information from the knowledge base when available  
- Quote relevant sections when appropriate
- Always prioritize accuracy over speed
- If information is in the knowledge base below, provide detailed answers based on that content
- ${assistant.settings.behavior.includeCitations ? 'Always cite your sources when providing information from the knowledge base' : 'Provide helpful information from the knowledge base'}
- Keep responses comprehensive and helpful
- Be empathetic to student concerns
- Only refer to human support if the specific information is truly not available in the knowledge base below

KNOWLEDGE BASE CONTENT:
${context}

Remember: The knowledge base above contains official university information including student handbooks, policies, and procedures. Use this as your primary source for answering student questions about financial aid, housing, academic policies, and other university matters.

Welcome Message: ${assistant.welcomeMessage}`;

    return NextResponse.json({
      query,
      documentsFound: documents.length,
      contextLength: context.length,
      contextPreview: context.substring(0, 1000) + (context.length > 1000 ? '...' : ''),
      systemPromptLength: systemPrompt.length,
      systemPromptPreview: systemPrompt.substring(0, 1000) + (systemPrompt.length > 1000 ? '...' : ''),
      hasRefundContent: context.toLowerCase().includes('university policy for the refund'),
      hasActualContent: !context.includes('Table of Contents') && context.length > 500
    });

  } catch (error) {
    console.error('Debug prompt error:', error);
    return NextResponse.json({ error: 'Failed to debug prompt' }, { status: 500 });
  }
}