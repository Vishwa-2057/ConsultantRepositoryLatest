import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  Clock,
  Monitor,
  Shield,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle,
  Users,
  BarChart3,
  RefreshCw,
  UserPlus,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { activityLogAPI } from "@/services/api";

const ActivityLogs = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7"); // Last 7 days
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});


  useEffect(() => {
    loadActivityLogs();
    loadUsers();
    loadStats();
  }, [currentPage, activityTypeFilter, userFilter, dateRange]);

  const loadActivityLogs = async () => {
    setLoading(true);
    try {
      const response = await activityLogAPI.getAll({
        page: currentPage,
        limit: 20,
        activityType: activityTypeFilter !== 'all' ? activityTypeFilter : undefined,
        userId: userFilter !== 'all' ? userFilter : undefined,
        startDate: getStartDate()
      });
      
      setLogs(response.logs || []);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error('Error loading activity logs:', error);
      setLogs([]);
      setPagination({});
      toast({
        title: "Error",
        description: "Failed to load activity logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await activityLogAPI.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      toast({
        title: "Warning",
        description: "Failed to load user list for filtering",
        variant: "default",
      });
    }
  };

  const loadStats = async () => {
    try {
      const response = await activityLogAPI.getStats({
        startDate: getStartDate()
      });
      setStats(response.stats || {});
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({});
      toast({
        title: "Warning", 
        description: "Failed to load activity statistics",
        variant: "default",
      });
    }
  };

  const getStartDate = () => {
    const days = parseInt(dateRange);
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  };

  const handleExport = async () => {
    try {
      await activityLogAPI.export({
        activityType: activityTypeFilter !== 'all' ? activityTypeFilter : undefined,
        userId: userFilter !== 'all' ? userFilter : undefined,
        startDate: getStartDate(),
        format: 'csv'
      });
      
      toast({
        title: "Export Started",
        description: "Activity logs export will be downloaded shortly",
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
        return 'success';
      case 'logout':
        return 'default';
      case 'session_expired':
        return 'warning';
      case 'forced_logout':
        return 'destructive';
      case 'appointment_created':
        return 'success';
      case 'appointment_status_changed':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diffMs = now - new Date(timestamp);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
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
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Monitor login and logout activities for your clinic</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadActivityLogs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <LogIn className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.summary?.find(s => s.activityType === 'login')?.count || 0}
            </p>
            <p className="text-sm text-muted-foreground">Total Logins</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <LogOut className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.summary?.find(s => s.activityType === 'logout')?.count || 0}
            </p>
            <p className="text-sm text-muted-foreground">Total Logouts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.summary?.find(s => s.activityType === 'login')?.uniqueUserCount || 0}
            </p>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {Math.round(((stats.summary?.find(s => s.activityType === 'login')?.count || 0) / Math.max(users.length, 1)) * 100) / 100}
            </p>
            <p className="text-sm text-muted-foreground">Avg Sessions/User</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Activity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="session_expired">Session Expired</SelectItem>
                <SelectItem value="forced_logout">Forced Logout</SelectItem>
                <SelectItem value="appointment_created">Appointment Created</SelectItem>
                <SelectItem value="appointment_status_changed">Appointment Status Changed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {user.userName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-[150px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            Detailed log of user login and logout activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  {/* Activity Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {getActivityIcon(log.activityType)}
                  </div>
                  
                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{log.userName}</h4>
                        <Badge variant={getActivityColor(log.activityType)}>
                          {log.activityType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {formatTimeAgo(log.timestamp)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {formatExactDateTime(log.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{log.userEmail}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span className="capitalize">{log.userRole}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        <span>{log.deviceInfo?.browser || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {log.activityType === 'logout' && log.duration 
                            ? `Session: ${formatDuration(log.duration)}`
                            : new Date(log.timestamp).toLocaleTimeString()
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span>IP: {log.ipAddress}</span>
                      {log.deviceInfo?.os && (
                        <span className="ml-4">OS: {log.deviceInfo.os}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No activity logs found</p>
              <p className="text-sm">Activity logs will appear here as users login and logout</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogs;
