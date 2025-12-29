import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

/**
 * Export labor report to Excel
 * @param {Object} report - Labor report data
 * @returns {void}
 */
export const exportLaborReportToExcel = (report) => {
  if (!report) return;

  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Crescent Management Platform - Labor Report'],
    [''],
    ['Week Ending:', dayjs(report.weekEnding).format('MMM D, YYYY')],
    ['Submitted By:', report.submittedBy],
    ['Submitted At:', dayjs(report.submittedAt).format('MMM D, YYYY h:mm A')],
    ['File Name:', report.fileName || 'N/A'],
    [''],
    ['Summary'],
    ['Total Hours:', report.totalHours.toFixed(2)],
    ['Direct Hours:', report.directHours.toFixed(2)],
    ['Indirect Hours:', report.indirectHours.toFixed(2)],
    ['Employee Count:', report.employeeCount],
    ['Direct %:', ((report.directHours / report.totalHours) * 100).toFixed(1) + '%'],
    ['Indirect %:', ((report.indirectHours / report.totalHours) * 100).toFixed(1) + '%']
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Daily Breakdown Sheet
  if (report.dailyBreakdown) {
    const dailyData = [
      ['Daily Breakdown by Shift'],
      [''],
      ['Day', '1st Shift Direct', '1st Shift Indirect', '1st Shift Total', '2nd Shift Direct', '2nd Shift Indirect', '2nd Shift Total', 'Day Total']
    ];

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const dayData = report.dailyBreakdown[day];
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      dailyData.push([
        dayName,
        dayData.shift1?.direct?.toFixed(2) || '0.00',
        dayData.shift1?.indirect?.toFixed(2) || '0.00',
        dayData.shift1?.total?.toFixed(2) || '0.00',
        dayData.shift2?.direct?.toFixed(2) || '0.00',
        dayData.shift2?.indirect?.toFixed(2) || '0.00',
        dayData.shift2?.total?.toFixed(2) || '0.00',
        dayData.total?.toFixed(2) || '0.00'
      ]);
    });

    // Week totals
    const weekTotals = {
      shift1Direct: 0,
      shift1Indirect: 0,
      shift1Total: 0,
      shift2Direct: 0,
      shift2Indirect: 0,
      shift2Total: 0,
      weekTotal: 0
    };

    Object.values(report.dailyBreakdown).forEach(day => {
      weekTotals.shift1Direct += day.shift1?.direct || 0;
      weekTotals.shift1Indirect += day.shift1?.indirect || 0;
      weekTotals.shift1Total += day.shift1?.total || 0;
      weekTotals.shift2Direct += day.shift2?.direct || 0;
      weekTotals.shift2Indirect += day.shift2?.indirect || 0;
      weekTotals.shift2Total += day.shift2?.total || 0;
      weekTotals.weekTotal += day.total || 0;
    });

    dailyData.push([
      'Week Total',
      weekTotals.shift1Direct.toFixed(2),
      weekTotals.shift1Indirect.toFixed(2),
      weekTotals.shift1Total.toFixed(2),
      weekTotals.shift2Direct.toFixed(2),
      weekTotals.shift2Indirect.toFixed(2),
      weekTotals.shift2Total.toFixed(2),
      weekTotals.weekTotal.toFixed(2)
    ]);

    const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Breakdown');
  }

  // Employee Details Sheet
  if (report.employeeDetails && report.employeeDetails.length > 0) {
    const employeeData = [
      ['Employee Details'],
      [''],
      ['EID', 'Name', 'Dept Code', 'Labor Type', 'Shift', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Weekly Total']
    ];

    report.employeeDetails.forEach(emp => {
      employeeData.push([
        emp.eid || 'N/A',
        emp.name || 'N/A',
        emp.deptCode || 'N/A',
        emp.laborType || 'N/A',
        emp.shift || 'N/A',
        emp.daily?.monday?.total?.toFixed(2) || '0.00',
        emp.daily?.tuesday?.total?.toFixed(2) || '0.00',
        emp.daily?.wednesday?.total?.toFixed(2) || '0.00',
        emp.daily?.thursday?.total?.toFixed(2) || '0.00',
        emp.daily?.friday?.total?.toFixed(2) || '0.00',
        emp.daily?.saturday?.total?.toFixed(2) || '0.00',
        emp.daily?.sunday?.total?.toFixed(2) || '0.00',
        emp.weeklyTotal?.toFixed(2) || '0.00'
      ]);
    });

    const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
    XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employee Details');
  }

  // Download file
  const fileName = `Labor_Report_${dayjs(report.weekEnding).format('YYYY-MM-DD')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Export multiple labor reports to Excel
 * @param {Array} reports - Array of labor report data
 * @returns {void}
 */
export const exportMultipleLaborReportsToExcel = (reports) => {
  if (!reports || reports.length === 0) return;

  const workbook = XLSX.utils.book_new();

  // Summary comparison sheet
  const comparisonData = [
    ['Labor Reports Comparison'],
    [''],
    ['Week Ending', 'Total Hours', 'Direct Hours', 'Indirect Hours', 'Employee Count', 'Direct %', 'Submitted By']
  ];

  reports.forEach(report => {
    comparisonData.push([
      dayjs(report.weekEnding).format('MMM D, YYYY'),
      report.totalHours.toFixed(2),
      report.directHours.toFixed(2),
      report.indirectHours.toFixed(2),
      report.employeeCount,
      ((report.directHours / report.totalHours) * 100).toFixed(1) + '%',
      report.submittedBy
    ]);
  });

  const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Comparison');

  // Download file
  const fileName = `Labor_Reports_Comparison_${dayjs().format('YYYY-MM-DD')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
