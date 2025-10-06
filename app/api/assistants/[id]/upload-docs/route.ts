import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';
import { FileStorage } from '@/lib/file-storage';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`=== PRE-UPLOADING DOCUMENTS FOR ASSISTANT ${params.id} ===`);
    
    // Get assistant info
    const assistant = FileStorage.getAssistantById(params.id);
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    // Get all documents for this assistant
    const documents = FileStorage.getDocumentsByAssistant(params.id);
    console.log(`Found ${documents.length} documents for ${assistant.name}`);

    if (documents.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No documents to upload',
        assistant: assistant.name 
      });
    }

    // Upload documents to Amplify
    const uploadResults = [];
    for (const doc of documents) {
      console.log(`Uploading: ${doc.filename}`);
      
      try {
        const fileId = await (AIService as any).uploadDocumentToAmplify(doc);
        uploadResults.push({
          filename: doc.filename,
          success: !!fileId,
          fileId: fileId,
          size: doc.content.length
        });

        if (fileId) {
          // Store the file ID for future use
          await (AIService as any).storeAmplifyFileId(doc, fileId);
        }
      } catch (error) {
        console.error(`Failed to upload ${doc.filename}:`, error);
        uploadResults.push({
          filename: doc.filename,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          size: doc.content.length
        });
      }
    }

    const successCount = uploadResults.filter(r => r.success).length;
    const totalCount = uploadResults.length;

    console.log(`Upload complete: ${successCount}/${totalCount} successful`);

    return NextResponse.json({
      success: successCount > 0,
      message: `Uploaded ${successCount}/${totalCount} documents for ${assistant.name}`,
      assistant: assistant.name,
      results: uploadResults,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload documents', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}