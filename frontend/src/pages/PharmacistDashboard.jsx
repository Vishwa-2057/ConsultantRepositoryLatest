import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign,
  FileText,
  Calendar,
  Clock,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { inventoryAPI, prescriptionAPI } from '../services/api';
import { useToast } from "@/hooks/use-toast";

const PharmacistDashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    expiringItems: 0,
    expiredItems: 0,
    totalValue: 0
  });
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, prescriptionsResponse] = await Promise.all([
        inventoryAPI.getStats(),
        prescriptionAPI.getStats()
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      // Handle prescription stats response
      if (prescriptionsResponse) {
        // The stats endpoint returns recentPrescriptions directly
        setRecentPrescriptions(prescriptionsResponse.recentPrescriptions || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Inventory Items",
      value: stats.totalItems,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      onClick: () => navigate('/inventory-management')
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      onClick: () => navigate('/inventory-management?filter=lowStock')
    },
    {
      title: "Expiring Soon",
      value: stats.expiringItems,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      onClick: () => navigate('/inventory-management?filter=expiring')
    },
    {
      title: "Expired Items",
      value: stats.expiredItems,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-100",
      onClick: () => navigate('/inventory-management?filter=expired')
    },
    {
      title: "Total Inventory Value",
      value: `₹${stats.totalValue.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pharmacist Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage inventory and view prescriptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className={`cursor-pointer hover:shadow-lg transition-shadow ${stat.onClick ? 'hover:border-blue-500' : ''}`}
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {loading ? "..." : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Prescriptions */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Prescriptions</CardTitle>
              <CardDescription>Latest prescriptions from doctors</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/pharmacist-prescriptions')}>
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-[350px] max-h-[450px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recentPrescriptions.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No recent prescriptions</div>
          ) : (
            <div className="space-y-3">
              {recentPrescriptions.map((prescription) => (
                <div 
                  key={prescription._id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate('/pharmacist-prescriptions')}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {prescription.patientId?.fullName || 'Unknown Patient'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Dr. {prescription.doctorId?.fullName || 'Unknown Doctor'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {prescription.medications?.length || 0} medications
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(prescription.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {prescription.status || 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default PharmacistDashboard;
