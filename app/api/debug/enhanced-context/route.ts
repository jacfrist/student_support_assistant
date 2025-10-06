import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';
import { AIService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { query, assistantId } = await request.json();
    
    if (!query || !assistantId) {
      return NextResponse.json({ error: 'Missing query or assistantId' }, { status: 400 });
    }
    
    // Get documents
    const documents = FileStorage.getDocumentsByAssistant(assistantId);
    
    if (documents.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 });
    }
    
    // Test the enhanced context building
    const enhancedContext = await (AIService as any).buildEnhancedContext(documents, query);
    
    return NextResponse.json({
      query,
      documentsCount: documents.length,
      contextLength: enhancedContext.length,
      contextPreview: enhancedContext.substring(0, 1000) + '...',
      fullContext: enhancedContext // Full context for debugging
    });
    
  } catch (error) {
    console.error('Enhanced context test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}