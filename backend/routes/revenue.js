const express = require('express');
const mongoose = require('mongoose');
const Revenue = require('../models/Revenue');
const auth = require('../middleware/auth');
const router = express.Router();

// Helper function to get user's clinic ID
const getUserClinicId = async (user) => {
  if (!user) return null;
  
  if (user.role === 'doctor') {
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findById(user.id);
    return doctor?.clinicId || null;
  } else if (['nurse', 'head_nurse', 'supervisor'].includes(user.role)) {
    const Nurse = require('../models/Nurse');
    const nurse = await Nurse.findById(user.id);
    return nurse?.clinicId || null;
  } else if (user.role === 'clinic') {
    return user.id; // Clinic admin's ID is the clinic ID
  }
  
  return null;
};

// GET /api/revenue/current-month - Get current month revenue
router.get('/current-month', auth, async (req, res) => {
  try {
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view revenue.' 
      });
    }

    const currentMonthData = await Revenue.getCurrentMonthRevenue(userClinicId);
    const previousMonthRevenue = await Revenue.getPreviousMonthRevenue(userClinicId);

    // Calculate percentage change
    let percentageChange = 0;
    if (previousMonthRevenue > 0) {
      percentageChange = ((currentMonthData.totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
    } else if (currentMonthData.totalRevenue > 0) {
      percentageChange = 100;
    }

    res.json({
      currentMonthRevenue: currentMonthData.totalRevenue,
      previousMonthRevenue: previousMonthRevenue,
      percentageChange: Math.round(percentageChange * 10) / 10,
      invoiceCount: currentMonthData.invoiceCount,
      month: currentMonthData.month
    });
  } catch (error) {
    console.error('Error fetching current month revenue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/revenue/yearly/:year? - Get yearly revenue breakdown
router.get('/yearly/:year?', auth, async (req, res) => {
  try {
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view revenue.' 
      });
    }

    const year = req.params.year ? parseInt(req.params.year) : new Date().getFullYear();
    const monthlyRevenue = await Revenue.getYearlyRevenue(userClinicId, year);

    // Calculate totals
    const totalRevenue = monthlyRevenue.reduce((sum, month) => sum + month.totalRevenue, 0);
    const totalInvoices = monthlyRevenue.reduce((sum, month) => sum + month.invoiceCount, 0);

    res.json({
      year,
      totalRevenue,
      totalInvoices,
      monthlyBreakdown: monthlyRevenue
    });
  } catch (error) {
    console.error('Error fetching yearly revenue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/revenue/summary - Get revenue summary
router.get('/summary', auth, async (req, res) => {
  try {
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view revenue.' 
      });
    }

    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Revenue.getYearlyRevenue(userClinicId, currentYear);

    // Calculate totals
    const totalRevenue = monthlyRevenue.reduce((sum, month) => sum + month.totalRevenue, 0);
    const totalInvoices = monthlyRevenue.reduce((sum, month) => sum + month.invoiceCount, 0);

    // Get current month data
    const currentMonthData = await Revenue.getCurrentMonthRevenue(userClinicId);

    res.json({
      totalRevenue,
      totalInvoices,
      currentMonthRevenue: currentMonthData.totalRevenue,
      currentMonthInvoices: currentMonthData.invoiceCount,
      monthlyRevenue: monthlyRevenue.map(month => ({
        _id: month.month,
        total: month.totalRevenue,
        count: month.invoiceCount
      }))
    });
  } catch (error) {
    console.error('Error fetching revenue summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/revenue/audit/:year/:month - Get revenue audit trail for specific month
router.get('/audit/:year/:month', auth, async (req, res) => {
  try {
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view revenue.' 
      });
    }

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const revenueRecord = await Revenue.findOne({ 
      clinicId: userClinicId, 
      year, 
      month 
    }).populate('invoiceEntries.invoiceId', 'invoiceNo patientName total');

    if (!revenueRecord) {
      return res.json({
        year,
        month,
        totalRevenue: 0,
        invoiceCount: 0,
        entries: []
      });
    }

    res.json({
      year,
      month,
      totalRevenue: revenueRecord.totalRevenue,
      invoiceCount: revenueRecord.invoiceCount,
      lastUpdated: revenueRecord.lastUpdated,
      entries: revenueRecord.invoiceEntries.map(entry => ({
        invoiceId: entry.invoiceId._id,
        invoiceNo: entry.invoiceId.invoiceNo,
        patientName: entry.invoiceId.patientName,
        amount: entry.amount,
        action: entry.action,
        reason: entry.reason,
        timestamp: entry.timestamp
      }))
    });
  } catch (error) {
    console.error('Error fetching revenue audit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
