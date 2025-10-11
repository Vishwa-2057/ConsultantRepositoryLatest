import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Eye, 
  User, 
  Calendar, 
  MapPin, 
  Monitor, 
  Shield,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";

const AuditLogViewer = ({ log, isOpen, onClose }) => {
  if (!log) return null;

  const getRiskLevelIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'MEDIUM': return <Info className="w-4 h-4 text-blue-600" />;
      case 'HIGH': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'CRITICAL': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSensitivityColor = (sensitivityLevel) => {
    switch (sensitivityLevel) {
      case 'PUBLIC': return 'bg-gray-100 text-gray-800';
      case 'INTERNAL': return 'bg-blue-100 text-blue-800';
      case 'CONFIDENTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'RESTRICTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            Audit Log Details
            <Badge className={getRiskLevelColor(log.riskLevel)}>
              {getRiskLevelIcon(log.riskLevel)}
              {log.riskLevel}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Detailed information about this audit event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Event Type</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-sm">
                      {log.eventType}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Timestamp</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatTimestamp(log.timestamp)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Risk Level</label>
                  <div className="mt-1">
                    <Badge className={getRiskLevelColor(log.riskLevel)}>
                      {getRiskLevelIcon(log.riskLevel)}
                      {log.riskLevel}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Sensitivity</label>
                  <div className="mt-1">
                    <Badge className={getSensitivityColor(log.sensitivityLevel)}>
                      {log.sensitivityLevel}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">User Name</label>
                  <div className="mt-1 text-sm text-gray-900">{log.userName}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="mt-1 text-sm text-gray-900">{log.userEmail}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono">{log.userId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <div className="mt-1">
                    <Badge variant="outline">{log.userRole}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session & Technical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Session & Technical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Session ID</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono">{log.sessionId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">IP Address</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono">{log.ipAddress}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">User Agent</label>
                  <div className="mt-1 text-sm text-gray-900 break-all">{log.userAgent}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">URL</label>
                  <div className="mt-1 text-sm text-gray-900 break-all">{log.url}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          {log.details && Object.keys(log.details).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {log.details.patientId && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Patient ID</label>
                      <div className="mt-1 text-sm text-gray-900 font-mono">{log.details.patientId}</div>
                    </div>
                  )}
                  
                  {log.details.patientName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Patient Name</label>
                      <div className="mt-1 text-sm text-gray-900">{log.details.patientName}</div>
                    </div>
                  )}

                  {log.details.action && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Action</label>
                      <div className="mt-1">
                        <Badge variant="outline">{log.details.action}</Badge>
                      </div>
                    </div>
                  )}

                  {log.details.componentName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Component</label>
                      <div className="mt-1 text-sm text-gray-900">{log.details.componentName}</div>
                    </div>
                  )}

                  {log.details.searchQuery && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Search Query</label>
                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                        {log.details.searchQuery}
                      </div>
                    </div>
                  )}

                  {log.details.resultCount !== undefined && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Result Count</label>
                      <div className="mt-1 text-sm text-gray-900">{log.details.resultCount}</div>
                    </div>
                  )}

                  {log.details.dataAccessed && log.details.dataAccessed.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data Accessed</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {log.details.dataAccessed.map((data, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {data}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.details.recordType && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Record Type</label>
                      <div className="mt-1 text-sm text-gray-900">{log.details.recordType}</div>
                    </div>
                  )}

                  {log.details.recordId && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Record ID</label>
                      <div className="mt-1 text-sm text-gray-900 font-mono">{log.details.recordId}</div>
                    </div>
                  )}

                  {log.details.browserInfo && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Browser Information</label>
                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                        {log.details.browserInfo.name} {log.details.browserInfo.version} on {log.details.browserInfo.platform}
                        {log.details.browserInfo.language && ` (${log.details.browserInfo.language})`}
                      </div>
                    </div>
                  )}

                  {log.details.screenResolution && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Screen Resolution</label>
                      <div className="mt-1 text-sm text-gray-900">{log.details.screenResolution}</div>
                    </div>
                  )}

                  {log.details.timezone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Timezone</label>
                      <div className="mt-1 text-sm text-gray-900">{log.details.timezone}</div>
                    </div>
                  )}

                  {log.details.referrer && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Referrer</label>
                      <div className="mt-1 text-sm text-gray-900 break-all">{log.details.referrer}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatTimestamp(log.createdAt || log.timestamp)}
                  </div>
                </div>
                {log.updatedAt && log.updatedAt !== log.createdAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Updated At</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {formatTimestamp(log.updatedAt)}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Log ID</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono">{log._id}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuditLogViewer;
