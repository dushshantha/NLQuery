import React from 'react';
import Chat from './components/Chat';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            NLQuery
            <span className="text-sm ml-2 text-gray-500">
              Natural Language SQL Interface
            </span>
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Chat />
      </main>
    </div>
  );
};

export default App;

