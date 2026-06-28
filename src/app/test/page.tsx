"use client";

import { useState } from "react";
import { toast } from "sonner"; // Assuming sonner is installed based on standard modern Next.js setups

export default function MongoDBTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testDatabaseConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Call our new test API route
      const response = await fetch("/api/test-db", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success("Successfully saved to MongoDB!");
      } else {
        setResult({ error: data.error || "Unknown error occurred" });
        toast.error("Database connection failed!");
      }
    } catch (error: any) {
      setResult({ error: error.message });
      toast.error("Failed to make request to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MongoDB Test Panel</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Click the button below to connect to your aaPanel MongoDB and insert a test record.
          </p>
        </div>

        <button
          onClick={testDatabaseConnection}
          disabled={isLoading}
          className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-70"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting to Database...
            </span>
          ) : (
            "Run MongoDB Connection Test"
          )}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-lg text-sm overflow-x-auto ${result.error ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-green-50 text-green-800 border border-green-100'}`}>
            <h3 className="font-semibold mb-2">Response:</h3>
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
