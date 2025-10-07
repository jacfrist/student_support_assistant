export interface Assistant {
  _id?: string;
  name: string;
  slug: string;
  description: string;
  welcomeMessage: string;
  organizationId: string;
  createdBy: string;
  documentsFolder: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastDocumentSync?: Date;
  settings: {
    theme: {
      primaryColor: string;
      logoUrl?: string;
    };
    behavior: {
      responseStyle: 'formal' | 'friendly' | 'professional';
      maxResponseLength: number;
      includeCitations: boolean;
    };
  };
}

export interface Document {
  _id?: string;
  assistantId: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  content: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
  processed: boolean;
  processedAt?: Date;
  lastModified: Date;
  checksum: string;
  amplifyFileId?: string; // Store Amplify file ID for uploaded documents
}

export interface Conversation {
  _id?: string;
  assistantId: string;
  sessionId: string;
  messages: Message[];
  startedAt: Date;
  lastMessageAt: Date;
  userFeedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    submittedAt: Date;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Citation[];
  metadata?: {
    responseTime?: number;
    confidence?: number;
  };
}

export interface Citation {
  documentId: string;
  filename: string;
  excerpt: string;
  relevanceScore: number;
}

export interface TestQuestion {
  _id?: string;
  assistantId: string;
  question: string;
  expectedAnswer?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface TestResult {
  _id?: string;
  assistantId: string;
  testQuestionId: string;
  question: string;
  answer: string;
  responseTime: number;
  citations: Citation[];
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  testedAt: Date;
  testedBy: string;
}

export interface Analytics {
  _id?: string;
  assistantId: string;
  date: string; // YYYY-MM-DD format
  metrics: {
    totalConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    userSatisfactionScore: number;
    commonQuestions: Array<{
      question: string;
      frequency: number;
    }>;
    documentUsage: Array<{
      documentId: string;
      filename: string;
      citationCount: number;
    }>;
  };
}

export interface Organization {
  _id?: string;
  name: string;
  domain: string;
  settings: {
    allowedFileTypes: string[];
    maxFileSize: number;
    maxDocuments: number;
    emailNotifications: boolean;
  };
  createdAt: Date;
}

export interface User {
  _id?: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  organizationId: string;
  createdAt: Date;
  lastLoginAt?: Date;
}