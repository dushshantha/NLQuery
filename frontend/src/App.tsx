import React, { useState, useRef, useEffect } from 'react';
import { Send, Database, History, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface QueryResult {
  id: string;
  prompt: string;
  query: string;
  result: any[];
  timestamp: string;
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedQuery, setSelectedQuery] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, []);

  // Fetch query history on component mount
  useEffect(() => {
    const fetchQueryHistory = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/chat/history');
        if (!response.ok) throw new Error('Failed to fetch query history');
        const data = await response.json();
        setQueryHistory(data);
      } catch (error) {
        console.error('Error fetching query history:', error);
        // Don't show the error to the user initially as they might not have any history yet
        setQueryHistory([]);
      }
    };

    fetchQueryHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'development'
        },
        body: JSON.stringify({
          message: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process query');
      }

      const data = await response.json();
      
      const newQuery: QueryResult = {
        id: data.id,
        prompt: prompt,
        query: data.sql,
        result: data.results,
        timestamp: new Date().toISOString()
      };

      setQueryHistory(prev => [newQuery, ...prev]);
      setSelectedQuery(null);
      setPrompt('');
      setCurrentPage(1);
    } catch (error) {
      console.error('Error processing query:', error);
      setError('Sorry, there was an error processing your request.');
    } finally {
      setIsLoading(false);
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderQueryResults = (query: QueryResult) => {
    if (!query || !query.result || query.result.length === 0) return null;

    const totalPages = Math.ceil(query.result.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentResults = query.result.slice(startIndex, endIndex);

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Original Prompt */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Original Question</h3>
          <div className="bg-blue-50 rounded-md p-4">
            <p className="text-sm text-blue-900">{query.prompt}</p>
          </div>
        </div>
        
        {/* Generated SQL */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Generated SQL</h3>
          <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto">
            <code className="text-sm text-gray-800">{query.query}</code>
          </pre>
        </div>

        {/* Results Table */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Results</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(query.result[0] || {}).map((header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentResults.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((value, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, query.result.length)}</span> of{' '}
                      <span className="font-medium">{query.result.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            currentPage === i + 1
                              ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">NLQuery</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Query Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                    How can I help you with?
                  </label>
                  <div className="mt-1 relative">
                    <textarea
                      ref={textAreaRef}
                      id="prompt"
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., Show me the top 5 customers by order value"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !prompt.trim()}
                      className="absolute bottom-2 right-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
              {error && (
                <div className="mt-4 p-4 bg-red-50 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Display either selected query or latest query */}
            {selectedQuery ? (
              renderQueryResults(selectedQuery)
            ) : (
              queryHistory.length > 0 && renderQueryResults(queryHistory[0])
            )}
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <History className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900">Query History</h2>
              </div>
              <div className="space-y-4">
                {queryHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No queries yet</p>
                ) : (
                  queryHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedQuery(item)}
                      className={`p-4 rounded-md cursor-pointer transition ${
                        selectedQuery?.id === item.id
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-sm text-blue-600 mb-2">{item.prompt}</div>
                      <pre className="text-sm text-gray-600 overflow-hidden text-ellipsis">
                        {item.query}
                      </pre>
                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;