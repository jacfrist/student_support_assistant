import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';
import { Assistant } from '@/lib/types';
import { safeSyncFolder, safeStartMonitoring } from '@/lib/file-monitor-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const slug = searchParams.get('slug');
    
    let assistants: Assistant[];
    
    if (slug) {
      // Get specific assistant by slug
      const assistant = FileStorage.getAssistantBySlug(slug);
      assistants = assistant ? [assistant] : [];
    } else if (organizationId) {
      // Get assistants by organizationId
      const allAssistants = FileStorage.getAllAssistants();
      assistants = allAssistants.filter(a => a.organizationId === organizationId);
    } else {
      // Get all assistants
      assistants = FileStorage.getAllAssistants();
    }
    
    // Add caching headers for performance
    const response = NextResponse.json(assistants);
    
    // Cache for 5 minutes for GET requests with organizationId
    if (organizationId && !slug) {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    }
    // Cache individual assistant lookups for 10 minutes
    else if (slug) {
      response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching assistants:', error);
    return NextResponse.json({ error: 'Failed to fetch assistants' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, welcomeMessage, organizationId, createdBy, documentsFolder, settings } = body;
    
    if (!name || !description || !organizationId || !documentsFolder) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
    
    // Check if slug already exists
    const existingAssistant = FileStorage.getAssistantBySlug(slug);
    if (existingAssistant) {
      return NextResponse.json({ error: 'Assistant with this name already exists' }, { status: 400 });
    }
    
    const assistant: Omit<Assistant, '_id'> = {
      name,
      slug,
      description,
      welcomeMessage,
      organizationId,
      createdBy,
      documentsFolder,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        theme: {
          primaryColor: '#2563eb',
          ...settings?.theme
        },
        behavior: {
          responseStyle: 'professional',
          maxResponseLength: 500,
          includeCitations: true,
          ...settings?.behavior
        }
      }
    };
    
    const createdAssistant = FileStorage.createAssistant(assistant);
    const assistantId = createdAssistant._id;
    
    // Start monitoring the documents folder (optional - don't fail if it doesn't work)
    let initialDocumentsProcessed = false;
    let processedCount = 0;
    
    try {
      if (documentsFolder && documentsFolder.trim()) {
        processedCount = (await safeSyncFolder(assistantId, documentsFolder)) || 0;
        await safeStartMonitoring(assistantId, documentsFolder);
        
        console.log(`Processed ${processedCount} initial documents for assistant ${assistantId}`);
        initialDocumentsProcessed = processedCount > 0;
      }
    } catch (monitorError) {
      console.error('Error starting folder monitoring:', monitorError);
      // Don't fail the assistant creation if monitoring fails - just log the error
      console.error('Full error details:', monitorError);
    }
    
    return NextResponse.json({ 
      ...createdAssistant,
      initialDocumentsProcessed,
      processedDocuments: processedCount
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating assistant:', error);
    return NextResponse.json({ error: 'Failed to create assistant' }, { status: 500 });
  }
}