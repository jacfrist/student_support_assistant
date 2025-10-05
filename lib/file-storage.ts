import fs from 'fs';
import path from 'path';
import { Assistant, Document, Conversation } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ASSISTANTS_FILE = path.join(DATA_DIR, 'assistants.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const DOCUMENTS_FILE = path.join(DATA_DIR, 'documents.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Generic file operations
function readJsonFile<T>(filePath: string, defaultValue: T[] = []): T[] {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, defaultValue);
    return defaultValue as T[];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) || defaultValue;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue as T[];
  }
}

function writeJsonFile<T>(filePath: string, data: T) {
  ensureDataDir();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Assistant operations
export class FileStorage {
  // Assistants
  static getAllAssistants(): Assistant[] {
    return readJsonFile<Assistant>(ASSISTANTS_FILE, []);
  }

  static getAssistantById(id: string): Assistant | null {
    const assistants = this.getAllAssistants();
    return assistants.find(a => a._id === id) || null;
  }

  static getAssistantBySlug(slug: string): Assistant | null {
    const assistants = this.getAllAssistants();
    return assistants.find(a => a.slug === slug) || null;
  }

  static createAssistant(assistantData: Omit<Assistant, '_id'>): Assistant {
    const assistants = this.getAllAssistants();
    const newAssistant: Assistant = {
      ...assistantData,
      _id: generateId(),
    };
    
    assistants.push(newAssistant);
    writeJsonFile(ASSISTANTS_FILE, assistants);
    return newAssistant;
  }

  static updateAssistant(id: string, updates: Partial<Assistant>): Assistant | null {
    const assistants = this.getAllAssistants();
    const index = assistants.findIndex(a => a._id === id);
    
    if (index === -1) return null;
    
    assistants[index] = { ...assistants[index], ...updates, updatedAt: new Date() };
    writeJsonFile(ASSISTANTS_FILE, assistants);
    return assistants[index];
  }

  static deleteAssistant(id: string): boolean {
    const assistants = this.getAllAssistants();
    const filteredAssistants = assistants.filter(a => a._id !== id);
    
    if (filteredAssistants.length === assistants.length) return false;
    
    writeJsonFile(ASSISTANTS_FILE, filteredAssistants);
    
    // Also delete related documents and conversations
    this.deleteDocumentsByAssistant(id);
    this.deleteConversationsByAssistant(id);
    
    return true;
  }

  // Documents
  static getAllDocuments(): Document[] {
    return readJsonFile<Document>(DOCUMENTS_FILE, []);
  }

  static getDocumentsByAssistant(assistantId: string): Document[] {
    const documents = this.getAllDocuments();
    return documents.filter(d => d.assistantId === assistantId);
  }

  static createDocument(documentData: Omit<Document, '_id'>): Document {
    const documents = this.getAllDocuments();
    const newDocument: Document = {
      ...documentData,
      _id: generateId(),
    };
    
    documents.push(newDocument);
    writeJsonFile(DOCUMENTS_FILE, documents);
    return newDocument;
  }

  static updateDocument(assistantId: string, filePath: string, updates: Partial<Document>): Document {
    const documents = this.getAllDocuments();
    const index = documents.findIndex(d => d.assistantId === assistantId && d.filePath === filePath);
    
    if (index === -1) {
      // Create new document if it doesn't exist
      return this.createDocument({ assistantId, filePath, ...updates } as Omit<Document, '_id'>);
    }
    
    documents[index] = { ...documents[index], ...updates };
    writeJsonFile(DOCUMENTS_FILE, documents);
    return documents[index];
  }

  static deleteDocumentsByAssistant(assistantId: string): void {
    const documents = this.getAllDocuments();
    const filteredDocuments = documents.filter(d => d.assistantId !== assistantId);
    writeJsonFile(DOCUMENTS_FILE, filteredDocuments);
  }

  static deleteDocument(assistantId: string, filePath: string): boolean {
    const documents = this.getAllDocuments();
    const filteredDocuments = documents.filter(d => !(d.assistantId === assistantId && d.filePath === filePath));
    
    if (filteredDocuments.length === documents.length) return false;
    
    writeJsonFile(DOCUMENTS_FILE, filteredDocuments);
    return true;
  }

  // Conversations
  static getAllConversations(): Conversation[] {
    return readJsonFile<Conversation>(CONVERSATIONS_FILE, []);
  }

  static getConversationsByAssistant(assistantId: string): Conversation[] {
    const conversations = this.getAllConversations();
    return conversations.filter(c => c.assistantId === assistantId);
  }

  static getConversationById(id: string): Conversation | null {
    const conversations = this.getAllConversations();
    return conversations.find(c => c._id === id) || null;
  }

  static getConversationBySession(assistantId: string, sessionId: string): Conversation | null {
    const conversations = this.getAllConversations();
    return conversations.find(c => c.assistantId === assistantId && c.sessionId === sessionId) || null;
  }

  static createConversation(conversationData: Omit<Conversation, '_id'>): Conversation {
    const conversations = this.getAllConversations();
    const newConversation: Conversation = {
      ...conversationData,
      _id: generateId(),
    };
    
    conversations.push(newConversation);
    writeJsonFile(CONVERSATIONS_FILE, conversations);
    return newConversation;
  }

  static updateConversation(id: string, updates: Partial<Conversation>): Conversation | null {
    const conversations = this.getAllConversations();
    const index = conversations.findIndex(c => c._id === id);
    
    if (index === -1) return null;
    
    conversations[index] = { ...conversations[index], ...updates };
    writeJsonFile(CONVERSATIONS_FILE, conversations);
    return conversations[index];
  }

  static deleteConversationsByAssistant(assistantId: string): void {
    const conversations = this.getAllConversations();
    const filteredConversations = conversations.filter(c => c.assistantId !== assistantId);
    writeJsonFile(CONVERSATIONS_FILE, filteredConversations);
  }

  // Search documents by content
  static searchDocuments(assistantId: string, query: string, limit: number = 5): Document[] {
    const documents = this.getDocumentsByAssistant(assistantId);
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    if (searchTerms.length === 0) return documents.slice(0, limit);
    
    const scoredDocuments = documents.map(doc => {
      let score = 0;
      const content = doc.content?.toLowerCase() || '';
      const title = doc.metadata?.title?.toLowerCase() || '';
      
      searchTerms.forEach(term => {
        // Title matches are worth more
        if (title.includes(term)) score += 3;
        // Content matches
        const contentMatches = (content.match(new RegExp(term, 'g')) || []).length;
        score += contentMatches;
      });
      
      return { document: doc, score };
    });
    
    return scoredDocuments
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.document);
  }
}