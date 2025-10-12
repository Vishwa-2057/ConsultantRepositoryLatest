import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { invoiceAPI } from "@/services/api";
import InvoiceModal from "@/components/InvoiceModal";
import InvoiceViewModal from "@/components/InvoiceViewModal";
import { 
  CreditCard, 
  FileText, 
  Search, 
  Plus, 
  DollarSign,
  Calendar,
  User,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const Billing = () => {
  // Set page title immediately
  document.title = "Smart Healthcare";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { toast } = useToast();

  // Cache management functions
  const clearBillingCache = () => {
    localStorage.removeItem('billing_invoices');
    localStorage.removeItem('billing_totalInvoices');
    localStorage.removeItem('billing_revenueStats');
    localStorage.removeItem('billing_cacheTimestamp');
  };

  const isCacheValid = () => {
    const timestamp = localStorage.getItem('billing_cacheTimestamp');
    if (!timestamp) return false;
    
    // Cache is valid for 1 hour (3600000 ms)
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    return cacheAge < 3600000;
  };

  const setCacheTimestamp = () => {
    localStorage.setItem('billing_cacheTimestamp', Date.now().toString());
  };

  // Invoices state (fetched from API)
  const [invoices, setInvoices] = useState(() => {
    const timestamp = localStorage.getItem('billing_cacheTimestamp');
    const isCacheValid = timestamp && (Date.now() - parseInt(timestamp, 10)) < 3600000;
    
    if (isCacheValid) {
      const cached = localStorage.getItem('billing_invoices');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('invoiceManagement_pageSize');
    return saved ? parseInt(saved) : 10;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalInvoices, setTotalInvoices] = useState(() => {
    // Initialize from localStorage if available and cache is valid
    const timestamp = localStorage.getItem('billing_cacheTimestamp');
    const isCacheValid = timestamp && (Date.now() - parseInt(timestamp, 10)) < 3600000;
    
    if (isCacheValid) {
      const cached = localStorage.getItem('billing_totalInvoices');
      return cached ? parseInt(cached, 10) : 0;
    }
    return 0;
  });

  // Revenue statistics state
  const [revenueStats, setRevenueStats] = useState(() => {
    // Initialize from localStorage if available and cache is valid
    const timestamp = localStorage.getItem('billing_cacheTimestamp');
    const isCacheValid = timestamp && (Date.now() - parseInt(timestamp, 10)) < 3600000;
    
    if (isCacheValid) {
      const cached = localStorage.getItem('billing_revenueStats');
      return cached ? JSON.parse(cached) : {
        totalRevenue: 0,
        pendingApprovalCount: 0,
        outstandingAmount: 0,
        paidThisMonth: 0
      };
    }
    return {
      totalRevenue: 0,
      pendingApprovalCount: 0,
      outstandingAmount: 0,
      paidThisMonth: 0
    };
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Financial reports state
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Fetch revenue statistics
  const fetchRevenueStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Fetch all invoices to calculate statistics
      const allInvoicesResponse = await invoiceAPI.getAll(1, 1000, {});
      const allInvoices = allInvoicesResponse.invoices || [];
      
      // Calculate total revenue (only from approved and paid invoices)
      const totalRevenue = allInvoices
        .filter(inv => ['Approved', 'Paid'].includes(inv.status))
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      
      // Count invoices pending approval (status = 'Sent')
      const pendingApprovalCount = allInvoices
        .filter(inv => inv.status === 'Sent').length;
      
      // Calculate outstanding amount (overdue invoices)
      const outstandingAmount = allInvoices
        .filter(inv => inv.status === 'Overdue')
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      
      // Calculate paid this month (invoices with status 'Paid' created this month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const paidThisMonth = allInvoices
        .filter(inv => {
          const invoiceDate = new Date(inv.date);
          return inv.status === 'Paid' && 
                 invoiceDate.getMonth() === currentMonth && 
                 invoiceDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      
      setRevenueStats({
        totalRevenue,
        pendingApprovalCount,
        outstandingAmount,
        paidThisMonth
      });

      // Calculate monthly revenue for the last 6 months
      const monthlyData = [];
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
        
        const monthRevenue = allInvoices
          .filter(inv => {
            const invoiceDate = new Date(inv.date);
            return ['Approved', 'Paid'].includes(inv.status) && 
                   invoiceDate >= monthDate && invoiceDate < nextMonthDate;
          })
          .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        
        monthlyData.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          revenue: monthRevenue
        });
      }
      setMonthlyRevenue(monthlyData);

      // Calculate payment methods breakdown (only from approved and paid invoices)
      const totalPaidRevenue = allInvoices
        .filter(inv => ['Approved', 'Paid'].includes(inv.status))
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      
      const paymentMethodsData = {
        'Direct Payment': totalPaidRevenue * 0.6,
        'Insurance': totalPaidRevenue * 0.3,
        'Cash': totalPaidRevenue * 0.1
      };
      
      const paymentMethodsArray = Object.entries(paymentMethodsData).map(([method, amount]) => ({
        method,
        amount,
        percentage: totalPaidRevenue > 0 ? Math.round((amount / totalPaidRevenue) * 100) : 0
      })).sort((a, b) => b.amount - a.amount);
      
      setPaymentMethods(paymentMethodsArray);
      setReportsLoading(false);
    } catch (err) {
      console.error('Failed to load revenue statistics:', err);
      setReportsLoading(false);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch invoices from API
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      // Note: New invoice model doesn't have status field
      // We'll filter on frontend based on date ranges if needed
      // The backend supports date and patientId filters; search by text is not supported.
      // We'll keep simple client-side search on the rendered list for now.

      const response = await invoiceAPI.getAll(currentPage, pageSize, filters);
      const list = response.invoices || [];

      // Normalize for rendering convenience with new invoice structure
      const transformed = list.map(inv => ({
        _id: inv._id,
        invoiceNo: inv.invoiceNo,
        patientName: inv.patientName,
        date: inv.date,
        total: inv.total,
        phone: inv.phone,
        email: inv.email,
        address: inv.address,
        lineItems: inv.lineItems || [],
        discount: inv.discount || 0,
        tax: inv.tax || 0,
        shipping: inv.shipping || 0,
        remarks: inv.remarks,
        status: inv.status, // Include status field
        createdAt: inv.createdAt,
        service: inv.lineItems?.[0]?.description || "No description",
      }));

      setInvoices(transformed);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalInvoices(response.pagination.totalInvoices);
      } else {
        setTotalPages(1);
        setTotalInvoices(transformed.length);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Failed to load invoices. Please try again.');
      setInvoices([]);
      setTotalPages(1);
      setTotalInvoices(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter]);

  useEffect(() => {
    document.title = "Smart Healthcare";
  }, []);

  // Save pageSize to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('invoiceManagement_pageSize', pageSize.toString());
  }, [pageSize, isInitialLoad]);

  useEffect(() => {
    fetchInvoices();
    fetchRevenueStats();
  }, [fetchInvoices, fetchRevenueStats]);

  // Clear cache when user changes (detect by checking if auth token changes)
  useEffect(() => {
    const currentUser = localStorage.getItem('authUser');
    const cachedUser = localStorage.getItem('billing_cachedUser');
    
    if (currentUser !== cachedUser) {
      // User has changed, clear the cache
      clearBillingCache();
      localStorage.setItem('billing_cachedUser', currentUser || '');
    }
  }, []);

  // Cache totalInvoices to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('billing_totalInvoices', totalInvoices.toString());
    setCacheTimestamp();
  }, [totalInvoices]);

  // Cache revenueStats to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('billing_revenueStats', JSON.stringify(revenueStats));
    setCacheTimestamp();
  }, [revenueStats]);

  // Cache invoices to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('billing_invoices', JSON.stringify(invoices));
    setCacheTimestamp();
  }, [invoices]);

  // Pending approvals (fetch invoices that are effectively pending review)
  const [approvals, setApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [approvalsError, setApprovalsError] = useState(null);

  const fetchApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    setApprovalsError(null);
    try {
      // Map "pending approvals" to backend status 'Sent' (awaiting processing)
      const response = await invoiceAPI.getAll(1, 10, { status: 'Sent' });
      const list = response.invoices || [];
      const transformed = list.map(inv => ({
        _id: inv._id,
        patient: inv.patientName,
        service: inv.lineItems?.[0]?.description || 'No description',
        amount: Number(inv.total || 0).toFixed(2),
        submittedDate: inv.date,
        invoiceNo: inv.invoiceNo,
      }));
      setApprovals(transformed);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
      setApprovalsError('Failed to load pending approvals. Please try again.');
      setApprovals([]);
    } finally {
      setApprovalsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Approve / Reject handlers
  const handleApproveInvoice = async (approval) => {
    try {
      await invoiceAPI.approve(approval._id);
      toast({ 
        title: 'Invoice Approved', 
        description: `Invoice ${approval.invoiceNo} has been approved successfully.`,
        variant: 'default'
      });
      // Refresh both lists and statistics
      fetchApprovals();
      fetchInvoices();
      fetchRevenueStats();
    } catch (err) {
      console.error('Failed to approve invoice:', err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to approve invoice.', 
        variant: 'destructive' 
      });
    }
  };

  const handleRejectInvoice = async (approval) => {
    try {
      // You could add a dialog to ask for rejection reason here
      const reason = 'Rejected by administrator';
      await invoiceAPI.reject(approval._id, reason);
      toast({ 
        title: 'Invoice Rejected', 
        description: `Invoice ${approval.invoiceNo} has been rejected.`,
        variant: 'default'
      });
      // Refresh both lists and statistics
      fetchApprovals();
      fetchInvoices();
      fetchRevenueStats();
    } catch (err) {
      console.error('Failed to reject invoice:', err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to reject invoice.', 
        variant: 'destructive' 
      });
    }
  };

  // Get invoice status from database or fallback to date-based calculation
  const getInvoiceStatus = (invoice) => {
    // Use actual status from database if available
    if (invoice.status) {
      return invoice.status;
    }
    
    // Fallback to date-based calculation for existing invoices without status
    const invoiceDate = new Date(invoice.date);
    const daysDiff = Math.floor((new Date() - invoiceDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) return 'Sent';
    if (daysDiff <= 30) return 'Approved';
    return 'Overdue';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Draft": return "secondary";
      case "Sent": return "warning";
      case "Approved": return "success";
      case "Rejected": return "destructive";
      case "Paid": return "success";
      case "Overdue": return "destructive";
      case "Cancelled": return "secondary";
      // Fallback for old status values
      case "Recent": return "warning";
      case "Current": return "success";
      case "Older": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Draft": return FileText;
      case "Sent": return Clock;
      case "Approved": return CheckCircle;
      case "Rejected": return AlertCircle;
      case "Paid": return CheckCircle;
      case "Overdue": return AlertCircle;
      case "Cancelled": return AlertCircle;
      // Fallback for old status values
      case "Recent": return Clock;
      case "Current": return CheckCircle;
      case "Older": return AlertCircle;
      default: return Clock;
    }
  };

  // Client-side search on fetched data (by patient or invoice number)
  const filteredInvoices = invoices.filter(invoice => {
    const patient = (invoice.patientName || "").toLowerCase();
    const invNum = (invoice.invoiceNo || "").toString().toLowerCase();
    const service = (invoice.service || "").toLowerCase();
    const matchesSearch = patient.includes(searchTerm.toLowerCase()) || 
                         invNum.includes(searchTerm.toLowerCase()) ||
                         service.includes(searchTerm.toLowerCase());
    
    // Apply status filter
    if (statusFilter !== "all") {
      const invoiceStatus = getInvoiceStatus(invoice).toLowerCase();
      if (invoiceStatus !== statusFilter.toLowerCase()) return false;
    }
    
    return matchesSearch;
  });

  // Modal handlers
  const handleNewInvoice = () => setIsInvoiceModalOpen(true);
  const handleInvoiceModalClose = () => setIsInvoiceModalOpen(false);

  const handleInvoiceSubmit = (invoiceData) => {
    // Add the new invoice to the list (in a real app, this would be handled by state management)
    const patientName = invoiceData.patientName || 'patient';
    const totalAmount = invoiceData.total || 0;
    
    toast({
      title: "Invoice Generated!",
      description: `Successfully created invoice ${invoiceData.invoiceNo} for ${patientName} - ₹${totalAmount}`,
      variant: "default",
    });
    
    // Refresh the invoices list and statistics
    fetchInvoices();
    fetchRevenueStats();
  };

  // View modal handlers
  const handleViewInvoice = async (invoice) => {
    try {
      // Fetch full invoice details from API
      const fullInvoice = await invoiceAPI.getById(invoice._id);
      setSelectedInvoice(fullInvoice);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch invoice details:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    }
  };

  const handleViewModalClose = () => {
    setIsViewModalOpen(false);
    setSelectedInvoice(null);
  };

  // Download handler
  const handleDownloadInvoice = async (invoice) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Fetch full invoice details to ensure completeness
      const fullInvoice = await invoiceAPI.getById(invoice._id);

      let y = 15;
      const pageHeight = doc.internal.pageSize.getHeight();
      const lineHeight = 8;
      const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      const ensureSpace = (needed = lineHeight) => {
        if (y + needed > pageHeight - 15) { doc.addPage(); y = 15; }
      };
      const line = (text, inc = lineHeight) => { ensureSpace(inc); doc.text(String(text), 14, y); y += inc; };
      const lineAt = (x, text, inc = lineHeight) => { ensureSpace(inc); doc.text(String(text), x, y); y += inc; };

      // Helper function to get status label
      const getStatusLabel = (status) => {
        switch (status) {
          case "Draft": return "Draft";
          case "Sent": return "Pending Approval";
          case "Approved": return "Approved";
          case "Rejected": return "Rejected";
          case "Paid": return "Paid";
          case "Overdue": return "Overdue";
          case "Cancelled": return "Cancelled";
          default: return status || "Unknown";
        }
      };

      // Header
      doc.setFontSize(18);
      line('INVOICE', 10);
      doc.setFontSize(12);
      line(`Invoice Number: ${fullInvoice.invoiceNo}`);
      line(`Date: ${fullInvoice.date}`);
      line(`Status: ${getStatusLabel(fullInvoice.status)}`);
      line(`Created: ${new Date(fullInvoice.createdAt).toLocaleDateString()}`, 12);

      // Bill To
      doc.setFont(undefined, 'bold');
      line('Bill To:', 8);
      doc.setFont(undefined, 'normal');
      const patientName = fullInvoice.patientName || '';
      const patientPhone = fullInvoice.phone || '';
      const patientEmail = fullInvoice.email || '';
      const addr = fullInvoice.address;
      const addressText = addr && typeof addr === 'object'
        ? [addr.line1, addr.line2, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')
        : '';
      line(patientName);
      if (patientPhone) line(patientPhone);
      if (patientEmail) line(patientEmail);
      if (addressText) line(addressText, 12);

      // Line Items table header
      doc.setFont(undefined, 'bold');
      line('Line Items:', 8);
      doc.text('Description', 14, y);
      doc.text('Qty', 130, y);
      doc.text('Unit Price', 150, y);
      doc.text('Amount', 175, y);
      y += 6;
      doc.setFont(undefined, 'normal');

      const items = fullInvoice.lineItems || [];
      if (items.length === 0) {
        line('No items listed');
      } else {
        items.forEach((item) => {
          const descLines = doc.splitTextToSize(item.description || '', 110);
          descLines.forEach((t, idx) => {
            ensureSpace();
            doc.text(t, 14, y);
            if (idx === 0) {
              doc.text(String(item.qty || 0), 130, y);
              doc.text(money(item.unitPrice), 150, y);
              doc.text(money(item.qty * item.unitPrice), 175, y);
            }
            y += lineHeight - 2;
          });
          y += 2;
        });
      }

      y += 4;
      const subtotal = fullInvoice.lineItems?.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0) || 0;
      line(`Subtotal: ${money(subtotal)}`);
      if (fullInvoice.discount > 0) line(`Discount: ${money(fullInvoice.discount)}`);
      if (fullInvoice.tax > 0) line(`Tax: ${money(fullInvoice.tax)}`);
      if (fullInvoice.shipping > 0) line(`Shipping: ${money(fullInvoice.shipping)}`);
      doc.setFont(undefined, 'bold');
      line(`Total: ${money(fullInvoice.total)}`, 12);
      doc.setFont(undefined, 'normal');

      y += 4;
      line(`Invoice Date: ${fullInvoice.date}`);
      line(`Created: ${new Date(fullInvoice.createdAt).toLocaleDateString()}`, 12);

      if (fullInvoice.remarks) {
        doc.setFont(undefined, 'bold');
        line('Remarks:', 8);
        doc.setFont(undefined, 'normal');
        const splitRemarks = doc.splitTextToSize(fullInvoice.remarks, 180);
        splitRemarks.forEach((t) => line(t));
      }

      doc.save(`invoice-${fullInvoice.invoiceNo}.pdf`);

      toast({
        title: 'Download Started',
        description: `Invoice ${invoice.invoiceNo} downloaded as PDF`,
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search, Stats and Actions - Single Line */}
      <div className="flex items-center justify-between gap-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search invoices by patient name or invoice ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">
              Total: {totalInvoices || 0}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">
              Approved: {filteredInvoices.filter(inv => getInvoiceStatus(inv) === 'Approved').length || 0}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-yellow-100 rounded-full">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <span className="text-sm text-yellow-600 font-medium">
              Pending: {filteredInvoices.filter(inv => getInvoiceStatus(inv) === 'Sent').length || 0}
            </span>
          </div>
        </div>
        
        {/* Filters and Actions */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-10 text-sm bg-white border-gray-200 rounded-lg shadow-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            onClick={handleNewInvoice}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Invoices</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {filteredInvoices.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalInvoices)} of {totalInvoices}
                </span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-md border border-gray-200">
                <span className="text-xs font-medium text-gray-500">Show</span>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-12 h-6 text-xs border-0 bg-transparent p-0 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchTerm ? "No invoices found matching your search." : "No invoices found."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
                  {filteredInvoices.map((invoice) => {
                    const StatusIcon = getStatusIcon(getInvoiceStatus(invoice));
                    return (
                      <div key={invoice._id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 border-0">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Left section - Patient info */}
                          <div className="col-span-5 flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{invoice.patientName}</h3>
                              <p className="text-sm text-muted-foreground">
                                #{invoice.invoiceNo} • {invoice.service}
                              </p>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  {invoice.date}
                                </span>
                                {invoice.phone && (
                                  <span className="flex items-center">
                                    <User className="w-4 h-4 mr-1" />
                                    {invoice.phone}
                                  </span>
                                )}
                              </div>
                              {invoice.lineItems && invoice.lineItems.length > 1 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {invoice.lineItems.length} items total
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Middle section - Amount and Status */}
                          <div className="col-span-4 text-center">
                            <p className="text-lg font-bold text-foreground">₹{Number(invoice.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            <Badge variant={getStatusColor(getInvoiceStatus(invoice))} className="mt-1">
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getInvoiceStatus(invoice)}
                            </Badge>
                            {(invoice.discount > 0 || invoice.tax > 0 || invoice.shipping > 0) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {invoice.discount > 0 && `Disc: ₹${invoice.discount} `}
                                {invoice.tax > 0 && `Tax: ₹${invoice.tax} `}
                                {invoice.shipping > 0 && `Ship: ₹${invoice.shipping}`}
                              </p>
                            )}
                          </div>
                          
                          {/* Right section - Actions */}
                          <div className="col-span-3 flex justify-end items-center space-x-2">
                              {getInvoiceStatus(invoice) === 'Sent' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleApproveInvoice(invoice)}
                                  title="Approve Invoice"
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewInvoice(invoice)}
                                title="View Invoice Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDownloadInvoice(invoice)}
                                title="Download Invoice"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation - Only show when multiple pages */}
      {totalPages > 1 && (
        <div className="flex justify-center pb-2">
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className={`w-8 h-8 p-0 ${currentPage === pageNum ? "bg-blue-600 text-white" : "bg-white border-gray-200 hover:bg-gray-50"} rounded-lg shadow-sm`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={handleInvoiceModalClose}
        onSubmit={handleInvoiceSubmit}
      />

      {/* Invoice View Modal */}
      <InvoiceViewModal
        isOpen={isViewModalOpen}
        onClose={handleViewModalClose}
        invoice={selectedInvoice}
      />
    </div>
  );
};

export default Billing;
