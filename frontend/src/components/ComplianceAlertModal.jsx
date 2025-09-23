import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Filter, ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle, XCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { complianceAlertAPI } from '@/services/api';

const ComplianceAlertModal = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resolvingAlerts, setResolvingAlerts] = useState(new Set());
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        loadAlerts(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter, priorityFilter, statusFilter, isOpen]);

  // Load alerts from API
  const loadAlerts = async (page = 1) => {
    setLoading(true);
    try {
      const filters = {};
      if (typeFilter && typeFilter !== "all") filters.type = typeFilter;
      if (priorityFilter && priorityFilter !== "all") filters.priority = priorityFilter;
      if (statusFilter && statusFilter !== "all") filters.status = statusFilter;
      if (searchTerm.trim()) filters.search = searchTerm.trim();

      const response = await complianceAlertAPI.getAll(page, itemsPerPage, {
        ...filters,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      setAlerts(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load compliance alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance alerts. Please try again.",
        variant: "destructive"
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle alert status update
  const handleUpdateStatus = async (alertId, newStatus, resolutionNotes = '') => {
    setResolvingAlerts(prev => new Set([...prev, alertId]));
    try {
      await complianceAlertAPI.updateStatus(alertId, newStatus, resolutionNotes);
      toast({
        title: "Success",
        description: `Alert ${newStatus.toLowerCase()} successfully.`,
      });
      loadAlerts(currentPage); // Reload current page
    } catch (error) {
      console.error('Failed to update alert status:', error);
      toast({
        title: "Error",
        description: "Failed to update alert status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setResolvingAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  // Get status color for badges
  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "destructive";
      case "Acknowledged": return "warning";
      case "Resolved": return "success";
      case "Dismissed": return "secondary";
      default: return "default";
    }
  };

  // Get priority color for badges
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical": return "destructive";
      case "High": return "destructive";
      case "Medium": return "warning";
      case "Low": return "secondary";
      default: return "default";
    }
  };

  // Get urgency level based on due date
  const getUrgencyLevel = (dueDate, priority) => {
    if (!dueDate) return priority === 'Critical' ? 'critical' : 'normal';
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due - now) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'overdue';
    if (diffHours < 24) return 'urgent';
    if (diffHours < 72) return 'soon';
    return 'normal';
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  // Pagination handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      loadAlerts(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadAlerts(currentPage + 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Compliance Alerts</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Medication">Medication</SelectItem>
              <SelectItem value="Appointment">Appointment</SelectItem>
              <SelectItem value="Lab Results">Lab Results</SelectItem>
              <SelectItem value="Billing">Billing</SelectItem>
              <SelectItem value="Compliance">Compliance</SelectItem>
              <SelectItem value="Follow-up">Follow-up</SelectItem>
              <SelectItem value="Treatment">Treatment</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="Critical">Critical Priority</SelectItem>
              <SelectItem value="High">High Priority</SelectItem>
              <SelectItem value="Medium">Medium Priority</SelectItem>
              <SelectItem value="Low">Low Priority</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Acknowledged">Acknowledged</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading compliance alerts...</p>
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No compliance alerts found</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {alerts.map((alert) => {
                const urgency = getUrgencyLevel(alert.dueDate, alert.priority);
                return (
                  <Card key={alert._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(alert.status)} className="text-xs">
                            {alert.status}
                          </Badge>
                          <Badge variant={getPriorityColor(alert.priority)} className="text-xs">
                            {alert.priority}
                          </Badge>
                          {urgency === 'overdue' && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                          {urgency === 'urgent' && (
                            <Badge variant="warning" className="text-xs">
                              Due Soon
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {alert.status === 'Active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(alert._id, 'Acknowledged')}
                                disabled={resolvingAlerts.has(alert._id)}
                                className="text-xs"
                              >
                                {resolvingAlerts.has(alert._id) ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Acknowledge
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(alert._id, 'Resolved')}
                                disabled={resolvingAlerts.has(alert._id)}
                                className="text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                              >
                                {resolvingAlerts.has(alert._id) ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Resolve
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {alert.status === 'Acknowledged' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(alert._id, 'Resolved')}
                              disabled={resolvingAlerts.has(alert._id)}
                              className="text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                            >
                              {resolvingAlerts.has(alert._id) ? (
                                <Clock className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Resolve
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">{alert.type}</span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm font-medium">{alert.title}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{alert.patientName}</span>
                          </div>
                          {alert.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {formatDate(alert.dueDate)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Created: {formatDate(alert.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm text-foreground">{alert.message}</p>
                        </div>

                        {alert.resolutionNotes && (
                          <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                            <p className="text-sm text-green-800">
                              <strong>Resolution:</strong> {alert.resolutionNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ComplianceAlertModal;
