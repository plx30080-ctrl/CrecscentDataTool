import React, { useState } from 'react';
import logger from '../../utils/logger';
import {
  Box,
  Grid,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Upload as UploadIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { submitLaborReport } from '../../services/dataEntryService';

const LaborReportForm = () => {
  const [formData, setFormData] = useState({
    weekEnding: dayjs()
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (validTypes.includes(file.type)) {
        setUploadedFile(file);
        setLoading(true);
        setMessage({ type: 'info', text: 'Parsing file...' });

        try {
          // Parse the file
          const XLSX = await import('xlsx');
          const reader = new FileReader();

          reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Calculate totals
            const totals = calculateHours(jsonData);
            setParsedData(totals);
            setMessage({
              type: 'success',
              text: `File parsed successfully! ${totals.employeeCount} employees, ${totals.totalHours.toFixed(2)} total hours.`
            });
            setLoading(false);
          };

          reader.readAsArrayBuffer(file);
        } catch (error) {
          logger.error('Parse error:', error);
          setMessage({ type: 'error', text: 'Failed to parse file' });
          setLoading(false);
        }
      } else {
        setMessage({ type: 'error', text: 'Please upload a valid Excel file (.xls or .xlsx)' });
        event.target.value = '';
      }
    }
  };

  const calculateHours = (data) => {
    logger.debug('=== Labor Report Parser Debug ===');
    logger.debug('Total rows in file:', data.length);

    // Log first 10 rows for debugging
    logger.debug('\nFirst 10 rows:');
    data.slice(0, 10).forEach((row, i) => {
      logger.debug(`Row ${i}:`, row);
    });

    let directHours = 0;
    let indirectHours = 0;
    let totalHours = 0;
    let employeeCount = 0;
    const employeeIds = []; // Track all EIDs for applicant status sync

    // Daily breakdown structure with shift-level granularity
    const dailyBreakdown = {
      monday: {
        shift1: { direct: 0, indirect: 0, total: 0 },
        shift2: { direct: 0, indirect: 0, total: 0 },
        direct: 0, indirect: 0, total: 0
      },
      tuesday: {
        shift1: { direct: 0, indirect: 0, total: 0 },
        shift2: { direct: 0, indirect: 0, total: 0 },
        direct: 0, indirect: 0, total: 0
      },
      wednesday: {
        shift1: { direct: 0, indirect: 0, total: 0 },
        shift2: { direct: 0, indirect: 0, total: 0 },
        direct: 0, indirect: 0, total: 0
      },
      thursday: {
        shift1: { direct: 0, indirect: 0, total: 0 },
        shift2: { direct: 0, indirect: 0, total: 0 },
        direct: 0, indirect: 0, total: 0
      },
      friday: {
        shift1: { direct: 0, indirect: 0, total: 0 },
        shift2: { direct: 0, indirect: 0, total: 0 },
        direct: 0, indirect: 0, total: 0
      },
      saturday: {
        shift1: { direct: 0, indirect: 0, total: 0 },
        shift2: { direct: 0, indirect: 0, total: 0 },
        direct: 0, indirect: 0, total: 0
      },
      sunday: {
        shift1: { direct: 0, indirect: 0, total: 0 },
        shift2: { direct: 0, indirect: 0, total: 0 },
        direct: 0, indirect: 0, total: 0
      }
    };

    // Employee details for granular tracking
    const employeeDetails = [];

    // Try multiple strategies to find the data start

    // Strategy 1: Look for "regular" in any cell
    let startRow = data.findIndex(row =>
      row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('regular'))
    );

    // Strategy 2: Look for "dept" or "department" (common header)
    if (startRow === -1) {
      startRow = data.findIndex(row =>
        row.some(cell => typeof cell === 'string' && (
          cell.toLowerCase().includes('dept') ||
          cell.toLowerCase().includes('name') && row.some(c => typeof c === 'string' && c.toLowerCase().includes('hours'))
        ))
      );
    }

    // Strategy 3: Look for first row with numbers in multiple columns (likely employee data)
    if (startRow === -1) {
      startRow = data.findIndex((row, idx) => {
        if (idx < 5) return false; // Skip first 5 rows (likely headers/title)
        const numberCount = row.filter(cell => !isNaN(parseFloat(cell)) && cell !== '').length;
        return numberCount >= 3; // At least 3 numeric cells
      });
      if (startRow !== -1) startRow--; // Go back one row to include the header
    }

    logger.debug('\nData start row:', startRow);

    if (startRow === -1) {
      logger.warn('Could not find data start row!');
      return { directHours: 0, indirectHours: 0, totalHours: 0, employeeCount: 0, employeeIds: [] };
    }

    // Process each employee row
    for (let i = startRow + 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows (but continue processing)
      if (!row || row.length === 0) {
        logger.debug(`Skipping empty row ${i}`);
        continue;
      }

      // Skip rows that don't look like employee data (no numbers)
      const hasNumbers = row.some(cell => !isNaN(parseFloat(cell)) && cell !== '');
      if (!hasNumbers) {
        logger.debug(`Skipping row ${i} (no numbers):`, row);
        continue;
      }

      // Skip "Total" rows (shift totals, dept totals, grand totals)
      const deptCode = row[0] ? String(row[0]).trim() : '';
      const nameCell = row[2] ? String(row[2]).trim().toUpperCase() : '';

      if (nameCell.includes('TOTAL') || nameCell.includes('GRAND')) {
        logger.debug(`Skipping total row ${i}: ${deptCode} ${nameCell}`);
        continue;
      }

      employeeCount++;
      logger.debug(`Processing employee row ${i}:`, row);

      // Extract EID from column 1 (File/EID column)
      let eid = null;
      const potential = row[1] ? String(row[1]).trim() : null;
      if (potential && !isNaN(potential) && potential.length >= 5 && potential.length <= 8) {
        eid = potential;
        employeeIds.push(eid);
      }

      // Determine shift based on row position
      // Based on user's description:
      // 1st shift: rows 7-97 (direct: 7-92, indirect: 94-97)
      // 2nd shift: rows 101-194 (direct: 101-188, indirect: 190-194)
      // Adjust for 0-based vs 1-based indexing if needed
      let shift = 1; // default to 1st shift
      if (i >= 100) {
        shift = 2; // 2nd shift starts around row 100+
      }
      const shiftKey = shift === 1 ? 'shift1' : 'shift2';

      // Determine if Direct or Indirect based on dept code
      const isDirect = deptCode.startsWith('004');
      const isIndirect = deptCode.startsWith('005');
      const laborType = isDirect ? 'direct' : (isIndirect ? 'indirect' : 'direct');

      // Extract daily hours (each day has 6 columns: Reg Hrs, Reg $, OT Hrs, OT $, DT Hrs, DT $)
      // We only need the hour columns (skip $ columns)
      const extractDayHours = (startCol) => {
        const regHrs = parseFloat(row[startCol]) || 0;     // Reg Hrs
        const otHrs = parseFloat(row[startCol + 2]) || 0;   // OT Hrs (skip Reg $)
        const dtHrs = parseFloat(row[startCol + 4]) || 0;   // DT Hrs (skip OT $)
        return { regHrs, otHrs, dtHrs, total: regHrs + otHrs + dtHrs };
      };

      const monday = extractDayHours(4);
      const tuesday = extractDayHours(10);
      const wednesday = extractDayHours(16);
      const thursday = extractDayHours(22);
      const friday = extractDayHours(28);
      const saturday = extractDayHours(34);
      const sunday = extractDayHours(40);

      // Weekly totals from columns 46-48
      const weeklyRegHrs = parseFloat(row[46]) || 0;
      const weeklyOtHrs = parseFloat(row[47]) || 0;
      const weeklyDtHrs = parseFloat(row[48]) || 0;
      const employeeWeeklyTotal = weeklyRegHrs + weeklyOtHrs + weeklyDtHrs;

      // Update daily breakdowns (shift-level + totals)
      dailyBreakdown.monday[shiftKey][laborType] += monday.total;
      dailyBreakdown.monday[shiftKey].total += monday.total;
      dailyBreakdown.monday[laborType] += monday.total;
      dailyBreakdown.monday.total += monday.total;

      dailyBreakdown.tuesday[shiftKey][laborType] += tuesday.total;
      dailyBreakdown.tuesday[shiftKey].total += tuesday.total;
      dailyBreakdown.tuesday[laborType] += tuesday.total;
      dailyBreakdown.tuesday.total += tuesday.total;

      dailyBreakdown.wednesday[shiftKey][laborType] += wednesday.total;
      dailyBreakdown.wednesday[shiftKey].total += wednesday.total;
      dailyBreakdown.wednesday[laborType] += wednesday.total;
      dailyBreakdown.wednesday.total += wednesday.total;

      dailyBreakdown.thursday[shiftKey][laborType] += thursday.total;
      dailyBreakdown.thursday[shiftKey].total += thursday.total;
      dailyBreakdown.thursday[laborType] += thursday.total;
      dailyBreakdown.thursday.total += thursday.total;

      dailyBreakdown.friday[shiftKey][laborType] += friday.total;
      dailyBreakdown.friday[shiftKey].total += friday.total;
      dailyBreakdown.friday[laborType] += friday.total;
      dailyBreakdown.friday.total += friday.total;

      dailyBreakdown.saturday[shiftKey][laborType] += saturday.total;
      dailyBreakdown.saturday[shiftKey].total += saturday.total;
      dailyBreakdown.saturday[laborType] += saturday.total;
      dailyBreakdown.saturday.total += saturday.total;

      dailyBreakdown.sunday[shiftKey][laborType] += sunday.total;
      dailyBreakdown.sunday[shiftKey].total += sunday.total;
      dailyBreakdown.sunday[laborType] += sunday.total;
      dailyBreakdown.sunday.total += sunday.total;

      // Store employee details
      employeeDetails.push({
        eid,
        name: nameCell,
        deptCode,
        laborType,
        shift,
        daily: { monday, tuesday, wednesday, thursday, friday, saturday, sunday },
        weeklyTotal: employeeWeeklyTotal
      });

      logger.debug(`  Row ${i} | EID: ${eid}, Dept: ${deptCode}, Shift: ${shift}, Type: ${laborType}, Weekly Total: ${employeeWeeklyTotal}h`);
      logger.debug(`    Mon: ${monday.total}h, Tue: ${tuesday.total}h, Wed: ${wednesday.total}h, Thu: ${thursday.total}h, Fri: ${friday.total}h, Sat: ${saturday.total}h, Sun: ${sunday.total}h`);

      // Update totals
      totalHours += employeeWeeklyTotal;
      if (isDirect) {
        directHours += employeeWeeklyTotal;
      } else if (isIndirect) {
        indirectHours += employeeWeeklyTotal;
      } else {
        directHours += employeeWeeklyTotal;
      }
    }

    logger.debug('\n=== Parse Results ===');
    logger.debug('Employees found:', employeeCount);
    logger.debug('Total hours:', totalHours);
    logger.debug('Direct hours:', directHours);
    logger.debug('Indirect hours:', indirectHours);
    logger.debug('Employee IDs:', employeeIds);

    logger.debug('\n=== Daily Breakdown (All Days) ===');
    logger.debug('Monday:', dailyBreakdown.monday);
    logger.debug('Tuesday:', dailyBreakdown.tuesday);
    logger.debug('Wednesday:', dailyBreakdown.wednesday);
    logger.debug('Thursday:', dailyBreakdown.thursday);
    logger.debug('Friday:', dailyBreakdown.friday);
    logger.debug('Saturday:', dailyBreakdown.saturday);
    logger.debug('Sunday:', dailyBreakdown.sunday);

    logger.debug('\n=== Per-Shift Daily Breakdown ===');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const dayData = dailyBreakdown[day];
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      logger.debug(`\n${dayName}:`);
      logger.debug(`  1st Shift Direct:   ${dayData.shift1.direct.toFixed(2)}h`);
      logger.debug(`  1st Shift Indirect: ${dayData.shift1.indirect.toFixed(2)}h`);
      logger.debug(`  1st Shift Total:    ${dayData.shift1.total.toFixed(2)}h`);
      logger.debug(`  2nd Shift Direct:   ${dayData.shift2.direct.toFixed(2)}h`);
      logger.debug(`  2nd Shift Indirect: ${dayData.shift2.indirect.toFixed(2)}h`);
      logger.debug(`  2nd Shift Total:    ${dayData.shift2.total.toFixed(2)}h`);
      logger.debug(`  Day Total:          ${dayData.total.toFixed(2)}h (Direct: ${dayData.direct.toFixed(2)}h, Indirect: ${dayData.indirect.toFixed(2)}h)`);
    });

    return {
      directHours: Math.round(directHours * 100) / 100,
      indirectHours: Math.round(indirectHours * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      employeeCount,
      employeeIds: [...new Set(employeeIds)], // Remove duplicates
      dailyBreakdown,
      employeeDetails
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!uploadedFile || !parsedData) {
      setMessage({ type: 'error', text: 'Please upload and parse a file first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await submitLaborReport({
        ...formData,
        ...parsedData,
        fileName: uploadedFile.name
      });

      if (result.success) {
        const statusMessage = result.statusesUpdated > 0
          ? `Labor report submitted successfully! ${result.statusesUpdated} applicant(s) marked as "Started".`
          : 'Labor report submitted successfully!';

        setMessage({
          type: 'success',
          text: statusMessage
        });

        // Reset form
        setFormData({ weekEnding: dayjs() });
        setUploadedFile(null);
        setParsedData(null);
        document.getElementById('labor-file-upload').value = '';
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit report' });
      }
    } catch (error) {
      logger.error('Submit error:', error);
      setMessage({ type: 'error', text: error.message || 'An error occurred during submission' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Labor Report Upload
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Week Ending Date */}
        <Grid item xs={12} md={6}>
          <DatePicker
            label="Week Ending"
            value={formData.weekEnding}
            onChange={(newValue) => setFormData(prev => ({ ...prev, weekEnding: newValue }))}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />
        </Grid>

        {/* File Upload */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Upload Labor Report Excel File
              <input
                id="labor-file-upload"
                type="file"
                hidden
                accept=".xls,.xlsx"
                onChange={handleFileUpload}
              />
            </Button>
            {uploadedFile && (
              <Typography variant="body2" color="text.secondary">
                {uploadedFile.name}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Upload weekly labor report to auto-calculate hours
          </Typography>
        </Grid>

        {/* Parsed Data Summary */}
        {parsedData && (
          <>
            <Grid item xs={12}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Metric</strong></TableCell>
                      <TableCell align="right"><strong>Hours</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Direct Hours</TableCell>
                      <TableCell align="right">{parsedData.directHours.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Indirect Hours</TableCell>
                      <TableCell align="right">{parsedData.indirectHours.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Total Hours</strong></TableCell>
                      <TableCell align="right"><strong>{parsedData.totalHours.toFixed(2)}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Employees</TableCell>
                      <TableCell align="right">{parsedData.employeeCount}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Per-Shift Totals */}
            {parsedData.dailyBreakdown && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  <strong>Shift Totals</strong>
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Shift</strong></TableCell>
                        <TableCell align="right"><strong>Direct Hours</strong></TableCell>
                        <TableCell align="right"><strong>Indirect Hours</strong></TableCell>
                        <TableCell align="right"><strong>Total Hours</strong></TableCell>
                        <TableCell align="right"><strong>% of Total</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>1st Shift</strong></TableCell>
                        <TableCell align="right">
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + (day.shift1?.direct || 0), 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + (day.shift1?.indirect || 0), 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + (day.shift1?.total || 0), 0).toFixed(2)}
                          </strong>
                        </TableCell>
                        <TableCell align="right">
                          {((Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + (day.shift1?.total || 0), 0) / parsedData.totalHours) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>2nd Shift</strong></TableCell>
                        <TableCell align="right">
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + (day.shift2?.direct || 0), 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + (day.shift2?.indirect || 0), 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + (day.shift2?.total || 0), 0).toFixed(2)}
                          </strong>
                        </TableCell>
                        <TableCell align="right">
                          {((Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + (day.shift2?.total || 0), 0) / parsedData.totalHours) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Overall Total</strong></TableCell>
                        <TableCell align="right"><strong>{parsedData.directHours.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>{parsedData.indirectHours.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>{parsedData.totalHours.toFixed(2)}</strong></TableCell>
                        <TableCell align="right"><strong>100.0%</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}

            {/* Daily Breakdown by Shift */}
            {parsedData.dailyBreakdown && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  <strong>Daily Breakdown by Shift</strong>
                </Typography>
                <TableContainer component={Paper} variant="outlined">
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
                        const dayData = parsedData.dailyBreakdown[day];
                        const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                        return (
                          <TableRow key={day}>
                            <TableCell><strong>{dayName}</strong></TableCell>
                            <TableCell align="right">{dayData.shift1.direct.toFixed(2)}</TableCell>
                            <TableCell align="right">{dayData.shift1.indirect.toFixed(2)}</TableCell>
                            <TableCell align="right"><strong>{dayData.shift1.total.toFixed(2)}</strong></TableCell>
                            <TableCell align="right">{dayData.shift2.direct.toFixed(2)}</TableCell>
                            <TableCell align="right">{dayData.shift2.indirect.toFixed(2)}</TableCell>
                            <TableCell align="right"><strong>{dayData.shift2.total.toFixed(2)}</strong></TableCell>
                            <TableCell align="right"><strong>{dayData.total.toFixed(2)}</strong></TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Week Total</strong></TableCell>
                        <TableCell align="right"><strong>
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + day.shift1.direct, 0).toFixed(2)}
                        </strong></TableCell>
                        <TableCell align="right"><strong>
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + day.shift1.indirect, 0).toFixed(2)}
                        </strong></TableCell>
                        <TableCell align="right"><strong>
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + day.shift1.total, 0).toFixed(2)}
                        </strong></TableCell>
                        <TableCell align="right"><strong>
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + day.shift2.direct, 0).toFixed(2)}
                        </strong></TableCell>
                        <TableCell align="right"><strong>
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + day.shift2.indirect, 0).toFixed(2)}
                        </strong></TableCell>
                        <TableCell align="right"><strong>
                          {Object.values(parsedData.dailyBreakdown).reduce((sum, day) => sum + day.shift2.total, 0).toFixed(2)}
                        </strong></TableCell>
                        <TableCell align="right"><strong>
                          {parsedData.totalHours.toFixed(2)}
                        </strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            )}
          </>
        )}

        {/* Submit Button */}
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !parsedData}
            sx={{ minWidth: 200 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Labor Report'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LaborReportForm;
