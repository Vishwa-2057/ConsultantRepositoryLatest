import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { patientAPI, appointmentAPI } from '@/services/api';
import { config } from '@/config/env';

const APITest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testAPI = async (apiName, apiFunction) => {
    setLoading(true);
    try {
      const result = await apiFunction();
      setTestResults(prev => ({
        ...prev,
        [apiName]: { success: true, data: result }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [apiName]: { success: false, error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    
    // Test patient API
    try {
      const patientResult = await patientAPI.getAll();
      setTestResults(prev => ({
        ...prev,
        'Patient API': { success: true, data: patientResult }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        'Patient API': { success: false, error: error.message }
      }));
    }

    // Test appointment API
    try {
      const appointmentResult = await appointmentAPI.getAll();
      setTestResults(prev => ({
        ...prev,
        'Appointment API': { success: true, data: appointmentResult }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        'Appointment API': { success: false, error: error.message }
      }));
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? 'Testing...' : 'Test All APIs'}
          </Button>
          <Button 
            onClick={() => testAPI('Patient API', () => patientAPI.getAll())}
            disabled={loading}
            variant="outline"
          >
            Test Patient API
          </Button>
          <Button 
            onClick={() => testAPI('Appointment API', () => appointmentAPI.getAll())}
            disabled={loading}
            variant="outline"
          >
            Test Appointment API
          </Button>
        </div>

        <div className="space-y-3">
          {Object.entries(testResults).map(([apiName, result]) => (
            <div key={apiName} className="p-3 border rounded-lg">
              <h3 className="font-semibold mb-2">{apiName}</h3>
              {result.success ? (
                <div className="text-green-600">
                  ✅ Success: {JSON.stringify(result.data, null, 2)}
                </div>
              ) : (
                <div className="text-red-600">
                  ❌ Error: {result.error}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>API Base URL:</strong> {config.API_BASE_URL}</p>
          <p><strong>Backend URL:</strong> {config.NODE_ENV === 'production' ? 'https://consultantrepository.onrender.com' : 'http://localhost:5000'}</p>
          <p><strong>Frontend URL:</strong> {config.NODE_ENV === 'production' ? 'https://spontaneous-cheesecake-d2f6e1.netlify.app' : 'http://localhost:8080'}</p>
          <p><strong>Environment:</strong> {config.NODE_ENV}</p>
          <p className="mt-2 text-orange-600">
            <strong>Note:</strong> Make sure your backend server is running before testing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default APITest;
