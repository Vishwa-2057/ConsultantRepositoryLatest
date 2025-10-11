import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Hospital, 
  Calendar, 
  FileText, 
  Clock,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Download,
  Printer,
  Share2
} from "lucide-react";

const SharedReferral = () => {
  const { code } = useParams();
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessCount, setAccessCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const response = await fetch(`/api/referrals/shared/${code}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Referral link not found or has expired");
          } else {
            setError("Failed to load referral information");
          }
          return;
        }
        
        const data = await response.json();
        setReferral(data.referral);
        setAccessCount(data.accessCount);
      } catch (error) {
        console.error('Error fetching referral:', error);
        setError("Failed to load referral information");
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchReferral();
    }
  }, [code]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": 
        return "destructive";
      case "Medium": 
        return "warning";
      case "Low": 
        return "secondary";
      default: 
        return "secondary";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": 
        return "warning";
      case "Approved":
      case "Scheduled": 
        return "primary";
      case "Completed": 
        return "success";
      case "In Progress": 
        return "secondary";
      case "Cancelled": 
        return "destructive";
      default: 
        return "muted";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "High":
        return AlertCircle;
      case "Medium": 
        return Clock;
      case "Low": 
        return CheckCircle;
      default: 
        return Clock;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Medical Referral - ${referral.patientName}`,
          text: `Referral for ${referral.patientName} to ${referral.specialistName} (${referral.specialty})`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Success",
          description: "Link copied to clipboard!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading referral information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!referral) {
    return null;
  }

  const PriorityIcon = getPriorityIcon(referral.urgency);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Medical Referral</h1>
              <p className="text-sm text-muted-foreground">
                Accessed {accessCount} time{accessCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Main Referral Card */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <User className="w-6 h-6" />
                  {referral.patientName}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Referral ID: {referral.id}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={getStatusColor(referral.status)} className="text-sm">
                  {referral.status}
                </Badge>
                <Badge variant={getPriorityColor(referral.urgency)} className="flex items-center gap-1">
                  <PriorityIcon className="w-3 h-3" />
                  {referral.urgency} Priority
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Specialist Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Hospital className="w-5 h-5" />
                Specialist Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Specialist</p>
                  <p className="font-medium">{referral.specialistName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Specialty</p>
                  <p className="font-medium">{referral.specialty}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Referral Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Referral Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reason for Referral</p>
                  <p className="text-foreground bg-muted/30 p-3 rounded-lg">
                    {referral.reason}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date Created</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {referral.preferredDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Preferred Date</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(referral.preferredDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  For questions about this referral, please contact the referring provider.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Contact via healthcare provider</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>Secure messaging available</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="border-0 shadow-soft print:hidden">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>This is a secure medical referral link. Please do not share with unauthorized individuals.</p>
              <p className="mt-1">Generated on {new Date().toLocaleDateString()} • Consultant Management System</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SharedReferral;
