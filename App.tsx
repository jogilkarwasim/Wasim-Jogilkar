import React, { useState } from 'react';
import StoryReader from './components/StoryReader';
import Chatbot from './components/Chatbot';
import Button from './components/Button';

type AppView = 'menu' | 'story' | 'chat';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('menu');

  const renderView = () => {
    switch (currentView) {
      case 'story':
        return <StoryReader onBackToMenu={() => setCurrentView('menu')} />;
      case 'chat':
        return <Chatbot onBackToMenu={() => setCurrentView('menu')} />;
      case 'menu':
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-white rounded-xl shadow-lg w-full max-w-md">
            <h1 className="text-4xl font-extrabold text-purple-800 mb-8 text-center">
              Kid's AI Story & Chat
            </h1>
            <div className="flex flex-col space-y-4 w-full">
              <Button onClick={() => setCurrentView('story')} variant="primary" size="lg">
                📖 Read a Story
              </Button>
              <Button onClick={() => setCurrentView('chat')} variant="secondary" size="lg">
                💬 Ask Gemini!
              </Button>
            </div>
            <p className="mt-8 text-gray-600 text-sm text-center">
              Powered by Google Gemini
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      {renderView()}
    </div>
  );
};

export default App;
