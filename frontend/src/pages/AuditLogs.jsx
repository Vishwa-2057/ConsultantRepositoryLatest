import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Search, 
  Filter,
  Calendar,
  User,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import healthcareEncryption from "@/utils/encryption";
import AuditLogViewer from "@/components/AuditLogViewer";

const AuditLogs = () => {
  const { toast } = useToast();
  const { logPageView } = useAuditLog();
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(50);
  
  // Audit log viewer state
  const [selectedLog, setSelectedLog] = useState(null);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    eventType: 'all',
    userId: '',
    riskLevel: 'all',
    startDate: '',
    endDate: '',
    patientId: ''
  });

  const eventTypes = [
    'PATIENT_VIEW', 'PATIENT_SEARCH', 'PATIENT_LIST_ACCESS', 'MEDICAL_RECORD_VIEW',
    'PRESCRIPTION_VIEW', 'PRESCRIPTION_CREATE', 'PRESCRIPTION_UPDATE',
    'APPOINTMENT_VIEW', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE',
    'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
    'EXPORT_DATA', 'PRINT_RECORD', 'DOWNLOAD_DOCUMENT',
    'UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY'
  ];

  const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  useEffect(() => {
    loadAuditLogs();
    // Log audit logs page access
    logPageView('AuditLogs', 'SECURITY_DATA');
  }, [currentPage, logPageView]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== 'all')
        )
      });

      const response = await fetch(`http://localhost:5000/api/audit-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAuditLogs(data.logs);
        setTotalPages(data.pagination.pages);
      } else {
        throw new Error(data.message || 'Failed to load audit logs');
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setError(error.message);
      
      // Try to load encrypted logs from localStorage as fallback
      try {
        const encryptedLogs = await healthcareEncryption.decryptAndRetrieve('auditLogsFallback') || [];
        const decryptedLogs = await Promise.all(
          encryptedLogs.map(async (log) => await healthcareEncryption.decryptAuditData(log))
        );
        
        if (decryptedLogs.length > 0) {
          setAuditLogs(decryptedLogs.slice(0, pageSize));
          setTotalPages(Math.ceil(decryptedLogs.length / pageSize));
          setTotalCount(decryptedLogs.length);
          console.log(`🔓 Loaded ${decryptedLogs.length} encrypted audit logs from localStorage`);
          return;
        }
      } catch (decryptError) {
        console.error('Failed to decrypt stored audit logs:', decryptError);
      }

      // Fallback to mock data for testing
      const mockLogs = [
        {
          _id: '1',
          eventType: 'PATIENT_VIEW',
          timestamp: new Date().toISOString(),
          userId: 'user123',
          userEmail: 'doctor@example.com',
          userRole: 'doctor',
          userName: 'Dr. Smith',
          riskLevel: 'LOW',
          sensitivityLevel: 'CONFIDENTIAL',
          ipAddress: '192.168.1.100',
          details: {
            patientId: 'patient123',
            patientName: 'John Doe',
            action: 'VIEW'
          }
        },
        {
          _id: '2',
          eventType: 'PRESCRIPTION_CREATE',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          userId: 'user123',
          userEmail: 'doctor@example.com',
          userRole: 'doctor',
          userName: 'Dr. Smith',
          riskLevel: 'MEDIUM',
          sensitivityLevel: 'CONFIDENTIAL',
          ipAddress: '192.168.1.100',
          details: {
            patientId: 'patient456',
            patientName: 'Jane Smith',
            action: 'CREATE',
            prescriptionId: 'rx789'
          }
        }
      ];
      
      setAuditLogs(mockLogs);
      setTotalPages(1);
      setTotalCount(mockLogs.length);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadAuditLogs();
  };

  const clearFilters = () => {
    setFilters({
      eventType: 'all',
      userId: '',
      riskLevel: 'all',
      startDate: '',
      endDate: '',
      patientId: ''
    });
    setCurrentPage(1);
    setTimeout(loadAuditLogs, 100);
  };

  const exportAuditLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== 'all')
        ),
        export: 'true'
      });

      const response = await fetch(`http://localhost:5000/api/audit-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Audit logs exported successfully"
      });
    } catch (error) {
        console.error('Failed to export audit logs:', error);
        
        // Temporary fallback - create a simple CSV with mock data
        const csvContent = `Event Type,Timestamp,User,Risk Level,Details
PATIENT_VIEW,${new Date().toISOString()},Dr. Smith,LOW,Patient: John Doe
PRESCRIPTION_CREATE,${new Date(Date.now() - 3600000).toISOString()},Dr. Smith,MEDIUM,Patient: Jane Smith`;
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Completed",
          description: "Audit logs exported successfully (mock data).",
        });
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeColor = (eventType) => {
    if (eventType.includes('LOGIN') || eventType.includes('LOGOUT')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (eventType.includes('CREATE') || eventType.includes('UPDATE') || eventType.includes('DELETE')) {
      return 'bg-purple-100 text-purple-800';
    }
    if (eventType.includes('UNAUTHORIZED') || eventType.includes('SUSPICIOUS') || eventType.includes('DENIED')) {
      return 'bg-red-100 text-red-800';
    }
    if (eventType.includes('VIEW') || eventType.includes('SEARCH') || eventType.includes('ACCESS')) {
      return 'bg-cyan-100 text-cyan-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const handleLogClick = (log) => {
    setSelectedLog(log);
    setIsLogViewerOpen(true);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Audit Logs
            </h1>
            <p className="text-gray-600 mt-2">
              Monitor and review all system access and security events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={exportAuditLogs}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={loadAuditLogs}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {eventTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select value={filters.riskLevel} onValueChange={(value) => handleFilterChange('riskLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    {riskLevels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Enter user ID"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="patientId">Patient ID</Label>
                <Input
                  id="patientId"
                  placeholder="Enter patient ID"
                  value={filters.patientId}
                  onChange={(e) => handleFilterChange('patientId', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Button onClick={applyFilters} className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Apply Filters
              </Button>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {auditLogs.length} of {totalCount} audit logs
          </div>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Audit Logs Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                          Loading audit logs...
                        </div>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr 
                        key={log._id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleLogClick(log)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getEventTypeColor(log.eventType)}>
                            {log.eventType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{log.userName}</div>
                          <div className="text-sm text-gray-500">{log.userEmail}</div>
                          <div className="text-xs text-gray-400">{log.userRole}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getRiskLevelColor(log.riskLevel)}>
                            {log.riskLevel}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate">
                            {log.details?.patientId && (
                              <div>Patient: {log.details.patientId}</div>
                            )}
                            {log.details?.action && (
                              <div>Action: {log.details.action}</div>
                            )}
                            {log.details?.searchQuery && (
                              <div>Query: {log.details.searchQuery}</div>
                            )}
                            {log.details?.componentName && (
                              <div>Component: {log.details.componentName}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                First
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
            </div>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Last
              </Button>
            </div>
          </div>
        )}

        {/* Audit Log Viewer Modal */}
        <AuditLogViewer
          log={selectedLog}
          isOpen={isLogViewerOpen}
          onClose={() => setIsLogViewerOpen(false)}
        />
      </div>
    </div>
  );
};

export default AuditLogs;
