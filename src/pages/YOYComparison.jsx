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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { CompareArrows, TrendingUp, TrendingDown } from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import { getAggregateHours, getOnPremiseData } from '../services/firestoreService';
import dayjs from 'dayjs';
import logger from '../utils/logger';

const YOYComparison = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentYearData, setCurrentYearData] = useState([]);
  const [priorYearData, setPriorYearData] = useState([]);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]); // loadData is stable and doesn't need to be in deps

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const now = dayjs();
      let currentStart, currentEnd, priorStart, priorEnd;

      if (dateRange === 'month') {
        currentStart = now.startOf('month');
        currentEnd = now.endOf('month');
        priorStart = now.subtract(1, 'year').startOf('month');
        priorEnd = now.subtract(1, 'year').endOf('month');
      } else if (dateRange === 'quarter') {
        currentStart = now.startOf('quarter');
        currentEnd = now.endOf('quarter');
        priorStart = now.subtract(1, 'year').startOf('quarter');
        priorEnd = now.subtract(1, 'year').endOf('quarter');
      } else if (dateRange === 'ytd') {
        currentStart = now.startOf('year');
        currentEnd = now;
        priorStart = now.subtract(1, 'year').startOf('year');
        priorEnd = now.subtract(1, 'year');
      }

      const groupBy = dateRange === 'ytd' ? 'month' : 'day';
      const [currentResult, priorResult, currentOnPrem, priorOnPrem] = await Promise.all([
        getAggregateHours(currentStart.toDate(), currentEnd.toDate(), groupBy),
        getAggregateHours(priorStart.toDate(), priorEnd.toDate(), groupBy),
        getOnPremiseData(currentStart.toDate(), currentEnd.toDate()),
        getOnPremiseData(priorStart.toDate(), priorEnd.toDate())
      ]);

      const processData = (hoursData, onPremData) => {
        const merged = { ...hoursData };
        
        if (onPremData && onPremData.success) {
          onPremData.data.forEach(entry => {
            const date = dayjs(entry.date);
            let key;
            if (groupBy === 'day') {
              key = date.format('YYYY-MM-DD');
            } else {
              key = date.format('YYYY-MM');
            }

            if (!merged[key]) {
              merged[key] = {
                totalHours: 0,
                totalDirect: 0,
                totalIndirect: 0,
                requested: 0,
                working: 0,
                count: 0
              };
            }
            
            merged[key].requested = (merged[key].requested || 0) + (parseInt(entry.requested) || 0);
            merged[key].working = (merged[key].working || 0) + (parseInt(entry.working) || 0);
          });
        }
        
        return Object.keys(merged).sort().map(k => {
          const item = merged[k];
          return {
            date: k,
            ...item,
            fillRate: item.requested > 0 ? (item.working / item.requested) * 100 : 0
          };
        });
      };

      if (currentResult.success) {
        setCurrentYearData(processData(currentResult.data || {}, currentOnPrem));
      }
      if (priorResult.success) {
        setPriorYearData(processData(priorResult.data || {}, priorOnPrem));
      }
    } catch (err) {
      logger.error('Error loading YOY data:', err);
      setError('Failed to load year-over-year comparison data');
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

  // Calculate totals
  const currentTotal = currentYearData.reduce((sum, d) => sum + (d.totalHours || 0), 0);
  const priorTotal = priorYearData.reduce((sum, d) => sum + (d.totalHours || 0), 0);
  const percentChange = priorTotal > 0 ? (((currentTotal - priorTotal) / priorTotal) * 100).toFixed(1) : 0;

  const currentDirect = currentYearData.reduce((sum, d) => sum + (d.totalDirect || 0), 0);
  const priorDirect = priorYearData.reduce((sum, d) => sum + (d.totalDirect || 0), 0);
  const directChange = priorDirect > 0 ? (((currentDirect - priorDirect) / priorDirect) * 100).toFixed(1) : 0;

  const currentIndirect = currentYearData.reduce((sum, d) => sum + (d.totalIndirect || 0), 0);
  const priorIndirect = priorYearData.reduce((sum, d) => sum + (d.totalIndirect || 0), 0);
  const indirectChange = priorIndirect > 0 ? (((currentIndirect - priorIndirect) / priorIndirect) * 100).toFixed(1) : 0;

  const currentRequested = currentYearData.reduce((sum, d) => sum + (d.requested || 0), 0);
  const priorRequested = priorYearData.reduce((sum, d) => sum + (d.requested || 0), 0);
  const requestedChange = priorRequested > 0 ? (((currentRequested - priorRequested) / priorRequested) * 100).toFixed(1) : 0;

  const currentWorking = currentYearData.reduce((sum, d) => sum + (d.working || 0), 0);
  const priorWorking = priorYearData.reduce((sum, d) => sum + (d.working || 0), 0);
  const workingChange = priorWorking > 0 ? (((currentWorking - priorWorking) / priorWorking) * 100).toFixed(1) : 0;

  const currentFillRate = currentRequested > 0 ? (currentWorking / currentRequested) * 100 : 0;
  const priorFillRate = priorRequested > 0 ? (priorWorking / priorRequested) * 100 : 0;
  const fillRateChange = (currentFillRate - priorFillRate).toFixed(1);

  //  Chart data
  const currentLabels = currentYearData.map(d => dayjs(d.date).format('MMM DD'));
  const priorLabels = priorYearData.map(d => dayjs(d.date).format('MMM DD'));
  
  const chartData = {
    labels: currentLabels.length >= priorLabels.length ? currentLabels : priorLabels,
    datasets: [
      {
        label: 'Current Year',
        data: currentYearData.map(d => d.totalHours || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Prior Year',
        data: priorYearData.map(d => d.totalHours || 0),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        borderDash: [5, 5]
      }
    ]
  };

  const comparisonData = {
    labels: ['Total Hours', 'Direct Hours', 'Indirect Hours'],
    datasets: [
      {
        label: 'Current Year',
        data: [currentTotal, currentDirect, currentIndirect],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Prior Year',
        data: [priorTotal, priorDirect, priorIndirect],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      }
    ]
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <Typography variant="h5">Year-Over-Year Comparison</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={dateRange}
            label="Period"
            onChange={(e) => setDateRange(e.target.value)}
          >
            <MenuItem value="month">Current Month vs Last Year</MenuItem>
            <MenuItem value="quarter">Current Quarter vs Last Year</MenuItem>
            <MenuItem value="ytd">Year-to-Date vs Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} sx={{ marginBottom: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <CompareArrows sx={{ marginRight: 1, color: 'primary.main' }} />
                <Typography variant="h6">Total Hours</Typography>
              </Box>
              <Typography variant="h4">{currentTotal.toFixed(0)}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {parseFloat(percentChange) >= 0 ? (
                  <TrendingUp color="success" />
                ) : (
                  <TrendingDown color="error" />
                )}
                <Typography 
                  variant="body2" 
                  color={parseFloat(percentChange) >= 0 ? 'success.main' : 'error.main'}
                >
                  {percentChange}% vs prior year
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <CompareArrows sx={{ marginRight: 1, color: 'success.main' }} />
                <Typography variant="h6">Direct Hours</Typography>
              </Box>
              <Typography variant="h4">{currentDirect.toFixed(0)}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {parseFloat(directChange) >= 0 ? (
                  <TrendingUp color="success" />
                ) : (
                  <TrendingDown color="error" />
                )}
                <Typography 
                  variant="body2" 
                  color={parseFloat(directChange) >= 0 ? 'success.main' : 'error.main'}
                >
                  {directChange}% vs prior year
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
                <CompareArrows sx={{ marginRight: 1, color: 'warning.main' }} />
                <Typography variant="h6">Indirect Hours</Typography>
              </Box>
              <Typography variant="h4">{currentIndirect.toFixed(0)}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {parseFloat(indirectChange) >= 0 ? (
                  <TrendingUp color="success" />
                ) : (
                  <TrendingDown color="error" />
                )}
                <Typography 
                  variant="body2" 
                  color={parseFloat(indirectChange) >= 0 ? 'success.main' : 'error.main'}
                >
                  {indirectChange}% vs prior year
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom>
          Hours Trend Comparison
        </Typography>
        <Line data={chartData} options={{ responsive: true }} />
      </Paper>

      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom>
          Side-by-Side Comparison
        </Typography>
        <Bar data={comparisonData} options={{ responsive: true }} />
      </Paper>

      <Paper sx={{ padding: 3 }}>
        <Typography variant="h6" gutterBottom>
          Detailed Comparison
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Metric</strong></TableCell>
                <TableCell align="right"><strong>Current Year</strong></TableCell>
                <TableCell align="right"><strong>Prior Year</strong></TableCell>
                <TableCell align="right"><strong>Change</strong></TableCell>
                <TableCell align="right"><strong>% Change</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Total Hours</TableCell>
                <TableCell align="right">{currentTotal.toFixed(0)}</TableCell>
                <TableCell align="right">{priorTotal.toFixed(0)}</TableCell>
                <TableCell align="right">{(currentTotal - priorTotal).toFixed(0)}</TableCell>
                <TableCell align="right" sx={{ color: parseFloat(percentChange) >= 0 ? 'success.main' : 'error.main' }}>
                  {percentChange}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Direct Hours</TableCell>
                <TableCell align="right">{currentDirect.toFixed(0)}</TableCell>
                <TableCell align="right">{priorDirect.toFixed(0)}</TableCell>
                <TableCell align="right">{(currentDirect - priorDirect).toFixed(0)}</TableCell>
                <TableCell align="right" sx={{ color: parseFloat(directChange) >= 0 ? 'success.main' : 'error.main' }}>
                  {directChange}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Indirect Hours</TableCell>
                <TableCell align="right">{currentIndirect.toFixed(0)}</TableCell>
                <TableCell align="right">{priorIndirect.toFixed(0)}</TableCell>
                <TableCell align="right">{(currentIndirect - priorIndirect).toFixed(0)}</TableCell>
                <TableCell align="right" sx={{ color: parseFloat(indirectChange) >= 0 ? 'success.main' : 'error.main' }}>
                  {indirectChange}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Requested</TableCell>
                <TableCell align="right">{currentRequested.toFixed(0)}</TableCell>
                <TableCell align="right">{priorRequested.toFixed(0)}</TableCell>
                <TableCell align="right">{(currentRequested - priorRequested).toFixed(0)}</TableCell>
                <TableCell align="right" sx={{ color: parseFloat(requestedChange) >= 0 ? 'success.main' : 'error.main' }}>
                  {requestedChange}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Working</TableCell>
                <TableCell align="right">{currentWorking.toFixed(0)}</TableCell>
                <TableCell align="right">{priorWorking.toFixed(0)}</TableCell>
                <TableCell align="right">{(currentWorking - priorWorking).toFixed(0)}</TableCell>
                <TableCell align="right" sx={{ color: parseFloat(workingChange) >= 0 ? 'success.main' : 'error.main' }}>
                  {workingChange}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Fill Rate</TableCell>
                <TableCell align="right">{currentFillRate.toFixed(1)}%</TableCell>
                <TableCell align="right">{priorFillRate.toFixed(1)}%</TableCell>
                <TableCell align="right">{fillRateChange}%</TableCell>
                <TableCell align="right" sx={{ color: parseFloat(fillRateChange) >= 0 ? 'success.main' : 'error.main' }}>
                  {fillRateChange}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Data Points</TableCell>
                <TableCell align="right">{currentYearData.length}</TableCell>
                <TableCell align="right">{priorYearData.length}</TableCell>
                <TableCell align="right">{currentYearData.length - priorYearData.length}</TableCell>
                <TableCell align="right">-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default YOYComparison;
