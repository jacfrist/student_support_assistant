// Server-only document processor wrapper
export const safeExtractText = async (filePath: string, mimeType: string): Promise<string> => {
  if (typeof window === 'undefined') {
    try {
      const { DocumentProcessor } = await import('./document-processor');
      return await DocumentProcessor.extractText(filePath, mimeType);
    } catch (error) {
      console.error('Document processing failed:', error);
      return '';
    }
  }
  return '';
};

export const safeGenerateChecksum = (filePath: string): string => {
  if (typeof window === 'undefined') {
    try {
      const { DocumentProcessor } = require('./document-processor');
      return DocumentProcessor.generateChecksum(filePath);
    } catch (error) {
      console.error('Checksum generation failed:', error);
      return '';
    }
  }
  return '';
};

export const safeExtractMetadata = (filePath: string, content: string) => {
  if (typeof window === 'undefined') {
    try {
      const { DocumentProcessor } = require('./document-processor');
      return DocumentProcessor.extractMetadata(filePath, content);
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      return { title: '', keywords: [] };
    }
  }
  return { title: '', keywords: [] };
};