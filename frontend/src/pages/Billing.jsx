import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { invoiceAPI, appointmentInvoiceAPI } from "@/services/api";
import { config } from '@/config/env';
import sessionManager from '@/utils/sessionManager';
import InvoiceModal from "@/components/InvoiceModal";
import InvoiceViewModal from "@/components/InvoiceViewModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronRight,
  Info
} from "lucide-react";

const Billing = () => {
  // Set page title immediately
  document.title = "Smart Healthcare";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const [loadingPaymentLink, setLoadingPaymentLink] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { toast } = useToast();
  const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';

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
  const [appointmentInvoices, setAppointmentInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('regular');
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
        paidThisMonth: 0,
        approvedCount: 0
      };
    }
    return {
      totalRevenue: 0,
      pendingApprovalCount: 0,
      outstandingAmount: 0,
      paidThisMonth: 0,
      approvedCount: 0
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
      
      // Calculate total revenue (only from approved invoices)
      const totalRevenue = allInvoices
        .filter(inv => inv.status === 'Approved')
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      
      // Count invoices not approved (status = 'Rejected')
      const pendingApprovalCount = allInvoices
        .filter(inv => inv.status === 'Rejected').length;
      
      // Count approved invoices (status = 'Approved')
      const approvedCount = allInvoices
        .filter(inv => inv.status === 'Approved').length;
      
      // Calculate outstanding amount (not approved invoices)
      const outstandingAmount = allInvoices
        .filter(inv => inv.status === 'Rejected')
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      
      // Calculate approved this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const paidThisMonth = allInvoices
        .filter(inv => {
          const invoiceDate = new Date(inv.date);
          return inv.status === 'Approved' && 
                 invoiceDate.getMonth() === currentMonth && 
                 invoiceDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      
      setRevenueStats({
        totalRevenue,
        pendingApprovalCount,
        approvedCount,
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
            return inv.status === 'Approved' && 
                   invoiceDate >= monthDate && invoiceDate < nextMonthDate;
          })
          .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        
        monthlyData.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          revenue: monthRevenue
        });
      }
      setMonthlyRevenue(monthlyData);

      // Calculate payment methods breakdown (only from approved invoices)
      const totalPaidRevenue = allInvoices
        .filter(inv => inv.status === 'Approved')
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
        status: inv.status,
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

  const fetchAppointmentInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const response = await appointmentInvoiceAPI.getAll(currentPage, pageSize, filters);
      const list = response.invoices || [];

      setAppointmentInvoices(list);
      if (response.pagination) {
        setTotalPages(response.pagination.pages);
        setTotalInvoices(response.pagination.total);
      } else {
        setTotalPages(1);
        setTotalInvoices(list.length);
      }
    } catch (err) {
      console.error('Failed to load appointment invoices:', err);
      setError('Failed to load appointment invoices. Please try again.');
      setAppointmentInvoices([]);
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
    if (activeTab === 'regular') {
      fetchInvoices();
    } else if (activeTab === 'appointment') {
      fetchAppointmentInvoices();
    }
    fetchRevenueStats();
  }, [activeTab, fetchInvoices, fetchAppointmentInvoices, fetchRevenueStats]);

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
      // Map "pending approvals" to backend status 'Rejected' (not approved)
      const response = await invoiceAPI.getAll(1, 10, { status: 'Rejected' });
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
  const handleApproveAppointmentInvoice = async (invoiceId) => {
    try {
      await appointmentInvoiceAPI.approve(invoiceId);
      toast({
        title: "Success",
        description: "Appointment invoice approved successfully.",
      });
      fetchAppointmentInvoices();
      fetchRevenueStats();
    } catch (err) {
      console.error('Failed to approve appointment invoice:', err);
      toast({
        title: "Error",
        description: "Failed to approve appointment invoice.",
        variant: "destructive",
      });
    }
  };


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

  // Get invoice status from database
  const getInvoiceStatus = (invoice) => {
    // Use actual status from database, default to 'Rejected' if not set
    return invoice.status || 'Rejected';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "success";
      case "Rejected": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Approved": return CheckCircle;
      case "Rejected": return AlertCircle;
      default: return FileText;
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
    
    // Store created invoice and show payment dialog
    setCreatedInvoice(invoiceData);
    setIsPaymentDialogOpen(true);
    
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

      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      let y = 20;
      const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

      // Helper function to get status label
      const getStatusLabel = (status) => {
        switch (status) {
          case "Approved": return "Approved";
          case "Rejected": return "Not Approved";
          default: return status || "Unknown";
        }
      };

      // Header - Invoice Details Title
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Invoice Details', margin, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('View and manage invoice information', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 12;

      // Invoice Number and Total
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`Invoice #${fullInvoice.invoiceNo}`, margin, y);
      doc.text(money(fullInvoice.total), pageWidth - margin, y, { align: 'right' });
      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${fullInvoice.date}`, margin, y);
      y += 5;
      doc.text(getStatusLabel(fullInvoice.status), margin, y);
      doc.setTextColor(0, 0, 0);
      y += 12;

      // Divider line
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Patient Information Section
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Patient Information', margin, y);
      y += 8;

      // Draw box for patient info
      const boxHeight = 35;
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y - 3, pageWidth - 2 * margin, boxHeight);
      
      // Left column - Patient details
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(fullInvoice.patientName || 'N/A', margin + 5, y + 3);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      if (fullInvoice.phone) {
        doc.text(fullInvoice.phone, margin + 5, y + 9);
      }
      if (fullInvoice.email) {
        doc.text(fullInvoice.email, margin + 5, y + 14);
      }
      const addr = fullInvoice.address;
      const addressText = addr && typeof addr === 'object'
        ? [addr.line1, addr.line2, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')
        : '';
      if (addressText) {
        const addrLines = doc.splitTextToSize(addressText, 70);
        addrLines.forEach((line, idx) => {
          doc.text(line, margin + 5, y + 19 + (idx * 4));
        });
      }

      // Right column - Invoice metadata
      const rightX = pageWidth / 2 + 10;
      doc.setTextColor(100, 100, 100);
      doc.text('Invoice Date:', rightX, y + 3);
      doc.text('Invoice Number:', rightX, y + 8);
      doc.text('Created:', rightX, y + 13);
      doc.text('Status:', rightX, y + 18);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.text(String(fullInvoice.date || ''), pageWidth - margin - 5, y + 3, { align: 'right' });
      doc.text(String(fullInvoice.invoiceNo || ''), pageWidth - margin - 5, y + 8, { align: 'right' });
      doc.text(new Date(fullInvoice.createdAt).toLocaleDateString(), pageWidth - margin - 5, y + 13, { align: 'right' });
      doc.text(String(getStatusLabel(fullInvoice.status)), pageWidth - margin - 5, y + 18, { align: 'right' });

      y += boxHeight + 10;

      // Line Items Section
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Line Items', margin, y);
      y += 8;

      // Table header
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Description', margin + 5, y);
      doc.text('Qty', pageWidth - 95, y, { align: 'right' });
      doc.text('Unit Price', pageWidth - 55, y, { align: 'right' });
      doc.text('Amount', pageWidth - margin - 5, y, { align: 'right' });
      y += 5;

      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Line items
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      const items = fullInvoice.lineItems || [];
      items.forEach((item) => {
        doc.text(item.description || 'N/A', margin + 5, y);
        doc.text(String(item.qty || 0), pageWidth - 95, y, { align: 'right' });
        doc.text(money(item.unitPrice), pageWidth - 55, y, { align: 'right' });
        doc.text(money(item.qty * item.unitPrice), pageWidth - margin - 5, y, { align: 'right' });
        y += 6;
      });

      y += 5;
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Totals section
      const totalsX = pageWidth - 80;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      
      const subtotal = fullInvoice.lineItems?.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0) || 0;
      doc.text('Subtotal:', totalsX, y);
      doc.setTextColor(0, 0, 0);
      doc.text(money(subtotal), pageWidth - margin - 5, y, { align: 'right' });
      y += 5;

      if (fullInvoice.discount > 0) {
        doc.setTextColor(100, 100, 100);
        doc.text('Discount:', totalsX, y);
        doc.setTextColor(220, 38, 38);
        doc.text(`-${money(fullInvoice.discount)}`, pageWidth - margin - 5, y, { align: 'right' });
        y += 5;
      }

      if (fullInvoice.tax > 0) {
        doc.setTextColor(100, 100, 100);
        doc.text('Tax:', totalsX, y);
        doc.setTextColor(0, 0, 0);
        doc.text(money(fullInvoice.tax), pageWidth - margin - 5, y, { align: 'right' });
        y += 5;
      }

      if (fullInvoice.shipping > 0) {
        doc.setTextColor(100, 100, 100);
        doc.text('Shipping:', totalsX, y);
        doc.setTextColor(0, 0, 0);
        doc.text(money(fullInvoice.shipping), pageWidth - margin - 5, y, { align: 'right' });
        y += 5;
      }

      // Total
      y += 2;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Total:', totalsX, y);
      doc.text(money(fullInvoice.total), pageWidth - margin - 5, y, { align: 'right' });

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

  const generateInvoicePaymentLink = async (invoiceId, amount) => {
    try {
      setLoadingPaymentLink(true);
      const token = await sessionManager.getToken();
      
      const orderResponse = await fetch(`${API_BASE_URL}/payments/create-invoice-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId: invoiceId,
          amount: amount
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        if (orderResponse.status === 503) {
          toast({
            title: "Error",
            description: "Payment gateway not configured. Please set up Razorpay keys.",
            variant: "destructive"
          });
          return null;
        }
        throw new Error(errorData.message || 'Failed to generate payment link');
      }

      const orderData = await orderResponse.json();
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/invoice-payment?order_id=${orderData.order.id}&invoice_id=${invoiceId}`;
      
      setPaymentLink(link);
      return link;
    } catch (error) {
      console.error('Error generating payment link:', error);
      toast({
        title: "Error",
        description: "Failed to generate payment link",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoadingPaymentLink(false);
    }
  };

  const handleCopyPaymentLink = async (invoiceId, amount) => {
    let link = paymentLink;
    
    if (!link) {
      link = await generateInvoicePaymentLink(invoiceId, amount);
    }
    
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        toast({
          title: "Success",
          description: "Payment link copied to clipboard!",
        });
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive"
        });
      }
    }
  };

  const handleSharePaymentLink = async (invoiceId, amount) => {
    let link = paymentLink;
    
    if (!link) {
      link = await generateInvoicePaymentLink(invoiceId, amount);
    }
    
    if (link && navigator.share) {
      try {
        await navigator.share({
          title: 'Invoice Payment',
          text: 'Complete your invoice payment using this link',
          url: link
        });
        toast({
          title: "Success",
          description: "Payment link shared successfully!",
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing link:', error);
          toast({
            title: "Error",
            description: "Failed to share link",
            variant: "destructive"
          });
        }
      }
    } else if (link) {
      // Fallback to copy if share is not supported
      handleCopyPaymentLink(invoiceId, amount);
    }
  };

  const handleInvoicePayment = async () => {
    if (!createdInvoice) {
      toast({
        title: "Error",
        description: "Invoice information not available",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessingPayment(true);

      // Create Razorpay order
      const token = await sessionManager.getToken();
      const orderResponse = await fetch(`${API_BASE_URL}/payments/create-invoice-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId: createdInvoice._id,
          amount: createdInvoice.total
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        if (orderResponse.status === 503) {
          toast({
            title: "Error",
            description: "Payment gateway not configured. Please set up Razorpay keys.",
            variant: "destructive"
          });
          setProcessingPayment(false);
          return;
        }
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_dummy',
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: 'Healthcare Invoice Payment',
          description: `Payment for Invoice #${createdInvoice.invoiceNo}`,
          order_id: orderData.order.id,
          handler: async function (response) {
            try {
              // Verify payment
              const verifyResponse = await fetch(`${API_BASE_URL}/payments/verify-invoice`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  invoiceId: createdInvoice._id
                })
              });

              if (!verifyResponse.ok) {
                throw new Error('Payment verification failed');
              }

              toast({
                title: "Success",
                description: "Payment successful! Invoice approved.",
              });
              setIsPaymentDialogOpen(false);
              fetchInvoices();
              fetchRevenueStats();
            } catch (error) {
              console.error('Payment verification error:', error);
              toast({
                title: "Error",
                description: "Payment verification failed",
                variant: "destructive"
              });
            } finally {
              setProcessingPayment(false);
            }
          },
          prefill: {
            name: createdInvoice.patientName || '',
            email: createdInvoice.email || '',
            contact: createdInvoice.phone || ''
          },
          theme: {
            color: '#3B82F6'
          },
          modal: {
            ondismiss: function() {
              setProcessingPayment(false);
              toast({
                title: "Info",
                description: "Payment cancelled",
              });
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };

      script.onerror = () => {
        setProcessingPayment(false);
        toast({
          title: "Error",
          description: "Failed to load payment gateway",
          variant: "destructive"
        });
      };
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate payment",
        variant: "destructive"
      });
      setProcessingPayment(false);
    }
  };

  const handleSkipInvoicePayment = () => {
    setIsPaymentDialogOpen(false);
    toast({
      title: "Info",
      description: "Invoice created. Payment can be made later.",
    });
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
              Approved: {activeTab === 'regular' 
                ? (revenueStats.approvedCount || 0) 
                : activeTab === 'appointment'
                ? (appointmentInvoices.filter(inv => inv.status === 'approved' || inv.status === 'paid').length || 0)
                : (appointmentInvoices.filter(inv => inv.status === 'approved' || inv.status === 'paid').length || 0)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-yellow-100 rounded-full">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <span className="text-sm text-yellow-600 font-medium">
              Not Approved: {activeTab === 'regular' 
                ? (filteredInvoices.filter(inv => getInvoiceStatus(inv) === 'Rejected').length || 0)
                : activeTab === 'appointment'
                ? (appointmentInvoices.filter(inv => inv.status === 'unapproved').length || 0)
                : (appointmentInvoices.filter(inv => inv.status === 'unapproved').length || 0)}
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
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Not Approved</SelectItem>
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

      {/* Invoices List with Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="regular">Regular Invoices</TabsTrigger>
                <TabsTrigger value="appointment">Appointment Invoices</TabsTrigger>
              </TabsList>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {activeTab === 'regular' ? filteredInvoices.length : appointmentInvoices.length}
                </Badge>
              </div>
            </div>
          </Tabs>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {activeTab === 'regular' ? 'Regular Invoices' : 'Appointment Invoices'}
              </h2>
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
          ) : activeTab === 'regular' && filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchTerm ? "No invoices found matching your search." : "No invoices found."}
              </p>
            </div>
          ) : activeTab === 'appointment' && appointmentInvoices.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No appointment invoices found.</p>
            </div>
          ) : (
            <div className="space-y-2">
                  {activeTab === 'regular' && filteredInvoices.map((invoice) => {
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
                              {getInvoiceStatus(invoice) === 'Rejected' && (
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
                  {activeTab === 'appointment' && appointmentInvoices.map((invoice) => (
                    <div key={invoice._id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 border-0">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Left section - Patient info */}
                        <div className="col-span-5 flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{invoice.patientId?.fullName || 'N/A'}</h3>
                            <p className="text-sm text-muted-foreground">
                              #{invoice.invoiceNumber} • {invoice.appointmentDetails?.appointmentType || 'Appointment'}
                            </p>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {invoice.appointmentDetails?.appointmentDate ? new Date(invoice.appointmentDetails.appointmentDate).toLocaleDateString('en-GB') : 'N/A'}
                              </span>
                              <span className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                Dr. {invoice.doctorId?.fullName || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Middle section - Amount and Status */}
                        <div className="col-span-4 text-center">
                          <p className="text-lg font-bold text-foreground">₹{Number(invoice.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'approved' ? 'secondary' : 'outline'} className="mt-1">
                            {invoice.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {invoice.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {invoice.status === 'unapproved' && <Clock className="w-3 h-3 mr-1" />}
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Payment: {invoice.paymentMethod === 'cash' ? 'Cash' : invoice.paymentMethod === 'online' ? 'Online' : 'Pending'}
                          </p>
                        </div>
                        
                        {/* Right section - Actions */}
                        <div className="col-span-3 flex justify-end items-center space-x-2">
                          {invoice.status === 'unapproved' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleApproveAppointmentInvoice(invoice._id)}
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
                            onClick={() => {
                              // Transform appointment invoice to match regular invoice structure for the modal
                              const transformedInvoice = {
                                _id: invoice._id,
                                invoiceNo: invoice.invoiceNumber,
                                patientName: invoice.patientId?.fullName || 'N/A',
                                phone: invoice.patientId?.phone || '',
                                email: invoice.patientId?.email || '',
                                address: invoice.patientId?.address || '',
                                date: invoice.appointmentDetails?.appointmentDate ? new Date(invoice.appointmentDetails.appointmentDate).toLocaleDateString('en-GB') : new Date(invoice.createdAt).toLocaleDateString('en-GB'),
                                total: invoice.amount,
                                status: invoice.status,
                                createdAt: invoice.createdAt,
                                lineItems: [{
                                  description: `${invoice.appointmentDetails?.appointmentType || 'Appointment'} - Dr. ${invoice.doctorId?.fullName || 'N/A'}`,
                                  quantity: 1,
                                  price: invoice.amount,
                                  total: invoice.amount
                                }],
                                discount: 0,
                                tax: 0,
                                shipping: 0,
                                remarks: `Payment Method: ${invoice.paymentMethod === 'cash' ? 'Cash' : invoice.paymentMethod === 'online' ? 'Online' : 'Pending'}\nAppointment Time: ${invoice.appointmentDetails?.appointmentTime || 'N/A'}\nDuration: ${invoice.appointmentDetails?.duration || 30} minutes`
                              };
                              setSelectedInvoice(transformedInvoice);
                              setIsViewModalOpen(true);
                            }}
                            title="View Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeTab === 'teleconsultation' && teleconsultationInvoices.map((invoice) => (
                    <div key={invoice._id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 border-0">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-5 flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{invoice.patientId?.fullName || 'N/A'}</h3>
                            <p className="text-sm text-muted-foreground">
                              #{invoice.invoiceNumber} • Teleconsultation
                            </p>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {invoice.teleconsultationDetails?.scheduledDate ? new Date(invoice.teleconsultationDetails.scheduledDate).toLocaleDateString('en-GB') : 'N/A'}
                              </span>
                              <span className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                Dr. {invoice.doctorId?.fullName || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="col-span-4 text-center">
                          <p className="text-lg font-bold text-foreground">₹{Number(invoice.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'approved' ? 'secondary' : 'outline'} className="mt-1">
                            {invoice.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {invoice.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {invoice.status === 'unapproved' && <Clock className="w-3 h-3 mr-1" />}
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Payment: {invoice.paymentMethod === 'cash' ? 'Cash' : invoice.paymentMethod === 'online' ? 'Online' : 'Pending'}
                          </p>
                        </div>
                        
                        <div className="col-span-3 flex justify-end items-center space-x-2">
                          {invoice.status === 'unapproved' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleApproveTeleconsultationInvoice(invoice._id)}
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
                            onClick={() => {
                              const transformedInvoice = {
                                _id: invoice._id,
                                invoiceNo: invoice.invoiceNumber,
                                patientName: invoice.patientId?.fullName || 'N/A',
                                phone: invoice.patientId?.phone || '',
                                email: invoice.patientId?.email || '',
                                address: invoice.patientId?.address || '',
                                date: invoice.teleconsultationDetails?.scheduledDate ? new Date(invoice.teleconsultationDetails.scheduledDate).toLocaleDateString('en-GB') : new Date(invoice.createdAt).toLocaleDateString('en-GB'),
                                total: invoice.amount,
                                status: invoice.status,
                                createdAt: invoice.createdAt,
                                lineItems: [{
                                  description: `Teleconsultation - Dr. ${invoice.doctorId?.fullName || 'N/A'}`,
                                  quantity: 1,
                                  price: invoice.amount,
                                  total: invoice.amount
                                }],
                                discount: 0,
                                tax: 0,
                                shipping: 0,
                                remarks: `Payment Method: ${invoice.paymentMethod === 'cash' ? 'Cash' : invoice.paymentMethod === 'online' ? 'Online' : 'Pending'}\nScheduled Time: ${invoice.teleconsultationDetails?.scheduledTime || 'N/A'}\nDuration: ${invoice.teleconsultationDetails?.duration || 30} minutes\nMeeting ID: ${invoice.teleconsultationDetails?.meetingId || 'N/A'}\nAppointment Time: ${invoice.appointmentDetails?.appointmentTime || 'N/A'}\nDuration: ${invoice.appointmentDetails?.duration || 30} minutes`
                              };
                              setSelectedInvoice(transformedInvoice);
                              setIsViewModalOpen(true);
                            }}
                            title="View Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
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
        onCopyPaymentLink={handleCopyPaymentLink}
        onSharePaymentLink={handleSharePaymentLink}
        paymentLink={paymentLink}
        loadingPaymentLink={loadingPaymentLink}
      />

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Invoice Created Successfully
            </DialogTitle>
            <DialogDescription>
              Complete payment to approve this invoice
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {createdInvoice && (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Invoice No:</span>
                      <span className="text-sm font-semibold">#{createdInvoice.invoiceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Patient:</span>
                      <span className="text-sm font-semibold">{createdInvoice.patientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Date:</span>
                      <span className="text-sm font-semibold">{createdInvoice.date}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-green-900 dark:text-green-100">
                      Total Amount:
                    </span>
                    <span className="text-2xl font-bold text-green-900 dark:text-green-100">
                      ₹{Number(createdInvoice.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Invoice is in "Unapproved" status. Complete the payment to approve it.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkipInvoicePayment}
              disabled={processingPayment}
            >
              Pay Later
            </Button>
            <Button
              onClick={handleInvoicePayment}
              disabled={processingPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Pay Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
