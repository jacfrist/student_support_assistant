import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';
import { FileStorage } from '@/lib/file-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TESTING AMPLIFY UPLOAD ===');
    
    // Get the financial aid assistant documents
    const assistantId = 'mge6qt2ige2ux9ctmg';
    const documents = FileStorage.getDocumentsByAssistant(assistantId);
    
    console.log(`Found ${documents.length} documents for assistant ${assistantId}`);
    
    if (documents.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 });
    }
    
    const doc = documents[0];
    console.log(`Testing upload for document: ${doc.filename}`);
    console.log(`Content length: ${doc.content.length} characters`);
    
    // Test the upload method directly with detailed logging
    let uploadResult = null;
    let uploadError = null;
    
    try {
      uploadResult = await (AIService as any).uploadDocumentToAmplify(doc);
    } catch (error) {
      uploadError = error instanceof Error ? error.message : String(error);
      console.error('Upload method threw error:', error);
    }
    
    return NextResponse.json({
      success: !!uploadResult,
      fileId: uploadResult,
      documentName: doc.filename,
      contentLength: doc.content.length,
      uploadError: uploadError,
      lastAmplifyError: (AIService as any).lastUploadError,
      amplifyApiKey: process.env.AMPLIFY_API_KEY ? 'Present (length: ' + process.env.AMPLIFY_API_KEY.length + ')' : 'Missing',
      amplifyAssistantId: process.env.AMPLIFY_ASSISTANT_ID || 'Missing'
    });
    
  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json({ 
      error: 'Upload test failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}