import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify assistant exists
    const assistant = FileStorage.getAssistantById(params.id);
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }
    
    // Get documents for this assistant
    const documents = FileStorage.getDocumentsByAssistant(params.id);
    
    // Sort by lastModified date (newest first)
    const sortedDocuments = documents.sort((a, b) => {
      const dateA = new Date(a.lastModified || 0).getTime();
      const dateB = new Date(b.lastModified || 0).getTime();
      return dateB - dateA;
    });
    
    return NextResponse.json(sortedDocuments);
    
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}