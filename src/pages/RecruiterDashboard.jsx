import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { TrendingUp, PersonSearch, Group } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import logger from '../utils/logger';

const RecruiterDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [dnrList, setDnrList] = useState([]);
  const [earlyLeaves, setEarlyLeaves] = useState([]);
  const [recruiterStats, setRecruiterStats] = useState([]);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (applicants.length > 0) {
      calculateRecruiterStats();
    }
  }, [calculateRecruiterStats, applicants.length]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load applicants
      const applicantsSnapshot = await getDocs(collection(db, 'applicants'));
      const applicantsData = applicantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load associates
      const associatesSnapshot = await getDocs(collection(db, 'associates'));
      const associatesData = associatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load DNR list
      const dnrSnapshot = await getDocs(collection(db, 'dnrList'));
      const dnrData = dnrSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load early leaves
      const earlyLeavesSnapshot = await getDocs(collection(db, 'earlyLeaves'));
      const earlyLeavesData = earlyLeavesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setApplicants(applicantsData);
      setAssociates(associatesData);
      setDnrList(dnrData);
      setEarlyLeaves(earlyLeavesData);
    } catch (err) {
      logger.error('Error loading data:', err);
      setError('Failed to load recruiter data');
    } finally {
      setLoading(false);
    }
  };

  const filterByDateRange = React.useCallback((date) => {
    if (!date || dateRange === 'all') return true;
    
    const itemDate = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    
    switch (dateRange) {
      case '7days':
        return dayjs(itemDate).isAfter(dayjs(now).subtract(7, 'days'));
      case '30days':
        return dayjs(itemDate).isAfter(dayjs(now).subtract(30, 'days'));
      case '90days':
        return dayjs(itemDate).isAfter(dayjs(now).subtract(90, 'days'));
      default:
        return true;
    }
  }, [dateRange]);

  const calculateRecruiterStats = React.useCallback(() => {
    const recruiterMap = new Map();

    // Filter applicants by date range
    const filteredApplicants = applicants.filter(app => 
      filterByDateRange(app.createdAt || app.appliedDate)
    );

    // Process each applicant
    filteredApplicants.forEach(applicant => {
      const recruiter = applicant.recruiter || 'Unassigned';
      
      if (!recruiterMap.has(recruiter)) {
        recruiterMap.set(recruiter, {
          recruiterName: recruiter,
          totalApplicants: 0,
          started: 0,
          earlyLeaves: 0,
          shortTerm: 0,
          dnr: 0,
          active: 0
        });
      }

      const stats = recruiterMap.get(recruiter);
      stats.totalApplicants++;

      // Check if started
      if (applicant.status === 'Started') {
        stats.started++;
      }

      // Check if in DNR list
      const inDnr = dnrList.some(dnr => 
        dnr.eid === applicant.eid || 
        (dnr.name?.toLowerCase().includes(applicant.firstName?.toLowerCase()) && 
        dnr.name?.toLowerCase().includes(applicant.lastName?.toLowerCase()))
      );
      if (inDnr) {
        stats.dnr++;
      }

      // Check early leaves
      const hasEarlyLeave = earlyLeaves.some(leave => 
        leave.eid === applicant.eid ||
        leave.name?.toLowerCase().includes(applicant.firstName?.toLowerCase())
      );
      if (hasEarlyLeave) {
        stats.earlyLeaves++;
      }
      // Check for short-term (associates who worked 1-4 days)
      const associate = associates.find(a => a.eid === applicant.eid);
      if (associate) {
        const daysWorked = associate.daysWorked || 0;
        if (daysWorked >= 1 && daysWorked <= 4) {
          stats.shortTerm++;
        }
        if (associate.status === 'Active') {
          stats.active++;
        }
      }
    });

    // Convert to array and calculate percentages
    const statsArray = Array.from(recruiterMap.values()).map(stat => ({
      ...stat,
      startRate: stat.totalApplicants > 0 ? ((stat.started / stat.totalApplicants) * 100).toFixed(1) : '0.0',
      earlyLeaveRate: stat.started > 0 ? ((stat.earlyLeaves / stat.started) * 100).toFixed(1) : '0.0',
      shortTermRate: stat.started > 0 ? ((stat.shortTerm / stat.started) * 100).toFixed(1) : '0.0',
      dnrRate: stat.started > 0 ? ((stat.dnr / stat.started) * 100).toFixed(1) : '0.0',
      retentionScore: stat.started > 0 ? (((stat.started - stat.earlyLeaves - stat.shortTerm - stat.dnr) / stat.started) * 100).toFixed(1) : '0.0'
    }));

    // Sort by total applicants
    statsArray.sort((a, b) => b.totalApplicants - a.totalApplicants);
    setRecruiterStats(statsArray);
  }, [applicants, associates, dnrList, earlyLeaves, filterByDateRange]);

  const getRetentionColor = (score) => {
    const numScore = parseFloat(score);
    if (numScore >= 80) return 'success.main';
    if (numScore >= 60) return 'warning.main';
    return 'error.main';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const totalApplicants = recruiterStats.reduce((sum, r) => sum + r.totalApplicants, 0);
  const totalStarted = recruiterStats.reduce((sum, r) => sum + r.started, 0);
  const avgStartRate = totalApplicants > 0 ? ((totalStarted / totalApplicants) * 100).toFixed(1) : '0.0';

  return (
    <Box>
      {/* Date Range Filter */}
      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Date Range</InputLabel>
          <Select
            value={dateRange}
            label="Date Range"
            onChange={(e) => setDateRange(e.target.value)}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="7days">Last 7 Days</MenuItem>
            <MenuItem value="30days">Last 30 Days</MenuItem>
            <MenuItem value="90days">Last 90 Days</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ marginBottom: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <PersonSearch sx={{ marginRight: 1, color: 'primary.main' }} />
                <Typography variant="h6">Total Applicants</Typography>
              </Box>
              <Typography variant="h4">{totalApplicants}</Typography>
              <Typography variant="body2" color="text.secondary">
                Across {recruiterStats.length} recruiters
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <Group sx={{ marginRight: 1, color: 'success.main' }} />
                <Typography variant="h6">Started Working</Typography>
              </Box>
              <Typography variant="h4">{totalStarted}</Typography>
              <Typography variant="body2" color="text.secondary">
                {avgStartRate}% start rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <TrendingUp sx={{ marginRight: 1, color: 'info.main' }} />
                <Typography variant="h6">Active Recruiters</Typography>
              </Box>
              <Typography variant="h4">
                {recruiterStats.filter(r => r.totalApplicants > 0).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                With applicants
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recruiter Performance Table */}
      <Paper sx={{ padding: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recruiter Performance Metrics
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Recruiter</strong></TableCell>
                <TableCell align="right"><strong>Total Apps</strong></TableCell>
                <TableCell align="right"><strong>Started</strong></TableCell>
                <TableCell align="right"><strong>Start Rate</strong></TableCell>
                <TableCell align="right"><strong>Early Leaves</strong></TableCell>
                <TableCell align="right"><strong>Short Term (1-4d)</strong></TableCell>
                <TableCell align="right"><strong>DNR</strong></TableCell>
                <TableCell align="right"><strong>Active Now</strong></TableCell>
                <TableCell align="right"><strong>Retention Score</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recruiterStats.map((recruiter) => (
                <TableRow key={recruiter.recruiterName}>
                  <TableCell>
                    <strong>{recruiter.recruiterName}</strong>
                  </TableCell>
                  <TableCell align="right">{recruiter.totalApplicants}</TableCell>
                  <TableCell align="right">{recruiter.started}</TableCell>
                  <TableCell align="right">{recruiter.startRate}%</TableCell>
                  <TableCell align="right">
                    {recruiter.earlyLeaves} ({recruiter.earlyLeaveRate}%)
                  </TableCell>
                  <TableCell align="right">
                    {recruiter.shortTerm} ({recruiter.shortTermRate}%)
                  </TableCell>
                  <TableCell align="right">
                    {recruiter.dnr} ({recruiter.dnrRate}%)
                  </TableCell>
                  <TableCell align="right">{recruiter.active}</TableCell>
                  <TableCell align="right">
                    <Typography
                      component="span"
                      sx={{ 
                        fontWeight: 'bold',
                        color: getRetentionColor(recruiter.retentionScore)
                      }}
                    >
                      {recruiter.retentionScore}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {recruiterStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No recruiter data available
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Legend */}
      <Paper sx={{ padding: 2, marginTop: 2, backgroundColor: '#f5f5f5' }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>Metrics Explained:</strong>
        </Typography>
        <Typography variant="body2" component="div">
          • <strong>Start Rate:</strong> Percentage of applicants who started working<br />
          • <strong>Early Leaves:</strong> Associates who left early (tracked in early leaves system)<br />
          • <strong>Short Term:</strong> Associates who worked only 1-4 days<br />
          • <strong>DNR:</strong> Associates added to Do Not Return list<br />
          • <strong>Retention Score:</strong> Quality metric = (Started - Early Leaves - Short Term - DNR) / Started × 100
        </Typography>
      </Paper>
    </Box>
  );
};

export default RecruiterDashboard;
