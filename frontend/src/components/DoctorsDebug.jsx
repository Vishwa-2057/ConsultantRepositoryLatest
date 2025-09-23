import { useState, useEffect } from "react";
import { doctorAPI } from "@/services/api";

const DoctorsDebug = () => {
  const [debugInfo, setDebugInfo] = useState({
    loading: false,
    error: null,
    response: null,
    authToken: null,
    currentUser: null
  });

  useEffect(() => {
    // Get auth info
    const authToken = localStorage.getItem('authToken');
    const authUser = localStorage.getItem('authUser');
    
    setDebugInfo(prev => ({
      ...prev,
      authToken: authToken ? 'Present' : 'Missing',
      currentUser: authUser ? JSON.parse(authUser) : null
    }));
  }, []);

  const testDoctorsAPI = async () => {
    setDebugInfo(prev => ({ ...prev, loading: true, error: null, response: null }));
    
    try {
      console.log('Testing doctors API...');
      const response = await doctorAPI.getAll();
      console.log('API Response:', response);
      
      setDebugInfo(prev => ({
        ...prev,
        loading: false,
        response: response,
        error: null
      }));
    } catch (error) {
      console.error('API Error:', error);
      setDebugInfo(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        response: null
      }));
    }
  };

  return (
    <div className="p-6 space-y-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-bold">Doctors API Debug</h2>
      
      <div className="space-y-2">
        <p><strong>Auth Token:</strong> {debugInfo.authToken}</p>
        <p><strong>Current User:</strong> {debugInfo.currentUser ? debugInfo.currentUser.fullName || debugInfo.currentUser.name : 'None'}</p>
        <p><strong>User Role:</strong> {debugInfo.currentUser?.role || 'None'}</p>
      </div>

      <button 
        onClick={testDoctorsAPI}
        disabled={debugInfo.loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {debugInfo.loading ? 'Testing...' : 'Test Doctors API'}
      </button>

      {debugInfo.error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {debugInfo.error}
        </div>
      )}

      {debugInfo.response && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <strong>Success!</strong>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(debugInfo.response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DoctorsDebug;
