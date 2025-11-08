import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini } from '../services/geminiService';
import Button from './Button';
import Spinner from './Spinner';
import { ChatMessage } from '../types';

interface ChatbotProps {
  onBackToMenu: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ onBackToMenu }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    setError(null);
    const newUserMessage: ChatMessage = { role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await chatWithGemini(messages, newUserMessage.text);
      if (responseText) {
        setMessages((prev) => [...prev, { role: 'model', text: responseText }]);
      } else {
        setError("Gemini didn't respond. Please try again.");
      }
    } catch (e: any) {
      setError(`Error: ${e.message || 'Failed to get a response from Gemini.'}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-3xl font-extrabold text-purple-700 mb-6 text-center">Ask Gemini!</h2>

      <div className="flex-grow bg-purple-50 p-4 rounded-lg overflow-y-auto mb-4 h-80 min-h-[200px] border-2 border-purple-300">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 italic mt-4">Say hello to Gemini!</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-3 p-3 rounded-lg max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-pink-100 self-end ml-auto text-pink-800'
                  : 'bg-purple-100 self-start mr-auto text-purple-800'
              }`}
            >
              <span className="font-bold mr-2 capitalize">{msg.role}:</span>
              <span>{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {isLoading && <Spinner />}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="flex w-full space-x-2 mb-4">
        <input
          type="text"
          className="flex-grow p-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
          placeholder="Type your question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <Button onClick={handleSendMessage} disabled={isLoading} variant="primary" size="md">
          Send
        </Button>
      </div>
      <Button onClick={onBackToMenu} variant="outline">
        Back to Main Menu
      </Button>
    </div>
  );
};

export default Chatbot;
