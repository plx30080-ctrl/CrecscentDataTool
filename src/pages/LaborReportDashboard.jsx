import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Button
} from '@mui/material';
import { Assessment, TrendingUp, Download } from '@mui/icons-material';
import { getAllLaborReports } from '../services/laborReportService';
import { exportLaborReportToExcel } from '../utils/exportUtils';
import dayjs from 'dayjs';

const LaborReportDashboard = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const result = await getAllLaborReports(12); // Get last 12 reports

    if (result.success) {
      setReports(result.data);
      if (result.data.length > 0) {
        setSelectedReport(result.data[0]); // Select most recent by default
      }
    } else {
      setError(result.error || 'Failed to load labor reports');
    }
    setLoading(false);
  };

  const handleReportChange = (event) => {
    const reportId = event.target.value;
    const report = reports.find(r => r.id === reportId);
    setSelectedReport(report);
  };

  const calculateWeeklyTotals = (dailyBreakdown) => {
    if (!dailyBreakdown) return null;

    const totals = {
      shift1Direct: 0,
      shift1Indirect: 0,
      shift1Total: 0,
      shift2Direct: 0,
      shift2Indirect: 0,
      shift2Total: 0,
      weekTotal: 0
    };

    Object.values(dailyBreakdown).forEach(day => {
      totals.shift1Direct += day.shift1?.direct || 0;
      totals.shift1Indirect += day.shift1?.indirect || 0;
      totals.shift1Total += day.shift1?.total || 0;
      totals.shift2Direct += day.shift2?.direct || 0;
      totals.shift2Indirect += day.shift2?.indirect || 0;
      totals.shift2Total += day.shift2?.total || 0;
      totals.weekTotal += day.total || 0;
    });

    return totals;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ marginTop: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (reports.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ marginTop: 4 }}>
        <Alert severity="info">No labor reports found. Upload your first report from the Data Entry page.</Alert>
      </Container>
    );
  }

  const weeklyTotals = selectedReport?.dailyBreakdown ? calculateWeeklyTotals(selectedReport.dailyBreakdown) : null;

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
        <Assessment sx={{ fontSize: 40, marginRight: 2, color: 'primary.main' }} />
        <Typography variant="h4">Labor Report Dashboard</Typography>
      </Box>

      {/* Report Selector */}
      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Report</InputLabel>
              <Select
                value={selectedReport?.id || ''}
                label="Select Report"
                onChange={handleReportChange}
              >
                {reports.map((report) => (
                  <MenuItem key={report.id} value={report.id}>
                    Week Ending: {dayjs(report.weekEnding).format('MMM D, YYYY')}
                    {' '}({report.totalHours.toFixed(0)} hours, {report.employeeCount} employees)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {selectedReport && (
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Week Ending: ${dayjs(selectedReport.weekEnding).format('MMM D, YYYY')}`} color="primary" />
                  <Chip label={`${selectedReport.employeeCount} Employees`} />
                  <Chip label={`Submitted by: ${selectedReport.submittedBy}`} variant="outlined" />
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => exportLaborReportToExcel(selectedReport)}
                  size="small"
                >
                  Export to Excel
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {selectedReport && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ marginBottom: 3 }}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ padding: 3, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
                <Typography variant="h4" color="primary.main">
                  {selectedReport.totalHours.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Hours
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ padding: 3, textAlign: 'center', backgroundColor: '#e8f5e9' }}>
                <Typography variant="h4" color="success.main">
                  {selectedReport.directHours.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Direct Hours
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ padding: 3, textAlign: 'center', backgroundColor: '#fff3e0' }}>
                <Typography variant="h4" color="warning.main">
                  {selectedReport.indirectHours.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Indirect Hours
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ padding: 3, textAlign: 'center', backgroundColor: '#f3e5f5' }}>
                <Typography variant="h4" color="secondary.main">
                  {selectedReport.employeeCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Employees
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Daily Breakdown Table */}
          {selectedReport.dailyBreakdown && (
            <Paper sx={{ padding: 3, marginBottom: 3 }}>
              <Typography variant="h6" gutterBottom>
                Daily Breakdown by Shift
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Day</strong></TableCell>
                      <TableCell align="right"><strong>1st Shift Direct</strong></TableCell>
                      <TableCell align="right"><strong>1st Shift Indirect</strong></TableCell>
                      <TableCell align="right"><strong>1st Shift Total</strong></TableCell>
                      <TableCell align="right"><strong>2nd Shift Direct</strong></TableCell>
                      <TableCell align="right"><strong>2nd Shift Indirect</strong></TableCell>
                      <TableCell align="right"><strong>2nd Shift Total</strong></TableCell>
                      <TableCell align="right"><strong>Day Total</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                      const dayData = selectedReport.dailyBreakdown[day];
                      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                      return (
                        <TableRow key={day}>
                          <TableCell><strong>{dayName}</strong></TableCell>
                          <TableCell align="right">{dayData.shift1?.direct?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right">{dayData.shift1?.indirect?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right"><strong>{dayData.shift1?.total?.toFixed(2) || '0.00'}</strong></TableCell>
                          <TableCell align="right">{dayData.shift2?.direct?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right">{dayData.shift2?.indirect?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell align="right"><strong>{dayData.shift2?.total?.toFixed(2) || '0.00'}</strong></TableCell>
                          <TableCell align="right"><strong>{dayData.total?.toFixed(2) || '0.00'}</strong></TableCell>
                        </TableRow>
                      );
                    })}
                    {weeklyTotals && (
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Week Total</strong></TableCell>
                        <TableCell align="right"><strong>{weeklyTotals.shift1Direct.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>{weeklyTotals.shift1Indirect.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>{weeklyTotals.shift1Total.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>{weeklyTotals.shift2Direct.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>{weeklyTotals.shift2Indirect.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>{weeklyTotals.shift2Total.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>{weeklyTotals.weekTotal.toFixed(2)}</strong></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Shift Comparison */}
          {weeklyTotals && (
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>
                <TrendingUp sx={{ verticalAlign: 'middle', marginRight: 1 }} />
                Shift Performance Metrics
              </Typography>
              <Grid container spacing={3} sx={{ marginTop: 1 }}>
                <Grid item xs={12} md={6}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>1st Shift Metrics</strong></TableCell>
                          <TableCell align="right"><strong>Hours</strong></TableCell>
                          <TableCell align="right"><strong>% of Total</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Direct Hours</TableCell>
                          <TableCell align="right">{weeklyTotals.shift1Direct.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            {((weeklyTotals.shift1Direct / weeklyTotals.weekTotal) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Indirect Hours</TableCell>
                          <TableCell align="right">{weeklyTotals.shift1Indirect.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            {((weeklyTotals.shift1Indirect / weeklyTotals.weekTotal) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>Total Hours</strong></TableCell>
                          <TableCell align="right"><strong>{weeklyTotals.shift1Total.toFixed(2)}</strong></TableCell>
                          <TableCell align="right"><strong>
                            {((weeklyTotals.shift1Total / weeklyTotals.weekTotal) * 100).toFixed(1)}%
                          </strong></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Efficiency Ratio</TableCell>
                          <TableCell align="right" colSpan={2}>
                            {weeklyTotals.shift1Total > 0
                              ? `${((weeklyTotals.shift1Direct / weeklyTotals.shift1Total) * 100).toFixed(1)}% Direct`
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>2nd Shift Metrics</strong></TableCell>
                          <TableCell align="right"><strong>Hours</strong></TableCell>
                          <TableCell align="right"><strong>% of Total</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Direct Hours</TableCell>
                          <TableCell align="right">{weeklyTotals.shift2Direct.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            {((weeklyTotals.shift2Direct / weeklyTotals.weekTotal) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Indirect Hours</TableCell>
                          <TableCell align="right">{weeklyTotals.shift2Indirect.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            {((weeklyTotals.shift2Indirect / weeklyTotals.weekTotal) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>Total Hours</strong></TableCell>
                          <TableCell align="right"><strong>{weeklyTotals.shift2Total.toFixed(2)}</strong></TableCell>
                          <TableCell align="right"><strong>
                            {((weeklyTotals.shift2Total / weeklyTotals.weekTotal) * 100).toFixed(1)}%
                          </strong></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Efficiency Ratio</TableCell>
                          <TableCell align="right" colSpan={2}>
                            {weeklyTotals.shift2Total > 0
                              ? `${((weeklyTotals.shift2Direct / weeklyTotals.shift2Total) * 100).toFixed(1)}% Direct`
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Paper>
          )}
        </>
      )}
    </Container>
  );
};

export default LaborReportDashboard;
