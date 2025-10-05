import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';
import { safeSyncFolder, safeStartMonitoring, safeStopMonitoring } from '@/lib/file-monitor-server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const assistant = FileStorage.getAssistantById(params.id);
    
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }
    
    return NextResponse.json(assistant);
  } catch (error) {
    console.error('Error fetching assistant:', error);
    return NextResponse.json({ error: 'Failed to fetch assistant' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, description, welcomeMessage, documentsFolder, settings, isActive } = body;
    
    const assistant = FileStorage.getAssistantById(params.id);
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
    }
    if (description) updateData.description = description;
    if (welcomeMessage) updateData.welcomeMessage = welcomeMessage;
    if (settings) updateData.settings = { ...assistant.settings, ...settings };
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    
    // Handle documents folder change
    if (documentsFolder && documentsFolder !== assistant.documentsFolder) {
      updateData.documentsFolder = documentsFolder;
      
      // Stop monitoring old folder and start monitoring new folder
      safeStopMonitoring(params.id);
      try {
        const processedCount = await safeSyncFolder(params.id, documentsFolder);
        await safeStartMonitoring(params.id, documentsFolder);
        console.log(`Processed ${processedCount} documents from new folder`);
      } catch (monitorError) {
        console.error('Error updating folder monitoring:', monitorError);
      }
    }
    
    const updatedAssistant = FileStorage.updateAssistant(params.id, updateData);
    if (!updatedAssistant) {
      return NextResponse.json({ error: 'Failed to update assistant' }, { status: 500 });
    }
    
    return NextResponse.json(updatedAssistant);
  } catch (error) {
    console.error('Error updating assistant:', error);
    return NextResponse.json({ error: 'Failed to update assistant' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Stop monitoring
    safeStopMonitoring(params.id);
    
    // Delete the assistant (this will also delete associated documents and conversations)
    const deleted = FileStorage.deleteAssistant(params.id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Assistant deleted successfully' });
  } catch (error) {
    console.error('Error deleting assistant:', error);
    return NextResponse.json({ error: 'Failed to delete assistant' }, { status: 500 });
  }
}