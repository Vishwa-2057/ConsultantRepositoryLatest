import React, { useState } from 'react';
import { patientAPI } from '../services/api';

const ConnectionTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      console.log('Testing connection...');
      const result = await patientAPI.getAll(1, 5);
      setTestResult({
        success: true,
        message: 'Connection successful!',
        data: result
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult({
        success: false,
        message: error.message,
        error: error
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">API Connection Test</h2>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>

      {testResult && (
        <div className={`mt-4 p-4 rounded ${
          testResult.success 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <h3 className="font-bold">
            {testResult.success ? '✅ Success' : '❌ Error'}
          </h3>
          <p className="mt-2">{testResult.message}</p>
          
          {testResult.success && testResult.data && (
            <div className="mt-2">
              <p className="text-sm">
                <strong>Patients found:</strong> {testResult.data.patients?.length || 0}
              </p>
              <p className="text-sm">
                <strong>Total:</strong> {testResult.data.total || 0}
              </p>
            </div>
          )}
          
          {!testResult.success && testResult.error && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">
                Error Details
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResult.error, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-bold mb-2">Debug Information:</h4>
        <p><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}</p>
        <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
        <p><strong>Backend URL:</strong> http://localhost:5000</p>
        <p><strong>Frontend URL:</strong> http://localhost:8080</p>
      </div>
    </div>
  );
};

export default ConnectionTest;
