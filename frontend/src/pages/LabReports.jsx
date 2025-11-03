import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Plus,
  Search,
  Calendar,
  User,
  Check,
  ChevronsUpDown,
  AlertCircle,
  FileCheck,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { patientAPI } from "@/services/api";
import { cn } from "@/lib/utils";
import { config } from "@/config/env";
import sessionManager from "@/utils/sessionManager";

const LabReports = () => {
  const { toast } = useToast();
  const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';
  const [patients, setPatients] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportPreviewUrl, setReportPreviewUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  
  const [uploadForm, setUploadForm] = useState({
    testName: "",
    testDate: new Date().toISOString().split('T')[0],
    labName: "",
    notes: "",
    file: null
  });

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatients.length > 0) {
      loadLabReportsForMultiplePatients();
    } else {
      setLabReports([]);
    }
  }, [selectedPatients]);

  const loadPatients = async () => {
    try {
      const response = await patientAPI.getAll(1, 100, { status: 'Active' });
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Failed to load patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    }
  };

  const loadLabReports = async (patientId) => {
    setLoading(true);
    try {
      const token = await sessionManager.getToken();
      const response = await fetch(`${API_BASE_URL}/lab-reports/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load lab reports');
      
      const data = await response.json();
      setLabReports(data.reports || []);
    } catch (error) {
      console.error('Failed to load lab reports:', error);
      toast({
        title: "Error",
        description: "Failed to load lab reports",
        variant: "destructive",
      });
      setLabReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLabReportsForMultiplePatients = async () => {
    setLoading(true);
    try {
      const token = await sessionManager.getToken();
      
      // Fetch reports for all selected patients
      const reportPromises = selectedPatients.map(patient =>
        fetch(`${API_BASE_URL}/lab-reports/patient/${patient._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then(res => res.json())
      );
      
      const results = await Promise.all(reportPromises);
      
      // Combine all reports and add patient info to each report
      const allReports = results.flatMap((data, index) => {
        const reports = data.reports || [];
        return reports.map(report => ({
          ...report,
          patientInfo: selectedPatients[index]
        }));
      });
      
      // Sort by test date (most recent first)
      allReports.sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
      
      setLabReports(allReports);
    } catch (error) {
      console.error('Failed to load lab reports:', error);
      toast({
        title: "Error",
        description: "Failed to load lab reports",
        variant: "destructive",
      });
      setLabReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload PDF, JPG, or PNG files only",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUploadReport = async () => {
    if (selectedPatients.length === 0) {
      toast({
        title: "No Patient Selected",
        description: "Please select at least one patient first",
        variant: "destructive",
      });
      return;
    }

    if (selectedPatients.length > 1) {
      toast({
        title: "Multiple Patients Selected",
        description: "Please select only one patient to upload a report",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = selectedPatients[0];

    if (!uploadForm.testName || !uploadForm.testDate || !uploadForm.file) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('patientId', selectedPatient._id);
      formData.append('testName', uploadForm.testName);
      formData.append('testDate', uploadForm.testDate);
      formData.append('labName', uploadForm.labName);
      formData.append('notes', uploadForm.notes);
      formData.append('file', uploadForm.file);

      const token = await sessionManager.getToken();
      const response = await fetch(`${API_BASE_URL}/lab-reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload lab report');

      toast({
        title: "Success",
        description: "Lab report uploaded successfully",
      });

      setIsUploadModalOpen(false);
      setUploadForm({
        testName: "",
        testDate: new Date().toISOString().split('T')[0],
        labName: "",
        notes: "",
        file: null
      });
      
      loadLabReportsForMultiplePatients();
    } catch (error) {
      console.error('Failed to upload lab report:', error);
      toast({
        title: "Error",
        description: "Failed to upload lab report",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      const token = await sessionManager.getToken();
      const response = await fetch(`${API_BASE_URL}/lab-reports/${report._id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.fileName || 'lab-report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error) {
      console.error('Failed to download report:', error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const handleViewReport = async (report) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
    setLoadingPreview(true);
    
    try {
      // Use the Cloudinary URL directly from filePath
      if (report.filePath) {
        setReportPreviewUrl(report.filePath);
      }
    } catch (error) {
      console.error('Failed to load report preview:', error);
      toast({
        title: "Error",
        description: "Failed to load report preview",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;

    try {
      const token = await sessionManager.getToken();
      const response = await fetch(`${API_BASE_URL}/lab-reports/${reportToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete report');

      toast({
        title: "Success",
        description: "Lab report deleted successfully",
      });

      loadLabReportsForMultiplePatients();
      setIsDeleteDialogOpen(false);
      setReportToDelete(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lab Reports</h1>
          <p className="text-muted-foreground">Upload and manage patient lab test results</p>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          disabled={selectedPatients.length === 0}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Report
        </Button>
      </div>

      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Patients</CardTitle>
          <CardDescription>Choose one or more patients to view and manage their lab reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientComboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedPatients.length > 0 
                      ? `${selectedPatients.length} patient${selectedPatients.length > 1 ? 's' : ''} selected` 
                      : "Select patients..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search patients..." 
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>No patient found.</CommandEmpty>
                      <CommandGroup>
                        {filteredPatients.map((patient) => {
                          const isSelected = selectedPatients.some(p => p._id === patient._id);
                          return (
                            <CommandItem
                              key={patient._id}
                              value={`${patient.fullName} ${patient.phone} ${patient.email || ''}`}
                              onSelect={() => {
                                if (isSelected) {
                                  setSelectedPatients(selectedPatients.filter(p => p._id !== patient._id));
                                } else {
                                  setSelectedPatients([...selectedPatients, patient]);
                                }
                                setSearchTerm("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{patient.fullName}</span>
                                <span className="text-sm text-muted-foreground">
                                  {patient.age || 0}y • {patient.gender || 'Unknown'} • {patient.phone}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {selectedPatients.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPatients([]);
                  setLabReports([]);
                }}
              >
                Clear All
              </Button>
            )}
          </div>

          {selectedPatients.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Selected Patients:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedPatients.map((patient) => (
                  <Badge
                    key={patient._id}
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1.5"
                  >
                    <User className="w-3 h-3" />
                    <span>{patient.fullName}</span>
                    <button
                      onClick={() => {
                        setSelectedPatients(selectedPatients.filter(p => p._id !== patient._id));
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Reports List */}
      {selectedPatients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lab Reports</CardTitle>
            <CardDescription>
              {labReports.length} report{labReports.length !== 1 ? 's' : ''} found for {selectedPatients.length} patient{selectedPatients.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : labReports.length > 0 ? (
              <div className="space-y-4">
                {labReports.map((report) => (
                  <div
                    key={report._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{report.testName}</h4>
                          {selectedPatients.length > 1 && report.patientInfo && (
                            <Badge variant="outline" className="text-xs">
                              {report.patientInfo.fullName}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(report.testDate).toLocaleDateString('en-GB')}</span>
                          </div>
                          {report.labName && (
                            <div className="flex items-center gap-1">
                              <FileCheck className="w-3 h-3" />
                              <span>{report.labName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Uploaded {new Date(report.uploadedAt).toLocaleDateString('en-GB')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                        title="View Report"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReport(report)}
                        title="Download Report"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(report)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No lab reports found for this patient</p>
                <p className="text-sm">Upload a report to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Lab Report</DialogTitle>
            <DialogDescription>
              Upload lab test results for {selectedPatients.length === 1 ? selectedPatients[0]?.fullName : `${selectedPatients.length} patients`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testName">Test Name *</Label>
                <Input
                  id="testName"
                  value={uploadForm.testName}
                  onChange={(e) => setUploadForm({ ...uploadForm, testName: e.target.value })}
                  placeholder="e.g., Complete Blood Count"
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testDate">Test Date *</Label>
                <Input
                  id="testDate"
                  type="date"
                  value={uploadForm.testDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, testDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="labName">Lab Name</Label>
              <Input
                id="labName"
                value={uploadForm.labName}
                onChange={(e) => setUploadForm({ ...uploadForm, labName: e.target.value })}
                placeholder="e.g., City Diagnostics"
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                placeholder="Additional notes or observations..."
                rows={3}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Upload File * (PDF, JPG, PNG - Max 5MB)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploadForm.file && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileCheck className="w-3 h-3" />
                    {uploadForm.file.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadForm({
                  testName: "",
                  testDate: new Date().toISOString().split('T')[0],
                  labName: "",
                  notes: "",
                  file: null
                });
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUploadReport} disabled={uploading}>
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Report Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={(open) => {
        setIsViewModalOpen(open);
        if (!open) {
          setReportPreviewUrl(null);
          setLoadingPreview(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Lab Report Details</DialogTitle>
            <DialogDescription>
              {selectedReport?.testName} - {selectedReport?.patientInfo?.fullName || (selectedPatients.length === 1 ? selectedPatients[0]?.fullName : 'Patient')}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Test Name</Label>
                  <p className="text-sm font-medium">{selectedReport.testName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Test Date</Label>
                  <p className="text-sm">{new Date(selectedReport.testDate).toLocaleDateString('en-GB')}</p>
                </div>
                {selectedReport.labName && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Lab Name</Label>
                    <p className="text-sm">{selectedReport.labName}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Uploaded Date</Label>
                  <p className="text-sm">{new Date(selectedReport.uploadedAt).toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              {selectedReport.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedReport.notes}</p>
                </div>
              )}

              {/* File Preview Section */}
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                {loadingPreview ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : reportPreviewUrl ? (
                  <div className="space-y-4">
                    {/* Check if it's an image or PDF */}
                    {selectedReport.fileType?.startsWith('image/') ? (
                      <div className="relative w-full bg-white p-4">
                        <img
                          src={reportPreviewUrl}
                          alt={selectedReport.testName}
                          className="w-full h-auto object-contain"
                          onError={(e) => {
                            console.error('Image failed to load');
                            e.target.style.display = 'none';
                            toast({
                              title: "Error",
                              description: "Failed to load image preview",
                              variant: "destructive",
                            });
                          }}
                        />
                      </div>
                    ) : selectedReport.fileType === 'application/pdf' ? (
                      <div className="p-8 text-center space-y-4">
                        <FileText className="w-16 h-16 mx-auto text-blue-600" />
                        <div>
                          <p className="font-medium text-lg">PDF Document</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            PDF preview is not available. Please download the file to view it.
                          </p>
                        </div>
                        <Button
                          onClick={() => handleDownloadReport(selectedReport)}
                          className="mt-4"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-4">Preview not available</p>
                      </div>
                    )}
                    
                    {/* File Info */}
                    <div className="p-4 bg-background border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">{selectedReport.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedReport.fileSize ? `${(selectedReport.fileSize / 1024).toFixed(2)} KB` : 'Unknown size'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(selectedReport)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">No preview available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lab report?
              {reportToDelete && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="font-medium text-foreground">{reportToDelete.testName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Test Date: {new Date(reportToDelete.testDate).toLocaleDateString('en-GB')}
                  </p>
                  {reportToDelete.labName && (
                    <p className="text-sm text-muted-foreground">
                      Lab: {reportToDelete.labName}
                    </p>
                  )}
                </div>
              )}
              <p className="mt-3 text-destructive font-medium">
                This action cannot be undone. The report file will be permanently deleted.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setReportToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LabReports;
