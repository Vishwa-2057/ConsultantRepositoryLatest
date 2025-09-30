import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  Search, 
  LogIn,
  LogOut,
  AlertCircle,
  Shield,
  User,
  Clock,
  Monitor,
  RefreshCw,
  Download,
  Calendar,
  UserPlus,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { activityLogAPI } from "@/services/api";

const ActivityLogsModal = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, activityTypeFilter, currentPage]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await activityLogAPI.getAll({
        page: currentPage,
        limit: 20,
        activityType: activityTypeFilter !== 'all' ? activityTypeFilter : undefined,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      });
      
      setLogs(response.logs || []);
      
      if (!response.logs || response.logs.length === 0) {
        setError("No activity logs found for the selected criteria.");
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
      setError(`Failed to load activity logs: ${error.message}`);
      setLogs([]);
      toast({
        title: "Error",
        description: "Failed to load activity logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'login':
        return <LogIn className="w-4 h-4 text-green-600" />;
      case 'logout':
        return <LogOut className="w-4 h-4 text-blue-600" />;
      case 'session_expired':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'forced_logout':
        return <Shield className="w-4 h-4 text-red-600" />;
      case 'appointment_created':
        return <Calendar className="w-4 h-4 text-green-600" />;
      case 'appointment_status_changed':
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (activityType) => {
    switch (activityType) {
      case 'login':
        return 'default';
      case 'logout':
        return 'secondary';
      case 'session_expired':
        return 'destructive';
      case 'forced_logout':
        return 'destructive';
      case 'appointment_created':
        return 'default';
      case 'appointment_status_changed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diffMs = now - new Date(timestamp);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatExactDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `(${hours}h ${mins}m session)`;
    }
    return `(${mins}m session)`;
  };

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async () => {
    try {
      await activityLogAPI.export({
        activityType: activityTypeFilter !== 'all' ? activityTypeFilter : undefined,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        format: 'csv'
      });
      
      toast({
        title: "Export Started",
        description: "Activity logs will be downloaded shortly",
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export activity logs",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Logs
          </DialogTitle>
          <DialogDescription>
            Recent login and logout activities for your clinic (Last 7 days)
          </DialogDescription>
        </DialogHeader>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 py-4 border-b">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="session_expired">Expired</SelectItem>
              <SelectItem value="appointment_created">Appointment Created</SelectItem>
              <SelectItem value="appointment_status_changed">Appointment Status Changed</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading activity logs...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className="text-red-600 font-medium">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadLogs} 
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log._id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                {/* Activity Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {getActivityIcon(log.activityType)}
                </div>
                
                {/* Activity Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{log.userName}</span>
                      <Badge variant={getActivityColor(log.activityType)} className="text-xs">
                        {log.activityType}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(log.timestamp)}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {formatExactDateTime(log.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {/* Appointment-specific information */}
                    {(log.activityType === 'appointment_created' || log.activityType === 'appointment_status_changed') && (
                      <div className="bg-blue-50 p-2 rounded mb-2 border-l-2 border-blue-200">
                        <div className="flex items-center gap-4 mb-1">
                          <span className="flex items-center gap-1 font-medium">
                            <UserPlus className="w-3 h-3" />
                            Patient: {log.patientName}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <User className="w-3 h-3" />
                            Doctor: {log.doctorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mb-1">
                          <span>Type: {log.appointmentType}</span>
                          {log.appointmentDate && (
                            <span>Date: {new Date(log.appointmentDate).toLocaleDateString()}</span>
                          )}
                          {log.appointmentTime && (
                            <span>Time: {log.appointmentTime}</span>
                          )}
                        </div>
                        {log.activityType === 'appointment_status_changed' && (
                          <div className="flex items-center gap-2">
                            <span>Status: {log.oldStatus} → {log.newStatus}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Regular activity information */}
                    <div className="flex items-center gap-4 mb-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.userEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {log.deviceInfo?.browser || 'Unknown'}
                      </span>
                      {log.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(log.duration)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span>IP: {log.ipAddress}</span>
                      <span>OS: {log.deviceInfo?.os || 'Unknown'}</span>
                      <span className="capitalize">{log.userRole}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No activity logs found</p>
              <p className="text-sm">
                {searchTerm || activityTypeFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'No login/logout activities recorded in the last 7 days'
                }
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadLogs} 
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} activities
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityLogsModal;
