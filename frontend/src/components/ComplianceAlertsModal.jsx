import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Check, Clock, User, Calendar } from "lucide-react";
import { complianceAlertAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const ComplianceAlertsModal = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [solvingAlerts, setSolvingAlerts] = useState(new Set());
  const { toast } = useToast();

  // Load all compliance alerts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAllAlerts();
    }
  }, [isOpen]);

  const loadAllAlerts = async () => {
    setLoading(true);
    try {
      const response = await complianceAlertAPI.getAll(1, 50, { 
        status: 'Active',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Failed to load compliance alerts:', error);
      setAlerts([]);
      toast({
        title: "Error",
        description: "Failed to load compliance alerts.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSolveAlert = async (alertId) => {
    setSolvingAlerts(prev => new Set([...prev, alertId]));
    
    try {
      await complianceAlertAPI.resolve(alertId, 'Marked as solved from compliance alerts modal');
      
      // Remove the solved alert from the list
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
      
      toast({ 
        title: "Alert Solved", 
        description: "Compliance alert has been marked as solved." 
      });
    } catch (error) {
      console.error('Failed to solve compliance alert:', error);
      toast({ 
        title: "Error", 
        description: "Failed to solve compliance alert. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSolvingAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            All Compliance Alerts
          </DialogTitle>
          <DialogDescription>
            Manage and resolve compliance alerts across the system
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading alerts...</p>
            </div>
          )}

          {!loading && alerts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No active compliance alerts found.</p>
            </div>
          )}

          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert._id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-foreground">{alert.type}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{alert.patientName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getPriorityColor(alert.priority)} className="text-xs">
                      {alert.priority}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
                      onClick={() => handleSolveAlert(alert._id)}
                      disabled={solvingAlerts.has(alert._id)}
                    >
                      {solvingAlerts.has(alert._id) ? (
                        <>
                          <Clock className="w-3 h-3 mr-1 animate-spin" />
                          Solving...
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Mark Solved
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {alert.message}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Created: {formatDate(alert.createdAt)}</span>
                    </div>
                    {alert.dueDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Due: {formatDate(alert.dueDate)}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    ID: {alert._id.slice(-6)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {alerts.length} active alert{alerts.length !== 1 ? 's' : ''} found
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAllAlerts} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComplianceAlertsModal;
