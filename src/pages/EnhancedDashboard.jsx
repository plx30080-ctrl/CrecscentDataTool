import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';
import { TrendingUp, TrendingDown, People, EventAvailable, Warning } from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import {
  getShiftData,
  getAggregateHours,
  getEarlyLeaveTrends,
  getApplicantPipeline,
  getOnPremiseData,
  getBranchDailyData,
  getNewStartsSummary
} from '../services/firestoreService';
import { generateForecast } from '../services/forecastingService';
import logger from '../utils/logger';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EnhancedDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'days'));
  const [endDate, setEndDate] = useState(dayjs());

  const loadDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const start = startDate.toDate();
      const end = endDate.toDate();

      const [shiftResult, hoursResult, earlyLeavesResult, pipelineResult, onPremiseResult, branchDailyResult] = await Promise.all([
        getShiftData(start, end),
        getAggregateHours(start, end, 'day'),
        getEarlyLeaveTrends(start, end),
        getApplicantPipeline(),
        getOnPremiseData(start, end),
        getBranchDailyData(start, end)
      ]);

      // Also get consolidated new-starts summary (reconciles shifts, applicants, on-premise)
      let newStartsSummary = null;
      try {
        const res = await getNewStartsSummary(start, end);
        newStartsSummary = res.success ? res.data : null;
      } catch (err) {
        logger.error('Failed to load new starts summary:', err);
        newStartsSummary = null;
      }

      logger.info('Dashboard data loaded:', {
        dateRange: { start: start, end: end },
        shiftResult: {
          success: shiftResult.success,
          dataCount: shiftResult.data?.length || 0,
          sample: shiftResult.data?.[0]
        },
        hoursResult: {
          success: hoursResult.success,
          dataKeys: Object.keys(hoursResult.data || {}).length
        },
        onPremiseResult: {
          success: onPremiseResult.success,
          dataCount: onPremiseResult.data?.length || 0
        },
        branchDailyResult: {
          success: branchDailyResult.success,
          dataCount: branchDailyResult.data?.length || 0
        },
        earlyLeavesResult: {
          success: earlyLeavesResult.success,
          total: earlyLeavesResult.data?.total
        },
        pipelineResult: {
          success: pipelineResult.success,
          total: pipelineResult.data?.total
        }
      });

      // Generate forecast
      const forecastResult = await generateForecast(end, 30);

      if (shiftResult.success && hoursResult.success) {
        setDashboardData({
          shifts: shiftResult.data || [],
          hours: hoursResult.data || [],
          onPremise: onPremiseResult.success ? onPremiseResult.data : [],
          branchDaily: branchDailyResult.success ? branchDailyResult.data : [],
          earlyLeaves: earlyLeavesResult.success ? earlyLeavesResult.data : null,
          pipeline: pipelineResult.success ? pipelineResult.data : null,
          newStartsSummary: newStartsSummary || null
        });
      } else {
        logger.error('Shift or hours data failed:', { shiftResult, hoursResult });
        setDashboardData({
          shifts: [],
          hours: [],
          earlyLeaves: earlyLeavesResult.success ? earlyLeavesResult.data : null,
          pipeline: pipelineResult.success ? pipelineResult.data : null,
          newStartsSummary: newStartsSummary || null
        });
      }

      if (forecastResult.success) {
        setForecast(forecastResult.forecast);
      }

    } catch (err) {
      logger.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);



  const calculateKPIs = () => {
    if (!dashboardData || (!dashboardData.shifts.length && (!dashboardData.onPremise || !dashboardData.onPremise.length))) {
      return {
        avgAttendance: 0,
        fillRate: 0,
        avgSendHomes: 0,
        totalNewStarts: 0
      };
    }

    // Use on-premise data if available, otherwise fall back to shifts
    const sourceData = dashboardData.onPremise && dashboardData.onPremise.length > 0 
      ? dashboardData.onPremise 
      : dashboardData.shifts;

    // Import aggregation helper
    const { aggregateOnPremiseByDateAndShift } = require('../services/firestoreService');
    const shifts = aggregateOnPremiseByDateAndShift(sourceData);
    
    const totalShifts = shifts.length;

    const avgAttendance = totalShifts > 0 ? shifts.reduce((sum, s) => sum + (s.working || 0), 0) / totalShifts : 0;
    const totalRequested = shifts.reduce((sum, s) => sum + (s.requested || 0), 0);
    const totalWorking = shifts.reduce((sum, s) => sum + (s.working || 0), 0);
    const fillRate = totalRequested > 0 ? (totalWorking / totalRequested) * 100 : 0;
    const avgSendHomes = totalShifts > 0 ? shifts.reduce((sum, s) => sum + (s.sendHomes || 0), 0) / totalShifts : 0;
    let totalNewStarts = 0;

    if (dashboardData && dashboardData.newStartsSummary && typeof dashboardData.newStartsSummary.chosenCount === 'number') {
      totalNewStarts = dashboardData.newStartsSummary.chosenCount;
    } else {
      totalNewStarts = shifts.reduce((sum, s) => sum + (parseInt(s.newStarts) || 0), 0);
    }

    return {
      avgAttendance: Math.round(avgAttendance),
      fillRate: fillRate.toFixed(1),
      avgSendHomes: avgSendHomes.toFixed(1),
      totalNewStarts
    };
  };

  const prepareAttendanceTrendData = () => {
    if (!dashboardData || (!dashboardData.shifts.length && !dashboardData.onPremise?.length)) {
      return {labels: [], datasets: []};
    }

    // Use on-premise data if available (primary source), otherwise fall back to shifts
    const sourceData = dashboardData.onPremise && dashboardData.onPremise.length > 0 
      ? dashboardData.onPremise 
      : dashboardData.shifts;

    // Import aggregation helper
    const { aggregateOnPremiseByDateAndShift } = require('../services/firestoreService');
    const aggregated = aggregateOnPremiseByDateAndShift(sourceData);

    // Group by date
    const byDate = {};
    aggregated.forEach(entry => {
      const dateKey = dayjs(entry.date).format('MMM D');
      if (!byDate[dateKey]) {
        byDate[dateKey] = { requested: 0, working: 0, count: 0 };
      }
      byDate[dateKey].requested += entry.requested || 0;
      byDate[dateKey].working += entry.working || 0;
      byDate[dateKey].count += 1;
    });

    const labels = Object.keys(byDate).slice(-14); // Last 14 days
    const requested = labels.map(label => byDate[label].requested / byDate[label].count);
    const working = labels.map(label => byDate[label].working / byDate[label].count);

    return {
      labels,
      datasets: [
        {
          label: 'Requested',
          data: requested,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Actual',
          data: working,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const prepareHoursData = () => {
    if (!dashboardData || !dashboardData.hours || Object.keys(dashboardData.hours).length === 0) {
      return {labels: [], datasets: []};
    }

    const hoursData = dashboardData.hours;
    const labels = Object.keys(hoursData).sort().slice(-14);
    const shift1 = labels.map(label => hoursData[label]?.shift1Hours || 0);
    const shift2 = labels.map(label => hoursData[label]?.shift2Hours || 0);

    return {
      labels: labels.map(l => dayjs(l).format('MMM D')),
      datasets: [
        {
          label: '1st Shift Hours',
          data: shift1,
          backgroundColor: 'rgba(75, 192, 192, 0.8)'
        },
        {
          label: '2nd Shift Hours',
          data: shift2,
          backgroundColor: 'rgba(153, 102, 255, 0.8)'
        }
      ]
    };
  };

  const prepareEarlyLeavesData = () => {
    if (!dashboardData?.earlyLeaves?.byReason) {
      return {labels: [], datasets: []};
    }

    const reasons = Object.keys(dashboardData.earlyLeaves.byReason);
    const counts = reasons.map(r => dashboardData.earlyLeaves.byReason[r]);

    return {
      labels: reasons,
      datasets: [
        {
          data: counts,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ]
        }
      ]
    };
  };

  const kpis = calculateKPIs();

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ marginTop: 2 }}>Loading dashboard data...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Alert severity="error" sx={{ marginTop: 2 }}>
          {error}
          <Button onClick={loadDashboardData} sx={{ marginLeft: 2 }}>Retry</Button>
        </Alert>
      </Container>
    );
  }

  if (!dashboardData || (dashboardData.shifts.length === 0 && dashboardData.hours.length === 0)) {
    return (
      <Container>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Alert severity="info" sx={{ marginTop: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            No Data Available
          </Typography>
          <Typography variant="body2" gutterBottom>
            No shift data found for the selected date range ({startDate.format('MMM D, YYYY')} - {endDate.format('MMM D, YYYY')}).
          </Typography>
          <Typography variant="body2" sx={{ marginTop: 1 }}>
            <strong>To get started:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            1. Navigate to the <strong>Bulk Data Upload</strong> page<br/>
            2. Download the CSV template<br/>
            3. Fill in your workforce data<br/>
            4. Upload the file to Firestore<br/>
            5. Return here to view your dashboard
          </Typography>
          <Typography variant="body2" sx={{ marginTop: 2 }}>
            See <code>TROUBLESHOOTING_DASHBOARD_ZEROS.md</code> for detailed instructions.
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <Typography variant="h4">Dashboard</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Box>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>Avg Attendance</Typography>
                    <Typography variant="h4">{kpis.avgAttendance}</Typography>
                  </Box>
                  <People fontSize="large" color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>Fill Rate</Typography>
                    <Typography variant="h4">{kpis.fillRate}%</Typography>
                  </Box>
                  <TrendingUp fontSize="large" color="success" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>New Starts</Typography>
                    <Typography variant="h4">{kpis.totalNewStarts}</Typography>
                  </Box>
                  <EventAvailable fontSize="large" color="info" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>Avg Send Homes</Typography>
                    <Typography variant="h4">{kpis.avgSendHomes}</Typography>
                  </Box>
                  <Warning fontSize="large" color="warning" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Forecast Alert */}
        {forecast && (
          <Alert
            severity={forecast.recruitingPlan.urgency === 'high' ? 'warning' : 'info'}
            sx={{ marginBottom: 3 }}
            icon={<TrendingUp />}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              Staffing Forecast
            </Typography>
            <Typography variant="body2">
              {forecast.recruitingPlan.recommendation}
              {' '}Predicted headcount: {forecast.predictedHeadcount} (currently {forecast.currentAvgHeadcount})
            </Typography>
          </Alert>
        )}

        {/* Tabs for different views */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Attendance Trends" />
            <Tab label="Hours Tracking" />
            <Tab label="Early Leaves" />
            <Tab label="Recruiting Pipeline" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {tabValue === 0 && (
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" gutterBottom>Attendance Trend (Last 14 Days)</Typography>
            <Line
              data={prepareAttendanceTrendData()}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          </Paper>
        )}

        {tabValue === 1 && (
          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" gutterBottom>Hours by Shift (Last 14 Days)</Typography>
            <Bar
              data={prepareHoursData()}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true, stacked: true },
                  x: { stacked: true }
                }
              }}
            />
          </Paper>
        )}

        {tabValue === 2 && dashboardData?.earlyLeaves && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>Early Leaves by Reason</Typography>
                <Doughnut
                  data={prepareEarlyLeavesData()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'right' }
                    }
                  }}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>Early Leave Statistics</Typography>
                <Box sx={{ marginTop: 2 }}>
                  <Typography variant="body1">
                    Total Early Leaves: <strong>{dashboardData.earlyLeaves.total}</strong>
                  </Typography>
                  <Typography variant="body1" sx={{ marginTop: 1 }}>
                    Average Per Week: <strong>{dashboardData.earlyLeaves.avgPerWeek}</strong>
                  </Typography>
                  <Typography variant="body1" sx={{ marginTop: 1 }}>
                    1st Shift: <strong>{dashboardData.earlyLeaves.byShift['1st']}</strong>
                  </Typography>
                  <Typography variant="body1" sx={{ marginTop: 1 }}>
                    2nd Shift: <strong>{dashboardData.earlyLeaves.byShift['2nd']}</strong>
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {tabValue === 3 && dashboardData?.pipeline && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>Recruiting Pipeline Status</Typography>
                <Grid container spacing={2} sx={{ marginTop: 2 }}>
                  {Object.keys(dashboardData.pipeline.byStatus).map(status => (
                    <Grid item xs={6} md={2} key={status}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="text.secondary" variant="caption">{status}</Typography>
                          <Typography variant="h5">
                            {dashboardData.pipeline.byStatus[status]}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ marginTop: 3 }}>
                  <Typography variant="body1">
                    Conversion Rate: <strong>{dashboardData.pipeline.conversionRate}%</strong>
                  </Typography>
                  <Typography variant="body1" sx={{ marginTop: 1 }}>
                    Total in Pipeline: <strong>{dashboardData.pipeline.total}</strong>
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default EnhancedDashboard;
