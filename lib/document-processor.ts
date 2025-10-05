import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class DocumentProcessor {
  static async extractText(filePath: string, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractFromPDF(filePath);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromDocx(filePath);
        case 'text/plain':
          return await this.extractFromTxt(filePath);
        case 'text/markdown':
          return await this.extractFromTxt(filePath);
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${filePath}:`, error);
      throw error;
    }
  }

  private static async extractFromPDF(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  private static async extractFromDocx(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private static async extractFromTxt(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  static generateChecksum(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  static extractMetadata(filePath: string, content: string): {
    title?: string;
    keywords?: string[];
  } {
    const filename = path.basename(filePath, path.extname(filePath));
    
    // Try to extract title from first line or filename
    const lines = content.split('\n').filter(line => line.trim());
    const potentialTitle = lines[0]?.trim();
    const title = potentialTitle && potentialTitle.length < 100 
      ? potentialTitle 
      : filename.replace(/[-_]/g, ' ');

    // Extract potential keywords (simple approach)
    const keywords = this.extractKeywords(content);

    return { title, keywords };
  }

  private static extractKeywords(content: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP libraries
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20);

    const wordCounts: { [key: string]: number } = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    return Object.entries(wordCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  static getSupportedMimeTypes(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
  }

  static isFileSupported(mimeType: string): boolean {
    return this.getSupportedMimeTypes().includes(mimeType);
  }
}