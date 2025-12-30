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
import logger from '../utils/logger';

const NewStartsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [associates, setAssociates] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [newStartsSummary, setNewStartsSummary] = useState(null);

  const loadData = React.useCallback(async () => {
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

      // Cross-source new starts reconciliation for debugging
      try {
        const mod = await import('../services/firestoreService');
        if (mod.getNewStartsSummary) {
          const ns = await mod.getNewStartsSummary(dayjs().subtract(90, 'day').toDate(), new Date());
          if (ns.success) setNewStartsSummary(ns.data);
        }
      } catch (err) {
        logger.error('Failed to get new starts summary:', err);
      }
      
      calculateMetrics(applicantsData, associatesData);
    } catch (err) {
      logger.error('Error loading new starts data:', err);
      setError('Failed to load new starts analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const calculateMetrics = (applicantsData, associatesData) => {
    const metrics = {
      avgProcessToStart: 0,
      secondDayReturnRate: 0,
      secondWeekReturnRate: 0,
      totalStarts: applicantsData.length,
      activeAfter2Days: 0,
      activeAfter2Weeks: 0,
      processTimeDistribution: {},
      missingProcessDates: 0,
      missingTentativeStartDates: 0,
      matchedAssociates: 0
    };

    let totalProcessTime = 0;
    let validProcessCount = 0;
    let secondDayReturns = 0;
    let secondDayEligible = 0;
    let secondWeekReturns = 0;
    let secondWeekEligible = 0;

    applicantsData.forEach(applicant => {
      // Track missing dates for debugging
      if (!applicant.processDate) metrics.missingProcessDates++;
      if (!applicant.tentativeStartDate) metrics.missingTentativeStartDates++;

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
      if (associate) {
        metrics.matchedAssociates++;

        if (associate.startDate) {
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
      }
    });

    metrics.avgProcessToStart = validProcessCount > 0 ? (totalProcessTime / validProcessCount).toFixed(1) : 0;
    metrics.secondDayReturnRate = secondDayEligible > 0 ? ((secondDayReturns / secondDayEligible) * 100).toFixed(1) : 0;
    metrics.secondWeekReturnRate = secondWeekEligible > 0 ? ((secondWeekReturns / secondWeekEligible) * 100).toFixed(1) : 0;
    metrics.secondDayEligible = secondDayEligible;
    metrics.secondWeekEligible = secondWeekEligible;

    logger.debug('New Starts Debug:', {
      totalApplicants: applicantsData.length,
      missingProcessDates: metrics.missingProcessDates,
      missingTentativeStartDates: metrics.missingTentativeStartDates,
      validProcessCount,
      matchedAssociates: metrics.matchedAssociates,
      totalAssociates: associatesData.length
    });

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

      {/* Debug: List of Started Applicants */}
      <Paper sx={{ padding: 3, marginTop: 3 }}>
        <Typography variant="h6" gutterBottom>
          Started Applicants ({applicants.length})
        </Typography>

        {/* New starts reconciliation debug */}
        {newStartsSummary && (
          <Box sx={{ marginBottom: 2 }}>
            <Alert severity="info">
              <strong>New Starts Reconciliation (last 90 days):</strong>
              <div>Applicants started: <strong>{newStartsSummary.applicantsCount}</strong></div>
              <div>Shift new starts (total array items): <strong>{newStartsSummary.shiftCount}</strong></div>
              <div>Shift unique EIDs: <strong>{newStartsSummary.shiftUniqueCount}</strong></div>
              <div>On-premise reported new starts: <strong>{newStartsSummary.onPremCount}</strong></div>
              <div>Authoritative count chosen: <strong>{newStartsSummary.chosenCount}</strong> (source: {newStartsSummary.chosenBy})</div>
              {/* Per-shift breakdown */}
              {newStartsSummary.perShift && Object.keys(newStartsSummary.perShift).map(shiftKey => (
                <div key={shiftKey}>
                  <strong>{shiftKey}:</strong> {newStartsSummary.perShift[shiftKey].shiftCount} new starts, unique: {newStartsSummary.perShift[shiftKey].uniqueCount}
                </div>
              ))}
            </Alert>
          </Box>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>EID</strong></TableCell>
                <TableCell><strong>Process Date</strong></TableCell>
                <TableCell><strong>Tentative Start</strong></TableCell>
                <TableCell><strong>Days to Start</strong></TableCell>
                <TableCell><strong>In Associates?</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applicants.map((app, index) => {
                const processTime = app.processDate && app.tentativeStartDate
                  ? dayjs(app.tentativeStartDate).diff(dayjs(app.processDate), 'day')
                  : null;
                const hasAssociate = associates.some(a => a.eid === app.eid);

                return (
                  <TableRow key={index}>
                    <TableCell>{app.firstName} {app.lastName || app.name}</TableCell>
                    <TableCell>{app.eid || app.crmNumber || '-'}</TableCell>
                    <TableCell>
                      {app.processDate ? dayjs(app.processDate).format('MMM DD, YYYY') :
                        <span style={{ color: 'red' }}>Missing</span>}
                    </TableCell>
                    <TableCell>
                      {app.tentativeStartDate ? dayjs(app.tentativeStartDate).format('MMM DD, YYYY') :
                        <span style={{ color: 'red' }}>Missing</span>}
                    </TableCell>
                    <TableCell>{processTime !== null ? processTime + ' days' : '-'}</TableCell>
                    <TableCell>{hasAssociate ? '✅' : '❌'}</TableCell>
                  </TableRow>
                );
              })}
              {applicants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No applicants with status "Started"
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Why metrics show 0:</strong><br/>
          • <strong>Avg Process Time:</strong> Requires both "Process Date" and "Tentative Start Date" fields<br/>
          • <strong>2nd Day/Week Return:</strong> Requires matching record in Associates collection with startDate field<br/>
          • To fix: Edit applicants and fill in missing dates, or upload associates data
        </Alert>
      </Paper>
    </Box>
  );
};

export default NewStartsAnalytics;
