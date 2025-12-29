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
import { getShiftData, getOnPremiseData } from '../services/firestoreService';
import dayjs from 'dayjs';

const FirstShiftDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shiftData, setShiftData] = useState([]);
  const [onPremiseData, setOnPremiseData] = useState([]);
  const [startDate] = useState(dayjs().subtract(30, 'days'));
  const [endDate] = useState(dayjs());

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // startDate and endDate are static constants, no need to re-run

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const start = startDate.toDate();
      const end = endDate.toDate();

      const onPremiseResult = await getOnPremiseData(start, end);

      if (onPremiseResult.success) {
        // Filter for 1st shift data only
        const firstShiftData = onPremiseResult.data.filter(d => d.shift === '1st');
        setOnPremiseData(firstShiftData);

        // Map onPremiseData to shiftData format for charts
        // onPremiseData has: working, requested, required fields
        // We need: headcount, hours fields for charts
        const mappedData = firstShiftData.map(d => ({
          ...d,
          headcount: d.working || 0,
          hours: (d.working || 0) * 8 // Estimate 8 hours per person if actual hours not available
        }));
        setShiftData(mappedData);
      }
    } catch (err) {
      console.error('Error loading 1st shift data:', err);
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

  // Calculate metrics
  const totalHours = shiftData.reduce((sum, d) => sum + (d.hours || 0), 0);
  const totalHeadcount = shiftData.reduce((sum, d) => sum + (d.headcount || 0), 0);
  const avgHeadcount = shiftData.length > 0 ? (totalHeadcount / shiftData.length).toFixed(1) : 0;
  const avgHoursPerDay = shiftData.length > 0 ? (totalHours / shiftData.length).toFixed(1) : 0;

  const onPremiseHours = onPremiseData.reduce((sum, d) => sum + (d.onPremise || 0), 0);
  const onPremiseAvg = onPremiseData.length > 0 ? (onPremiseHours / onPremiseData.length).toFixed(1) : 0;

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
    <Box>
      <Typography variant="h5" gutterBottom sx={{ marginBottom: 3 }}>
        1st Shift Performance Metrics
      </Typography>

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
                <Typography variant="h6">On-Premise Avg</Typography>
              </Box>
              <Typography variant="h4">{onPremiseAvg}</Typography>
              <Typography variant="body2" color="text.secondary">
                Hours per day
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <AccessTime sx={{ marginRight: 1, color: 'warning.main' }} />
                <Typography variant="h6">Data Points</Typography>
              </Box>
              <Typography variant="h4">{shiftData.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                Last 30 days
              </Typography>
            </CardContent>
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
  );
};

export default FirstShiftDashboard;
