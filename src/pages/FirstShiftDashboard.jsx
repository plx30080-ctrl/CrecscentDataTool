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
import { TrendingUp, AccessTime, People } from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import { getOnPremiseData, aggregateOnPremiseByDateAndShift } from '../services/firestoreService';
import dayjs from 'dayjs';
import logger from '../utils/logger';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const FirstShiftDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shiftData, setShiftData] = useState([]);
  const [onPremiseData, setOnPremiseData] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'days'));
  const [endDate, setEndDate] = useState(dayjs());

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const start = startDate.toDate();
      const end = endDate.toDate();

      const [onPremiseResult, hoursResult] = await Promise.all([
        getOnPremiseData(start, end),
        require('../services/firestoreService').getAggregateHours(start, end, 'day')
      ]);

      if (onPremiseResult.success) {
        // Aggregate duplicates by date/shift
        const aggregated = aggregateOnPremiseByDateAndShift(onPremiseResult.data);
        // Filter for 1st shift data only
        const firstShiftData = aggregated.filter(d => d.shift === '1st');
        setOnPremiseData(firstShiftData);

        // Merge hours data from labor reports
        const hoursData = hoursResult.success ? hoursResult.data : {};
        const mappedData = firstShiftData.map(d => {
          const dateKey = dayjs(d.date).format('YYYY-MM-DD');
          const hoursForDate = hoursData[dateKey] || {};
          
          return {
            ...d,
            headcount: d.working || 0,
            hours: hoursForDate.shift1Hours || 0,
            directHours: hoursForDate.shift1Direct || 0,
            indirectHours: hoursForDate.shift1Indirect || 0,
            avgHoursPerPerson: d.working > 0 ? (hoursForDate.shift1Hours || 0) / d.working : 0
          };
        });
        setShiftData(mappedData);
      }
    } catch (err) {
      logger.error('Error loading 1st shift data:', err);
      setError('Failed to load 1st shift data');
    } finally {
      setLoading(false);
    }
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

  const totalHours = shiftData.reduce((sum, d) => sum + (d.hours || 0), 0);
  const totalDirectHours = shiftData.reduce((sum, d) => sum + (d.directHours || 0), 0);
  const totalHeadcount = shiftData.reduce((sum, d) => sum + (d.headcount || 0), 0);
  const avgHeadcount = shiftData.length > 0 ? (totalHeadcount / shiftData.length).toFixed(1) : 0;
  const avgHoursPerDay = shiftData.length > 0 ? (totalHours / shiftData.length).toFixed(1) : 0;

  const onPremiseHours = onPremiseData.reduce((sum, d) => sum + (parseFloat(d.onPremise) || 0), 0);
  const onPremiseAvg = onPremiseData.length > 0 ? (onPremiseHours / onPremiseData.length).toFixed(1) : 0;

  // New starts (on-premise reported numeric) for this shift
  const totalNewStarts = onPremiseData.reduce((sum, d) => sum + (parseInt(d.newStarts) || 0), 0);
  
  // Calculate average hours per person
  const avgHoursPerPerson = totalHeadcount > 0 ? (totalHours / totalHeadcount).toFixed(1) : 0;

  // Chart data
  const chartLabels = shiftData.map(d => dayjs(d.date).format('MMM DD'));
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Headcount',
        data: shiftData.map(d => d.headcount || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Total Hours',
        data: shiftData.map(d => d.hours || 0),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        yAxisID: 'y1'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Headcount'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Hours'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h5" gutterBottom sx={{ marginBottom: 3 }}>
          1st Shift Performance Metrics
        </Typography>

        {/* Date Range */}
        <Paper sx={{ padding: 2, marginBottom: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <DatePicker label="Start Date" value={startDate} onChange={(d) => setStartDate(d)} slotProps={{ textField: { size: 'small' } }} />
            <DatePicker label="End Date" value={endDate} onChange={(d) => setEndDate(d)} slotProps={{ textField: { size: 'small' } }} />
          </Box>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ marginBottom: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                  <AccessTime sx={{ marginRight: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Total Hours</Typography>
                </Box>
                <Typography variant="h4">{totalHours.toFixed(0)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg: {avgHoursPerDay} hrs/day
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                  <People sx={{ marginRight: 1, color: 'success.main' }} />
                  <Typography variant="h6">New Starts</Typography>
                </Box>
                <Typography variant="h4">{totalNewStarts}</Typography>
                <Typography variant="body2" color="text.secondary">
                  On-premise reported
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                  <People sx={{ marginRight: 1, color: 'success.main' }} />
                  <Typography variant="h6">Avg Headcount</Typography>
                </Box>
                <Typography variant="h4">{avgHeadcount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Per day
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                  <TrendingUp sx={{ marginRight: 1, color: 'info.main' }} />
                  <Typography variant="h6">On Premise Hrs</Typography>
                </Box>
                <Typography variant="h4">{onPremiseAvg}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg per day
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                  <AccessTime sx={{ marginRight: 1, color: 'warning.main' }} />
                  <Typography variant="h6">Avg Hrs/Person</Typography>
                </Box>
                <Typography variant="h4">{avgHoursPerPerson}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total hours / headcount
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Chart */}
        <Paper sx={{ padding: 2, marginBottom: 3 }}>
          <Typography variant="h6" gutterBottom>
            Headcount & Hours Trends
          </Typography>
          <Line data={chartData} options={chartOptions} />
        </Paper>

        {/* Data Table */}
        <Paper>
          <Typography variant="h6" sx={{ padding: 2 }}>
            Daily Breakdown
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell align="right"><strong>Requested</strong></TableCell>
                  <TableCell align="right"><strong>Working</strong></TableCell>
                  <TableCell align="right"><strong>Total Hours</strong></TableCell>
                  <TableCell align="right"><strong>Direct Hours</strong></TableCell>
                  <TableCell align="right"><strong>New Starts</strong></TableCell>
                  <TableCell align="right"><strong>Send Homes</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shiftData.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell>{dayjs(data.date).format('MMM DD, YYYY')}</TableCell>
                    <TableCell align="right">{data.requested || 0}</TableCell>
                    <TableCell align="right">{data.working || 0}</TableCell>
                    <TableCell align="right">{(data.hours || 0).toFixed(1)}</TableCell>
                    <TableCell align="right">{(data.directHours || 0).toFixed(1)}</TableCell>
                    <TableCell align="right">{data.newStarts || 0}</TableCell>
                    <TableCell align="right">{data.sendHomes || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default FirstShiftDashboard;
            </Card>
          </Grid>
        </Grid>

        {/* Trend Chart */}
        <Paper sx={{ padding: 3, marginBottom: 3 }}>
          <Typography variant="h6" gutterBottom>
            1st Shift Trends
          </Typography>
          <Line data={chartData} options={chartOptions} />
        </Paper>

        {/* Daily Data Table */}
        <Paper sx={{ padding: 3 }}>
          <Typography variant="h6" gutterBottom>
            Daily Breakdown
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell align="right"><strong>Headcount</strong></TableCell>
                  <TableCell align="right"><strong>Hours</strong></TableCell>
                  <TableCell align="right"><strong>On-Premise</strong></TableCell>
                  <TableCell align="right"><strong>Avg Hours/Person</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shiftData.map((day, index) => {
                  const onPremiseDay = onPremiseData.find(d => 
                    dayjs(d.date).format('YYYY-MM-DD') === dayjs(day.date).format('YYYY-MM-DD')
                  );
                  const avgHrsPerPerson = day.headcount > 0 ? (day.hours / day.headcount).toFixed(1) : '0.0';
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{dayjs(day.date).format('MMM DD, YYYY')}</TableCell>
                      <TableCell align="right">{day.headcount || 0}</TableCell>
                      <TableCell align="right">{(day.hours || 0).toFixed(1)}</TableCell>
                      <TableCell align="right">{(onPremiseDay?.onPremise || 0).toFixed(1)}</TableCell>
                      <TableCell align="right">{avgHrsPerPerson}</TableCell>
                    </TableRow>
                  );
                })}
                {shiftData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No 1st shift data available for selected period
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default FirstShiftDashboard;
