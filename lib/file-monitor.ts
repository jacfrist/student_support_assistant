import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { DocumentProcessor } from './document-processor';
import { FileStorage } from './file-storage';
import { Document } from './types';

export class FileMonitor {
  private watchers = new Map<string, chokidar.FSWatcher>();

  async startMonitoring(assistantId: string, folderPath: string) {
    if (this.watchers.has(assistantId)) {
      this.stopMonitoring(assistantId);
    }

    const watcher = chokidar.watch(folderPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false
    });

    watcher
      .on('add', async (filePath) => {
        await this.handleFileChange(assistantId, filePath, 'added');
      })
      .on('change', async (filePath) => {
        await this.handleFileChange(assistantId, filePath, 'changed');
      })
      .on('unlink', async (filePath) => {
        await this.handleFileRemoval(assistantId, filePath);
      });

    this.watchers.set(assistantId, watcher);
    console.log(`Started monitoring folder: ${folderPath} for assistant: ${assistantId}`);
  }

  stopMonitoring(assistantId: string) {
    const watcher = this.watchers.get(assistantId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(assistantId);
      console.log(`Stopped monitoring for assistant: ${assistantId}`);
    }
  }

  private async handleFileChange(assistantId: string, filePath: string, changeType: 'added' | 'changed') {
    try {
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) return;
      
      // Check if file is supported
      const mimeType = this.getMimeType(filePath);
      if (!DocumentProcessor.isFileSupported(mimeType)) {
        console.log(`Skipping unsupported file: ${filePath}`);
        return;
      }

      // Generate checksum to detect actual changes
      const checksum = DocumentProcessor.generateChecksum(filePath);
      
      // Check if document already exists and hasn't changed
      const existingDocs = FileStorage.getDocumentsByAssistant(assistantId);
      const existingDoc = existingDocs.find(doc => doc.filePath === filePath && doc.checksum === checksum);

      if (existingDoc && changeType === 'changed') {
        console.log(`No actual changes detected for: ${filePath}`);
        return;
      }

      // Extract content and metadata
      const content = await DocumentProcessor.extractText(filePath, mimeType);
      const metadata = DocumentProcessor.extractMetadata(filePath, content);
      
      const documentData: Partial<Document> = {
        assistantId,
        filename: path.basename(filePath),
        originalFilename: path.basename(filePath),
        filePath,
        fileSize: stats.size,
        mimeType,
        content,
        metadata,
        processed: true,
        processedAt: new Date(),
        lastModified: stats.mtime,
        checksum
      };

      // Upsert document using file storage
      FileStorage.updateDocument(assistantId, filePath, documentData);

      // Update assistant's last sync time  
      FileStorage.updateAssistant(assistantId, { lastDocumentSync: new Date() });

      console.log(`Processed ${changeType} file: ${filePath}`);
      
      // Send email notification if configured
      await this.sendUpdateNotification(assistantId, filePath, changeType);
      
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }

  private async handleFileRemoval(assistantId: string, filePath: string) {
    try {
      FileStorage.deleteDocument(assistantId, filePath);

      console.log(`Removed document: ${filePath}`);
      await this.sendUpdateNotification(assistantId, filePath, 'removed');
      
    } catch (error) {
      console.error(`Error removing document ${filePath}:`, error);
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.md': 'text/markdown'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private async sendUpdateNotification(assistantId: string, filePath: string, action: string) {
    // This would integrate with your email service
    // Implementation depends on your email provider (nodemailer, SendGrid, etc.)
    console.log(`Notification: ${action} - ${filePath} for assistant ${assistantId}`);
  }

  async syncFolder(assistantId: string, folderPath: string): Promise<number> {
    let processedCount = 0;
    
    try {
      if (!fs.existsSync(folderPath)) {
        throw new Error(`Folder does not exist: ${folderPath}`);
      }

      const files = await this.getAllFiles(folderPath);
      
      for (const filePath of files) {
        try {
          await this.handleFileChange(assistantId, filePath, 'added');
          processedCount++;
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
        }
      }

      return processedCount;
    } catch (error) {
      console.error(`Error syncing folder ${folderPath}:`, error);
      throw error;
    }
  }

  private async getAllFiles(folderPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const items = fs.readdirSync(folderPath);
    
    for (const item of items) {
      const itemPath = path.join(folderPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile()) {
        files.push(itemPath);
      } else if (stats.isDirectory()) {
        const subFiles = await this.getAllFiles(itemPath);
        files.push(...subFiles);
      }
    }
    
    return files;
  }
}

export const fileMonitor = new FileMonitor();