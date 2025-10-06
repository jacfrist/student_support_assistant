import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId') || 'mge6qt2ige2ux9ctmg';
    const searchTerm = searchParams.get('term') || 'refund';

    // Get all documents for the assistant
    const documents = FileStorage.getDocumentsByAssistant(assistantId);
    
    if (documents.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 });
    }

    const results = [];
    
    for (const doc of documents) {
      if (!doc.content) continue;
      
      const content = doc.content.toLowerCase();
      const term = searchTerm.toLowerCase();
      const matches = [];
      
      let index = content.indexOf(term);
      while (index !== -1) {
        // Get context around the match (200 chars before and after)
        const start = Math.max(0, index - 200);
        const end = Math.min(content.length, index + term.length + 200);
        const context = doc.content.substring(start, end);
        
        matches.push({
          position: index,
          context: context.trim()
        });
        
        // Find next occurrence
        index = content.indexOf(term, index + 1);
        
        // Limit to 10 matches per document
        if (matches.length >= 10) break;
      }
      
      if (matches.length > 0) {
        results.push({
          filename: doc.filename,
          contentLength: doc.content.length,
          matchCount: matches.length,
          matches: matches
        });
      }
    }

    return NextResponse.json({
      searchTerm,
      documentsSearched: documents.length,
      documentsWithMatches: results.length,
      totalMatches: results.reduce((sum, doc) => sum + doc.matchCount, 0),
      results
    });

  } catch (error) {
    console.error('Debug search error:', error);
    return NextResponse.json({ error: 'Failed to search documents' }, { status: 500 });
  }
}