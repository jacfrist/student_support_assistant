'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Send, Bot, User, FileText, Loader2 } from 'lucide-react';
import { Assistant, Message, Citation } from '@/lib/types';

export default function ChatPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssistant();
  }, [slug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchAssistant = async () => {
    try {
      const response = await fetch(`/api/assistants?slug=${slug}`);
      if (response.ok) {
        const assistants = await response.json();
        const foundAssistant = assistants.find((a: Assistant) => a.slug === slug);
        if (foundAssistant) {
          setAssistant(foundAssistant);
          // Add welcome message
          const welcomeMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: foundAssistant.welcomeMessage,
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
        }
      }
    } catch (error) {
      console.error('Error fetching assistant:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || !assistant) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch(`/api/assistants/${assistant._id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId,
          conversationId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversationId);
        setMessages(prev => [...prev, data.message]);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!assistant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        backgroundColor: assistant.settings.theme.primaryColor + '10',
      }}
    >
      {/* Header */}
      <div 
        className="text-white p-4 shadow-sm"
        style={{ backgroundColor: assistant.settings.theme.primaryColor }}
      >
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center">
            <Bot className="h-8 w-8 mr-3" />
            <div>
              <h1 className="text-xl font-semibold">{assistant.name}</h1>
              <p className="text-white/80 text-sm">{assistant.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto max-w-4xl h-full flex flex-col">
          <div 
            className="flex-1 overflow-y-auto chat-messages p-4 space-y-4"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-gray-500' 
                          : 'text-white'
                      }`}
                      style={{ 
                        backgroundColor: message.role === 'assistant' 
                          ? assistant.settings.theme.primaryColor 
                          : undefined 
                      }}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className={`rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-gray-500 text-white'
                      : 'bg-white text-gray-900 shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Sources:</p>
                        <div className="space-y-1">
                          {message.citations.map((citation, index) => (
                            <div key={index} className="text-xs text-gray-600">
                              <div className="flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                <span className="font-medium">{citation.filename}</span>
                              </div>
                              <p className="ml-4 italic">"{citation.excerpt}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex mr-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: assistant.settings.theme.primaryColor }}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    <span className="text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim()}
              className="px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: assistant.settings.theme.primaryColor }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}