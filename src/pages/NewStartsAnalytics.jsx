import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Timeline, TrendingUp, Group, EventAvailable } from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

const NewStartsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load applicants who started
      const applicantsSnap = await getDocs(
        query(collection(db, 'applicants'), where('status', '==', 'Started'))
      );
      const applicantsData = applicantsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        processDate: doc.data().processDate?.toDate(),
        tentativeStartDate: doc.data().tentativeStartDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Load associates
      const associatesSnap = await getDocs(collection(db, 'associates'));
      const associatesData = associatesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        lastWorkedDate: doc.data().lastWorkedDate?.toDate()
      }));

      setApplicants(applicantsData);
      setAssociates(associatesData);
      
      calculateMetrics(applicantsData, associatesData);
    } catch (err) {
      console.error('Error loading new starts data:', err);
      setError('Failed to load new starts analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (applicantsData, associatesData) => {
    const metrics = {
      avgProcessToStart: 0,
      secondDayReturnRate: 0,
      secondWeekReturnRate: 0,
      totalStarts: applicantsData.length,
      activeAfter2Days: 0,
      activeAfter2Weeks: 0,
      processTimeDistribution: {}
    };

    let totalProcessTime = 0;
    let validProcessCount = 0;
    let secondDayReturns = 0;
    let secondDayEligible = 0;
    let secondWeekReturns = 0;
    let secondWeekEligible = 0;

    applicantsData.forEach(applicant => {
      // Calculate process to start time
      if (applicant.processDate && applicant.tentativeStartDate) {
        const processTime = dayjs(applicant.tentativeStartDate).diff(dayjs(applicant.processDate), 'day');
        if (processTime >= 0 && processTime < 90) {
          totalProcessTime += processTime;
          validProcessCount++;

          // Distribution
          const bucket = Math.floor(processTime / 7) * 7;
          metrics.processTimeDistribution[bucket] = (metrics.processTimeDistribution[bucket] || 0) + 1;
        }
      }

      // Find matching associate
      const associate = associatesData.find(a => a.eid === applicant.eid);
      if (associate && associate.startDate) {
        const daysSinceStart = dayjs().diff(dayjs(associate.startDate), 'day');

        // 2nd day return rate
        if (daysSinceStart >= 2) {
          secondDayEligible++;
          if (associate.daysWorked >= 2 || associate.status === 'Active') {
            secondDayReturns++;
            metrics.activeAfter2Days++;
          }
        }

        // 2nd week return rate
        if (daysSinceStart >= 14) {
          secondWeekEligible++;
          if (associate.daysWorked >= 10 || (associate.status === 'Active' && daysSinceStart >= 14)) {
            secondWeekReturns++;
            metrics.activeAfter2Weeks++;
          }
        }
      }
    });

    metrics.avgProcessToStart = validProcessCount > 0 ? (totalProcessTime / validProcessCount).toFixed(1) : 0;
    metrics.secondDayReturnRate = secondDayEligible > 0 ? ((secondDayReturns / secondDayEligible) * 100).toFixed(1) : 0;
    metrics.secondWeekReturnRate = secondWeekEligible > 0 ? ((secondWeekReturns / secondWeekEligible) * 100).toFixed(1) : 0;
    metrics.secondDayEligible = secondDayEligible;
    metrics.secondWeekEligible = secondWeekEligible;

    setMetrics(metrics);
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

  if (!metrics) {
    return <Alert severity="info">No new starts data available</Alert>;
  }

  // Chart for process time distribution
  const distributionLabels = Object.keys(metrics.processTimeDistribution).sort((a, b) => parseInt(a) - parseInt(b));
  const chartData = {
    labels: distributionLabels.map(d => parseInt(d) + '-' + (parseInt(d) + 6) + ' days'),
    datasets: [
      {
        label: 'Number of Applicants',
        data: distributionLabels.map(d => metrics.processTimeDistribution[d]),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      }
    ]
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ marginBottom: 3 }}>
        New Starts Analytics
      </Typography>

      <Grid container spacing={3} sx={{ marginBottom: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <Timeline sx={{ marginRight: 1, color: 'primary.main' }} />
                <Typography variant="h6">Avg Process Time</Typography>
              </Box>
              <Typography variant="h4">{metrics.avgProcessToStart}</Typography>
              <Typography variant="body2" color="text.secondary">
                Days from process to start
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <TrendingUp sx={{ marginRight: 1, color: 'success.main' }} />
                <Typography variant="h6">2nd Day Return</Typography>
              </Box>
              <Typography variant="h4">{metrics.secondDayReturnRate}%</Typography>
              <Typography variant="body2" color="text.secondary">
                {metrics.activeAfter2Days} of {metrics.secondDayEligible} eligible
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <EventAvailable sx={{ marginRight: 1, color: 'info.main' }} />
                <Typography variant="h6">2nd Week Return</Typography>
              </Box>
              <Typography variant="h4">{metrics.secondWeekReturnRate}%</Typography>
              <Typography variant="body2" color="text.secondary">
                {metrics.activeAfter2Weeks} of {metrics.secondWeekEligible} eligible
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <Group sx={{ marginRight: 1, color: 'warning.main' }} />
                <Typography variant="h6">Total Starts</Typography>
              </Box>
              <Typography variant="h4">{metrics.totalStarts}</Typography>
              <Typography variant="body2" color="text.secondary">
                All time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom>
          Process-to-Start Time Distribution
        </Typography>
        <Bar data={chartData} options={{ responsive: true }} />
      </Paper>

      <Paper sx={{ padding: 3 }}>
        <Typography variant="h6" gutterBottom>
          Retention Metrics Explained
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Metric</strong></TableCell>
                <TableCell><strong>Definition</strong></TableCell>
                <TableCell align="right"><strong>Current Value</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Avg Process Time</TableCell>
                <TableCell>Average days between processing applicant and their start date</TableCell>
                <TableCell align="right">{metrics.avgProcessToStart} days</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2nd Day Return Rate</TableCell>
                <TableCell>Percentage of new starts who return for day 2</TableCell>
                <TableCell align="right">{metrics.secondDayReturnRate}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2nd Week Return Rate</TableCell>
                <TableCell>Percentage of new starts who complete 2 full weeks</TableCell>
                <TableCell align="right">{metrics.secondWeekReturnRate}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total Starts</TableCell>
                <TableCell>Total number of applicants who started working</TableCell>
                <TableCell align="right">{metrics.totalStarts}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default NewStartsAnalytics;
