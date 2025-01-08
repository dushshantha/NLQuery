import React, { useState, useRef, useEffect } from 'react';
import QueryResults from './QueryResults';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Create a new conversation when component mounts
    createConversation();
  }, []);

  const createConversation = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/conversations', {
        method: 'POST',
      });
      const data = await response.json();
      setConversationId(data.conversation_id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'development'
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_id: conversationId
        }),
      });

      const data = await response.json();

      const assistantMessage = {
        role: 'assistant',
        content: data.message,
        sql: data.sql,
        results: data.results,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
        error: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={index}
        className={`mb-4 ${isUser ? 'ml-auto' : 'mr-auto'} max-w-[80%]`}
      >
        <div
          className={`p-4 rounded-lg ${
            isUser ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          <div className="text-sm mb-1">
            {isUser ? 'You' : 'Assistant'} - {new Date(message.timestamp).toLocaleTimeString()}
          </div>
          <div className="whitespace-pre-wrap">{message.content}</div>

          {!isUser && message.sql && (
            <div className="mt-2 p-2 bg-gray-800 text-gray-200 rounded">
              <div className="font-mono text-sm overflow-x-auto">
                {message.sql}
              </div>
            </div>
          )}

          {!isUser && message.results && (
            <div className="mt-4">
              <QueryResults results={message.results} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message, index) => renderMessage(message, index))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your data..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded text-white ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;