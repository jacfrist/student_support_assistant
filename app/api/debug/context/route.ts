import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId') || 'mge6qt2ige2ux9ctmg';
    const query = searchParams.get('query') || 'tuition refund';

    // Get assistant
    const assistant = FileStorage.getAssistantById(assistantId);
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    // Get documents
    const documents = FileStorage.searchDocuments(assistantId, query, 3);
    
    // Build context using the same logic as AIService
    let context = 'Relevant information from the knowledge base:\n\n';
    
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
            const keywordIndex = doc.content.toLowerCase().indexOf(keyword.toLowerCase());
            if (keywordIndex !== -1) {
              // Get 3000 characters around the keyword
              const start = Math.max(0, keywordIndex - 1000);
              const end = Math.min(doc.content.length, keywordIndex + 2000);
              const candidateExcerpt = doc.content.substring(start, end);
              
              // Score based on how many keywords are in this excerpt
              let score = 0;
              keywords.forEach(kw => {
                if (candidateExcerpt.toLowerCase().includes(kw.toLowerCase())) {
                  score += kw.length; // Longer keywords get higher priority
                }
              });
              
              if (score > bestScore) {
                bestScore = score;
                bestExcerpt = candidateExcerpt;
              }
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

    return NextResponse.json({
      assistantName: assistant.name,
      documentsFound: documents.length,
      documents: documents.map(doc => ({
        filename: doc.filename,
        contentLength: doc.content?.length || 0,
        title: doc.metadata?.title,
        preview: doc.content?.substring(0, 200) + '...'
      })),
      contextLength: context.length,
      contextPreview: context.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Debug context error:', error);
    return NextResponse.json({ error: 'Failed to debug context' }, { status: 500 });
  }
}