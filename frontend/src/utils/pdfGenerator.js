import jsPDF from 'jspdf';

export const generateReferralPDF = (referral, type = 'outbound') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 30;

  // Helper function to add text with word wrapping
  const addText = (text, x, y, maxWidth = pageWidth - 2 * margin, fontSize = 12) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * fontSize * 0.4);
  };

  // Helper function to add a section header
  const addSectionHeader = (title, y) => {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin, y);
    doc.setFont(undefined, 'normal');
    return y + 10;
  };

  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Medical Referral Document', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Referral Type Badge
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  const referralTypeText = type === 'outbound' ? 'OUTBOUND REFERRAL' : 'INBOUND REFERRAL';
  doc.text(referralTypeText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Referral ID and Date
  yPosition = addSectionHeader('Referral Information', yPosition);
  yPosition = addText(`Referral ID: ${referral.id || referral._id || 'N/A'}`, margin, yPosition) + 5;
  yPosition = addText(`Date Created: ${new Date().toLocaleDateString()}`, margin, yPosition) + 5;
  yPosition = addText(`Status: ${referral.status || 'N/A'}`, margin, yPosition) + 5;
  yPosition = addText(`Priority: ${referral.urgency || 'N/A'}`, margin, yPosition) + 15;

  // Patient Information
  yPosition = addSectionHeader('Patient Information', yPosition);
  yPosition = addText(`Patient Name: ${referral.patientName || 'N/A'}`, margin, yPosition) + 5;
  yPosition = addText(`Preferred Date: ${referral.preferredDate || 'N/A'}`, margin, yPosition) + 15;

  // Referral Details
  if (type === 'outbound') {
    yPosition = addSectionHeader('Referral To (Outbound)', yPosition);
    yPosition = addText(`Specialist: ${referral.specialistName || 'N/A'}`, margin, yPosition) + 5;
    yPosition = addText(`Specialty: ${referral.specialty || 'N/A'}`, margin, yPosition) + 5;
    yPosition = addText(`External Clinic: ${referral.externalClinic || 'N/A'}`, margin, yPosition) + 15;
  } else {
    yPosition = addSectionHeader('Referral From (Inbound)', yPosition);
    yPosition = addText(`Referring Doctor: ${referral.specialistName || 'N/A'}`, margin, yPosition) + 5;
    yPosition = addText(`Specialty: ${referral.specialty || 'N/A'}`, margin, yPosition) + 5;
    yPosition = addText(`Hospital/Clinic: ${referral.hospital || 'N/A'}`, margin, yPosition) + 15;
  }

  // Clinical Information
  yPosition = addSectionHeader('Clinical Information', yPosition);
  yPosition = addText(`Reason for Referral: ${referral.reason || 'N/A'}`, margin, yPosition) + 10;
  
  if (referral.notes) {
    yPosition = addText('Additional Notes:', margin, yPosition, pageWidth - 2 * margin, 12) + 5;
    yPosition = addText(referral.notes, margin, yPosition, pageWidth - 2 * margin, 10) + 15;
  }

  // Medical History (if available)
  if (referral.medicalHistory) {
    yPosition = addSectionHeader('Medical History', yPosition);
    yPosition = addText(referral.medicalHistory, margin, yPosition, pageWidth - 2 * margin, 10) + 15;
  }

  // Current Medications (if available)
  if (referral.medications && referral.medications.length > 0) {
    yPosition = addSectionHeader('Current Medications', yPosition);
    referral.medications.forEach((med, index) => {
      yPosition = addText(`${index + 1}. ${med.name || med} - ${med.dosage || 'N/A'}`, margin, yPosition) + 3;
    });
    yPosition += 10;
  }

  // Attachments (if available)
  if (referral.attachments && referral.attachments.length > 0) {
    yPosition = addSectionHeader('Attachments', yPosition);
    referral.attachments.forEach((attachment, index) => {
      yPosition = addText(`${index + 1}. ${attachment.name || attachment}`, margin, yPosition) + 3;
    });
    yPosition += 10;
  }

  // Contact Information
  yPosition = addSectionHeader('Contact Information', yPosition);
  yPosition = addText('Referring Physician: Dr. Johnson', margin, yPosition) + 5;
  yPosition = addText('Phone: (555) 123-4567', margin, yPosition) + 5;
  yPosition = addText('Email: dr.johnson@healthcare.com', margin, yPosition) + 15;

  // Footer
  const footerY = doc.internal.pageSize.height - 30;
  doc.setFontSize(8);
  doc.setFont(undefined, 'italic');
  doc.text('This document contains confidential medical information.', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Please handle according to HIPAA guidelines.', pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 16, { align: 'center' });

  // Generate filename
  const patientName = (referral.patientName || 'Unknown').replace(/\s+/g, '_');
  const referralId = referral.id || referral._id || 'Unknown';
  const filename = `${type}_referral_${patientName}_${referralId}.pdf`;

  // Download the PDF
  doc.save(filename);
};

export const generateDetailedReferralPDF = (referral, type = 'outbound', additionalData = {}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 30;

  // Helper functions (same as above)
  const addText = (text, x, y, maxWidth = pageWidth - 2 * margin, fontSize = 12) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * fontSize * 0.4);
  };

  const addSectionHeader = (title, y) => {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin, y);
    doc.setFont(undefined, 'normal');
    return y + 10;
  };

  // Enhanced header with logo placeholder
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Healthcare Consultant System', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(16);
  doc.text('Medical Referral Document', margin, yPosition);
  yPosition += 20;

  // Referral summary box
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 25);
  yPosition += 8;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`${type.toUpperCase()} REFERRAL`, margin + 5, yPosition);
  yPosition += 6;
  doc.setFont(undefined, 'normal');
  doc.text(`Patient: ${referral.patientName || 'N/A'}`, margin + 5, yPosition);
  doc.text(`Priority: ${referral.urgency || 'N/A'}`, pageWidth - margin - 50, yPosition);
  yPosition += 6;
  doc.text(`Status: ${referral.status || 'N/A'}`, margin + 5, yPosition);
  doc.text(`Date: ${referral.preferredDate || new Date().toLocaleDateString()}`, pageWidth - margin - 50, yPosition);
  yPosition += 20;

  // Detailed sections
  yPosition = addSectionHeader('Patient Demographics', yPosition);
  yPosition = addText(`Full Name: ${referral.patientName || 'N/A'}`, margin, yPosition) + 5;
  yPosition = addText(`Date of Birth: ${additionalData.dateOfBirth || 'N/A'}`, margin, yPosition) + 5;
  yPosition = addText(`Gender: ${additionalData.gender || 'N/A'}`, margin, yPosition) + 5;
  yPosition = addText(`Phone: ${additionalData.phone || 'N/A'}`, margin, yPosition) + 5;
  yPosition = addText(`Address: ${additionalData.address || 'N/A'}`, margin, yPosition) + 15;

  // Insurance Information
  if (additionalData.insurance) {
    yPosition = addSectionHeader('Insurance Information', yPosition);
    yPosition = addText(`Insurance Provider: ${additionalData.insurance.provider || 'N/A'}`, margin, yPosition) + 5;
    yPosition = addText(`Policy Number: ${additionalData.insurance.policyNumber || 'N/A'}`, margin, yPosition) + 5;
    yPosition = addText(`Group Number: ${additionalData.insurance.groupNumber || 'N/A'}`, margin, yPosition) + 15;
  }

  // Continue with clinical information as in the basic version
  yPosition = addSectionHeader('Clinical Information', yPosition);
  yPosition = addText(`Chief Complaint: ${referral.reason || 'N/A'}`, margin, yPosition) + 10;
  
  if (referral.notes) {
    yPosition = addText('Clinical Notes:', margin, yPosition) + 5;
    yPosition = addText(referral.notes, margin, yPosition, pageWidth - 2 * margin, 10) + 15;
  }

  // Add signature section
  yPosition += 20;
  yPosition = addSectionHeader('Physician Signature', yPosition);
  yPosition += 20;
  doc.text('_________________________', margin, yPosition);
  yPosition += 8;
  doc.text('Dr. Johnson, MD', margin, yPosition);
  yPosition += 5;
  doc.text('Date: _______________', margin, yPosition);

  // Footer (same as basic version)
  const footerY = doc.internal.pageSize.height - 30;
  doc.setFontSize(8);
  doc.setFont(undefined, 'italic');
  doc.text('This document contains confidential medical information.', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Please handle according to HIPAA guidelines.', pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 16, { align: 'center' });

  // Generate filename
  const patientName = (referral.patientName || 'Unknown').replace(/\s+/g, '_');
  const referralId = referral.id || referral._id || 'Unknown';
  const filename = `detailed_${type}_referral_${patientName}_${referralId}.pdf`;

  // Download the PDF
  doc.save(filename);
};
