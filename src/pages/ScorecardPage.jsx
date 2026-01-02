import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  LinearProgress
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { getShiftData, getAggregateHours, getRecruiterData, getEarlyLeaveTrends, getNewStartsSummary } from '../services/firestoreService';
import logger from '../utils/logger';

const ScorecardPage = () => {
  const [startDate, setStartDate] = useState(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState(dayjs());
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [newStartsSummary, setNewStartsSummary] = useState(null);

  const loadMetrics = React.useCallback(async () => {
    setLoading(true);
    const start = startDate.toDate();
    const end = endDate.toDate();

    const [shiftResult, hoursResult, recruiterResult, earlyLeavesResult] = await Promise.all([
      getShiftData(start, end),
      getAggregateHours(start, end, 'day'),
      getRecruiterData(start, end),
      getEarlyLeaveTrends(start, end)
    ]);

    // Get reconciled new starts summary
    let newStartsCount = null;
    let nsSummary = null;
    try {
      const ns = await getNewStartsSummary(start, end);
      if (ns && ns.success) {
        newStartsCount = ns.data.chosenCount;
        nsSummary = ns.data;
      }
    } catch (err) {
      logger.error('Failed to compute new starts summary:', err);
    }

    const calculatedMetrics = calculateMetrics(
      shiftResult.data || [],
      hoursResult.data || {},
      recruiterResult.data || [],
      earlyLeavesResult.data,
      newStartsCount
    );

    setNewStartsSummary(nsSummary);

    setMetrics(calculatedMetrics);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const calculateMetrics = (shifts, hours, recruiter, earlyLeaves, reconciledNewStarts = null) => {
    const totalShifts = shifts.length;
    const avgAttendance = totalShifts > 0 ? shifts.reduce((sum, s) => sum + (s.numberWorking || 0), 0) / totalShifts : 0;
    const totalRequested = shifts.reduce((sum, s) => sum + (s.numberRequested || 0), 0);
    const totalWorking = shifts.reduce((sum, s) => sum + (s.numberWorking || 0), 0);
    const fillRate = totalRequested > 0 ? (totalWorking / totalRequested) * 100 : 0;

    // Use reconciled count when available (applicants > shift EIDs > on-premise), otherwise fall back to counting shift arrays
    const totalNewStarts = typeof reconciledNewStarts === 'number'
      ? reconciledNewStarts
      : shifts.reduce((sum, s) => sum + (s.newStarts?.length || 0), 0);

    const totalSendHomes = shifts.reduce((sum, s) => sum + (s.sendHomes || 0), 0);
    const totalLineCuts = shifts.reduce((sum, s) => sum + (s.lineCuts || 0), 0);

    // `hours` is an aggregated map keyed by date/month/week, so sum values across keys
    const hourValues = Object.values(hours || {});
    const totalHours = hourValues.reduce((sum, h) => sum + (h.totalHours || 0), 0);
    const totalDirect = hourValues.reduce((sum, h) => sum + (h.totalDirect || 0), 0);
    const totalIndirect = hourValues.reduce((sum, h) => sum + (h.totalIndirect || 0), 0);
    const shift1Hours = hourValues.reduce((sum, h) => sum + (h.shift1Hours || 0), 0);
    const shift2Hours = hourValues.reduce((sum, h) => sum + (h.shift2Hours || 0), 0);
    const daysCount = hourValues.length || 1;

    const totalInterviewsScheduled = recruiter.reduce((sum, r) => sum + (r.interviewsScheduled || 0), 0);
    const totalInterviewShows = recruiter.reduce((sum, r) => sum + (r.interviewShows || 0), 0);
    const totalApplicantsProcessed = recruiter.reduce((sum, r) => sum + (r.applicantsProcessed || 0), 0);
    const showRate = totalInterviewsScheduled > 0 ? (totalInterviewShows / totalInterviewsScheduled) * 100 : 0;

    const netStaffing = totalNewStarts - totalSendHomes;
    const turnoverRate = avgAttendance > 0 ? ((totalSendHomes / avgAttendance) * 100).toFixed(1) : 0;

    return {
      attendance: { avg: Math.round(avgAttendance), fillRate: fillRate.toFixed(1), totalShifts },
      staffing: { newStarts: totalNewStarts, sendHomes: totalSendHomes, lineCuts: totalLineCuts, netStaffing, turnoverRate },
      hours: { total: totalHours.toFixed(0), direct: totalDirect.toFixed(0), indirect: totalIndirect.toFixed(0), shift1: shift1Hours.toFixed(0), shift2: shift2Hours.toFixed(0), avgPerDay: daysCount > 0 ? (totalHours / daysCount).toFixed(0) : 0 },
      recruiting: { interviewsScheduled: totalInterviewsScheduled, interviewShows: totalInterviewShows, applicantsProcessed: totalApplicantsProcessed, showRate: showRate.toFixed(1) },
      earlyLeaves: earlyLeaves || { total: 0, avgPerWeek: 0, byShift: { '1st': 0, '2nd': 0 } }
    };
  };

  const getTrendIcon = (value, threshold = 0) => {
    if (value > threshold) return <TrendingUp color="success" />;
    if (value < threshold) return <TrendingDown color="error" />;
    return <TrendingFlat color="disabled" />;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  if (loading) {
    return <Container><Typography variant="h4" gutterBottom>Scorecard</Typography><LinearProgress /></Container>;
  }

  if (!metrics) {
    return <Container><Typography variant="h4">No data available</Typography></Container>;
  }

  const overallScore = Math.round((parseFloat(metrics.attendance.fillRate) + parseFloat(metrics.recruiting.showRate)) / 2);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <Typography variant="h4">Performance Scorecard</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker label="Start Date" value={startDate} onChange={setStartDate} slotProps={{ textField: { size: 'small' } }} />
            <DatePicker label="End Date" value={endDate} onChange={setEndDate} slotProps={{ textField: { size: 'small' } }} />
          </Box>
        </Box>

        <Paper sx={{ padding: 3, marginBottom: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="white">Overall Performance Score</Typography>
            <Typography variant="h2" color="white" sx={{ marginY: 2 }}>{overallScore}%</Typography>
            <Chip label={overallScore >= 90 ? 'Excellent' : overallScore >= 70 ? 'Good' : 'Needs Improvement'} color={getScoreColor(overallScore)} sx={{ fontSize: '1rem', padding: '20px 10px' }} />
          </Box>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>Attendance & Fill Rate</Typography>
              <Box sx={{ marginTop: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Typography>Average Attendance</Typography>
                  <Typography variant="h5">{metrics.attendance.avg}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Typography>Fill Rate</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h5">{metrics.attendance.fillRate}%</Typography>
                    {getTrendIcon(parseFloat(metrics.attendance.fillRate), 90)}
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(parseFloat(metrics.attendance.fillRate), 100)} sx={{ height: 10, borderRadius: 5 }} />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>Staffing Movement</Typography>
              <Grid container spacing={2} sx={{ marginTop: 1 }}>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ background: '#e8f5e9' }}>
                    <CardContent>
                      <Typography color="text.secondary" variant="caption">New Starts</Typography>
                      <Typography variant="h4" color="success.main">{metrics.staffing.newStarts}</Typography>
                      {newStartsSummary && newStartsSummary.perShift && (
                        <Typography variant="caption" color="text.secondary">1st: {newStartsSummary.perShift['1st']?.uniqueCount || 0} • 2nd: {newStartsSummary.perShift['2nd']?.uniqueCount || 0}</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ background: '#ffebee' }}>
                    <CardContent><Typography color="text.secondary" variant="caption">Send Homes</Typography><Typography variant="h4" color="error.main">{metrics.staffing.sendHomes}</Typography></CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent><Typography color="text.secondary" variant="caption">Net Staffing</Typography><Typography variant="h4">{metrics.staffing.netStaffing > 0 ? '+' : ''}{metrics.staffing.netStaffing}</Typography></CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent><Typography color="text.secondary" variant="caption">Turnover Rate</Typography><Typography variant="h4">{metrics.staffing.turnoverRate}%</Typography></CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>Hours Worked</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                      <TableRow><TableCell>Total Hours</TableCell><TableCell align="right"><strong>{metrics.hours.total}</strong></TableCell></TableRow>
                    <TableRow><TableCell>Direct Hours</TableCell><TableCell align="right">{metrics.hours.direct}</TableCell></TableRow>
                    <TableRow><TableCell>Indirect Hours</TableCell><TableCell align="right">{metrics.hours.indirect}</TableCell></TableRow>
                    <TableRow><TableCell>1st Shift</TableCell><TableCell align="right">{metrics.hours.shift1}</TableCell></TableRow>
                    <TableRow><TableCell>2nd Shift</TableCell><TableCell align="right">{metrics.hours.shift2}</TableCell></TableRow>
                    <TableRow><TableCell>Avg Per Day</TableCell><TableCell align="right">{metrics.hours.avgPerDay}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>Recruiting Performance</Typography>
              <Box sx={{ marginTop: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Typography>Interviews Scheduled</Typography>
                  <Typography variant="h6">{metrics.recruiting.interviewsScheduled}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Typography>Interview Shows</Typography>
                  <Typography variant="h6">{metrics.recruiting.interviewShows}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Typography>Applicants Processed</Typography>
                  <Typography variant="h6">{metrics.recruiting.applicantsProcessed}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Show Rate</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h5">{metrics.recruiting.showRate}%</Typography>
                    {getTrendIcon(parseFloat(metrics.recruiting.showRate), 70)}
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={Math.min(parseFloat(metrics.recruiting.showRate), 100)} sx={{ height: 10, borderRadius: 5, marginTop: 2 }} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </LocalizationProvider>
  );
};

export default ScorecardPage;
