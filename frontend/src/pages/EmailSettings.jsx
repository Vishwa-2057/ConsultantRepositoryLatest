import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { emailConfigAPI } from '@/services/api';
import { Mail, Settings, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const EmailSettings = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingConfig, setEditingConfig] = useState(null);
  const [newConfig, setNewConfig] = useState({
    email: '',
    password: '',
    service: 'gmail',
    displayName: '',
    isActive: true,
    isDefault: false
  });

  // Get current user (you might need to adjust this based on your auth system)
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  const doctorId = currentUser.id;

  useEffect(() => {
    if (doctorId) {
      loadConfigs();
    }
  }, [doctorId]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await emailConfigAPI.getAll(doctorId);
      setConfigs(response.data || []);
    } catch (err) {
      setError('Failed to load email configurations');
      console.error('Error loading configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (configId = null) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const configData = {
        doctorId,
        ...newConfig
      };

      let response;
      if (configId) {
        response = await emailConfigAPI.update(configId, configData);
      } else {
        response = await emailConfigAPI.create(configData);
      }

      setSuccess('Email configuration saved successfully!');
      setEditingConfig(null);
      setNewConfig({
        email: '',
        password: '',
        service: 'gmail',
        displayName: '',
        isActive: true,
        isDefault: false
      });
      loadConfigs();
    } catch (err) {
      setError(err.message || 'Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (configId) => {
    try {
      setTesting(configId);
      setError('');
      const response = await emailConfigAPI.test(configId);
      
      if (response.success) {
        setSuccess('Email configuration test successful!');
      } else {
        setError(`Test failed: ${response.message}`);
      }
    } catch (err) {
      setError(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  const handleSetDefault = async (configId) => {
    try {
      setError('');
      await emailConfigAPI.setDefault(configId);
      setSuccess('Default email configuration updated!');
      loadConfigs();
    } catch (err) {
      setError(err.message || 'Failed to set default configuration');
    }
  };

  const handleDelete = async (configId) => {
    if (!confirm('Are you sure you want to delete this email configuration?')) {
      return;
    }

    try {
      setError('');
      await emailConfigAPI.delete(configId);
      setSuccess('Email configuration deleted!');
      loadConfigs();
    } catch (err) {
      setError(err.message || 'Failed to delete configuration');
    }
  };

  const startEditing = (config) => {
    setEditingConfig(config._id);
    setNewConfig({
      email: config.email,
      password: config.password,
      service: config.service,
      displayName: config.displayName,
      isActive: config.isActive,
      isDefault: config.isDefault
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading email configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Email Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Configure your email settings for sending OTP and notifications
          </p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Add New Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {editingConfig ? 'Edit Email Configuration' : 'Add New Email Configuration'}
            </CardTitle>
            <CardDescription>
              {editingConfig ? 'Update your email settings' : 'Set up a new email configuration for sending OTPs and notifications'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newConfig.email}
                  onChange={(e) => setNewConfig({ ...newConfig, email: e.target.value })}
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password/API Key</Label>
                <Input
                  id="password"
                  type="password"
                  value={newConfig.password}
                  onChange={(e) => setNewConfig({ ...newConfig, password: e.target.value })}
                  placeholder="App password or API key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service">Email Service</Label>
                <Select value={newConfig.service} onValueChange={(value) => setNewConfig({ ...newConfig, service: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="yahoo">Yahoo</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="ses">AWS SES</SelectItem>
                    <SelectItem value="smtp">SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={newConfig.displayName}
                  onChange={(e) => setNewConfig({ ...newConfig, displayName: e.target.value })}
                  placeholder="Dr. Your Name"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newConfig.isActive}
                  onCheckedChange={(checked) => setNewConfig({ ...newConfig, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={newConfig.isDefault}
                  onCheckedChange={(checked) => setNewConfig({ ...newConfig, isDefault: checked })}
                />
                <Label htmlFor="isDefault">Default</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleSave(editingConfig)}
                disabled={saving || !newConfig.email || !newConfig.password}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {saving ? 'Saving...' : editingConfig ? 'Update' : 'Save'}
              </Button>
              {editingConfig && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingConfig(null);
                    setNewConfig({
                      email: '',
                      password: '',
                      service: 'gmail',
                      displayName: '',
                      isActive: true,
                      isDefault: false
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Existing Configurations */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Email Configurations</h2>
          
          {configs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No email configurations found. Add one above to get started.</p>
              </CardContent>
            </Card>
          ) : (
            configs.map((config) => (
              <Card key={config._id} className={config.isActive ? 'border-green-200' : 'border-gray-200'}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{config.displayName}</h3>
                        {config.isDefault && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Default</span>
                        )}
                        {config.isActive ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Email: {config.email}</p>
                      <p className="text-sm text-gray-600">Service: {config.service}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(config._id)}
                        disabled={testing === config._id}
                      >
                        {testing === config._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(config)}
                      >
                        Edit
                      </Button>
                      {!config.isDefault && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefault(config._id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(config._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;
