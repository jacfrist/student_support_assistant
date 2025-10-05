import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/file-storage';
import { Document } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify assistant exists
    const assistant = FileStorage.getAssistantById(params.id);
    if (!assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    // Process documents from the assistant's documents folder
    const documentsFolder = assistant.documentsFolder;
    const fullFolderPath = path.join(process.cwd(), documentsFolder.startsWith('/') ? documentsFolder.substring(1) : documentsFolder);
    
    console.log('Processing documents from:', fullFolderPath);

    if (!fs.existsSync(fullFolderPath)) {
      return NextResponse.json({ error: `Documents folder not found: ${documentsFolder}` }, { status: 404 });
    }

    const files = fs.readdirSync(fullFolderPath);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      return NextResponse.json({ error: 'No PDF files found in documents folder' }, { status: 404 });
    }

    const processedDocuments: Document[] = [];

    for (const pdfFile of pdfFiles) {
      const filePath = path.join(fullFolderPath, pdfFile);
      
      try {
        // Check if document already exists
        const existingDocuments = FileStorage.getDocumentsByAssistant(params.id);
        const existingDoc = existingDocuments.find(doc => doc.filename === pdfFile);
        
        if (existingDoc) {
          console.log(`Document ${pdfFile} already processed, skipping`);
          processedDocuments.push(existingDoc);
          continue;
        }

        console.log(`Processing PDF: ${pdfFile}`);
        
        // Read and parse PDF
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        
        // Get file stats
        const fileStats = fs.statSync(filePath);
        
        // Create document record
        const documentData: Omit<Document, '_id'> = {
          assistantId: params.id,
          filename: pdfFile,
          originalFilename: pdfFile,
          filePath: filePath,
          fileSize: fileStats.size,
          mimeType: 'application/pdf',
          content: pdfData.text,
          metadata: {
            title: pdfFile.replace('.pdf', '').replace(/[-_]/g, ' '),
            author: pdfData.info?.Author || 'Unknown',
            subject: pdfData.info?.Subject || '',
            keywords: pdfData.info?.Keywords ? pdfData.info.Keywords.split(',').map(k => k.trim()) : []
          },
          processed: true,
          processedAt: new Date(),
          lastModified: fileStats.mtime,
          checksum: generateChecksum(pdfBuffer)
        };

        const createdDocument = FileStorage.createDocument(documentData);
        processedDocuments.push(createdDocument);
        
        console.log(`Successfully processed: ${pdfFile} (${pdfData.text.length} characters)`);

      } catch (fileError) {
        console.error(`Error processing ${pdfFile}:`, fileError);
        // Continue processing other files
      }
    }

    return NextResponse.json({
      message: `Processed ${processedDocuments.length} documents`,
      documents: processedDocuments
    });

  } catch (error) {
    console.error('Error processing documents:', error);
    return NextResponse.json({ error: 'Failed to process documents' }, { status: 500 });
  }
}

function generateChecksum(buffer: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(buffer).digest('hex');
}