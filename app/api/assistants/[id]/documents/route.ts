import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db('student-support-assistant');
    
    // Verify assistant exists
    const assistant = await db.collection('assistants').findOne({ _id: new ObjectId(params.id) });
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }
    
    // Get documents for this assistant
    const documents = await db.collection('documents')
      .find({ assistantId: params.id })
      .sort({ lastModified: -1 })
      .toArray();
    
    return NextResponse.json(documents);
    
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}