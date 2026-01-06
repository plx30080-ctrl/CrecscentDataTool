import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const toNumber = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const encode = XLSX.utils.encode_cell;
const decodeRange = XLSX.utils.decode_range;

const getCell = (ws, r, c) => {
  const addr = encode({ r, c });
  return ws[addr]?.v;
};

const normalizeDay = (val) => {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  const map = {
    mon: 'monday', monday: 'monday',
    tue: 'tuesday', tuesday: 'tuesday',
    wed: 'wednesday', wednesday: 'wednesday',
    thu: 'thursday', thursday: 'thursday',
    fri: 'friday', friday: 'friday',
    sat: 'saturday', saturday: 'saturday',
    sun: 'sunday', sunday: 'sunday'
  };
  return map[s] || null;
};

const classifyLaborType = (rowValues) => {
  // Direct: 004-251-211, Indirect: 005-251-221
  const direct = rowValues.some(v => String(v).includes('004-251-211'));
  const indirect = rowValues.some(v => String(v).includes('005-251-221'));
  if (direct) return 'direct';
  if (indirect) return 'indirect';
  return 'indirect'; // default unknowns to indirect to avoid undercounting totals
};

const isTotalRow = (rowValues) => {
  const text = rowValues
    .slice(0, 10) // inspect first 10 columns for markers
    .map(v => (v == null ? '' : String(v).toLowerCase()))
    .join(' ');
  return (
    text.includes('total') ||
    text.includes('grand') ||
    text.includes('summary') ||
    text.includes('department total') ||
    text.includes('dept total')
  );
};

const isLikelyAssociateRow = (rowValues) => {
  // Presence of EID (4+ digits) or a name-like string in first 10 columns
  let hasEID = false;
  let hasName = false;
  for (let i = 0; i < Math.min(10, rowValues.length); i++) {
    const v = rowValues[i];
    if (v == null) continue;
    const sv = String(v).trim();
    if (/^\d{4,}$/.test(sv)) hasEID = true;
    if (!hasName && /[A-Za-z]/.test(sv) && sv.length > 2 && !sv.toLowerCase().includes('shift')) hasName = true;
  }
  return hasEID || hasName;
};

const parseDateFlexible = (val) => {
  if (val == null) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d && d.y && d.m && d.d) {
      return new Date(d.y, d.m - 1, d.d);
    }
  }
  const s = String(val);
  // Extract date substring if embedded in text
  const match = s.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\-\.\/]\d{1,2}[\-\.\/]\d{1,2})/);
  const candidate = match ? match[1] : s;
  const formats = ['MM/DD/YYYY','M/D/YYYY','MM-DD-YYYY','M-D-YYYY','YYYY-MM-DD','YYYY/M/D','YYYY/MM/DD','MM.DD.YYYY'];
  for (const fmt of formats) {
    const p = dayjs(candidate, fmt, true);
    if (p.isValid()) return p.toDate();
  }
  const p2 = dayjs(candidate);
  return p2.isValid() ? p2.toDate() : null;
};

const findWeekEnding = (ws, range, fileName = null) => {
  // Search first ~30 rows & 20 cols for a cell containing 'Week Ending' and a nearby date
  const maxR = Math.min(range.e.r, 30);
  const maxC = Math.min(range.e.c, 20);
  for (let r = range.s.r; r <= maxR; r++) {
    for (let c = range.s.c; c <= maxC; c++) {
      const v = getCell(ws, r, c);
      if (typeof v === 'string' && v.toLowerCase().includes('week ending')) {
        // Try same cell
        const sameParsed = parseDateFlexible(v);
        if (sameParsed) return sameParsed;
        // Try adjacent cells
        for (let dc = 1; dc <= 3; dc++) {
          const right = getCell(ws, r, c + dc);
          const parsed = parseDateFlexible(right);
          if (parsed) return parsed;
        }
      }
    }
  }
  // Fallback: scan top rows for any plausible date header
  for (let r = range.s.r; r <= maxR; r++) {
    for (let c = range.s.c; c <= maxC; c++) {
      const v = getCell(ws, r, c);
      const parsed = parseDateFlexible(v);
      if (parsed) return parsed;
    }
  }
  // Fallback: parse from file name
  if (fileName) {
    const nameParsed = parseDateFlexible(fileName);
    if (nameParsed) return nameParsed;
  }
  return null;
};

const findAssociateIdentity = (ws, r, range) => {
  // Heuristics: scan first 10 columns for name/eid/department code
  let name = null;
  let eid = null;
  let deptCode = null;
  const limitC = Math.min(range.e.c, 15);
  for (let c = range.s.c; c <= limitC; c++) {
    const v = getCell(ws, r, c);
    if (v == null) continue;
    const sv = String(v).trim();
    if (!deptCode && /\d{3}-\d{3}-\d{3}/.test(sv)) {
      deptCode = sv;
    }
    if (!eid && /^\d{4,}$/.test(sv)) {
      eid = sv;
    }
    if (!name && /[A-Za-z]/.test(sv) && sv.length > 3 && !sv.toLowerCase().includes('shift')) {
      name = sv;
    }
  }
  return { name, eid, deptCode };
};

export const parseLaborReportFile = (arrayBuffer, fileName = null) => {
  const workbook = XLSX.read(arrayBuffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = decodeRange(sheet['!ref']);

  // Map day -> { regCol, otCol }
  const dayCols = {};
  const dayHeaderRow = 3; // Row 4 in Excel (0-based)
  const headerRow = 4; // Row 5 in Excel (0-based)

  for (let c = range.s.c; c <= range.e.c; c++) {
    const dayLabel = normalizeDay(getCell(sheet, dayHeaderRow, c));
    if (!dayLabel) continue;
    const headerLabel = String(getCell(sheet, headerRow, c) || '').toLowerCase();
    if (!dayCols[dayLabel]) dayCols[dayLabel] = {};
    if (headerLabel.includes('reg')) dayCols[dayLabel].regCol = c;
    if (headerLabel.includes('ot')) dayCols[dayLabel].otCol = c;
  }

  // Initialize breakdown structure
  const dailyBreakdown = {};
  DAYS.forEach(d => {
    dailyBreakdown[d] = {
      shift1: { direct: 0, indirect: 0, total: 0 },
      shift2: { direct: 0, indirect: 0, total: 0 },
      total: 0
    };
  });

  const employeeDetails = [];
  let employeeCount = 0;
  let currentShift = 'shift1';

  // Detect week ending
  let weekEnding = findWeekEnding(sheet, range, fileName);

  // Iterate data rows starting after headers (row index 5 onward)
  for (let r = Math.max(headerRow + 1, 5); r <= range.e.r; r++) {
    const colC = getCell(sheet, r, 2);
    if (typeof colC === 'string') {
      const s = colC.toLowerCase();
      if (s.includes('shift 1 total')) {
        currentShift = 'shift2';
        continue; // skip total row
      }
      if (s.includes('shift 2 total')) {
        currentShift = 'shift1'; // reset for potential next block
        continue; // skip total row
      }
    }

    // Build row values snapshot for classification & filters
    const rowVals = [];
    for (let c = range.s.c; c <= Math.min(range.e.c, 50); c++) {
      rowVals.push(getCell(sheet, r, c));
    }
    if (isTotalRow(rowVals)) {
      // Skip any totals/summary rows
      continue;
    }
    if (!isLikelyAssociateRow(rowVals)) {
      // Skip non-associate rows (headers, blanks, etc.)
      continue;
    }

    const laborType = classifyLaborType(rowVals);

    // Per-day totals for this associate
    const associateDaily = {};
    let weeklyTotal = 0;

    DAYS.forEach(day => {
      const cols = dayCols[day];
      if (!cols || (cols.regCol == null && cols.otCol == null)) {
        associateDaily[day] = { reg: 0, ot: 0, total: 0 };
        return;
      }
      const reg = toNumber(getCell(sheet, r, cols.regCol));
      const ot = toNumber(getCell(sheet, r, cols.otCol));
      const total = reg + ot;
      associateDaily[day] = { reg, ot, total };
      weeklyTotal += total;
    });

    if (weeklyTotal <= 0) continue; // skip empty rows
    employeeCount += 1;

    // Aggregate into dailyBreakdown
    DAYS.forEach(day => {
      const { total } = associateDaily[day];
      if (total > 0) {
        if (currentShift === 'shift1') {
          dailyBreakdown[day].shift1[laborType] += total;
        } else {
          dailyBreakdown[day].shift2[laborType] += total;
        }
      }
    });

    // Capture associate identity (best-effort)
    const ident = findAssociateIdentity(sheet, r, range);
    employeeDetails.push({
      eid: ident.eid || null,
      name: ident.name || null,
      deptCode: ident.deptCode || null,
      laborType: laborType === 'direct' ? 'Direct' : 'Indirect',
      shift: currentShift === 'shift1' ? '1st' : '2nd',
      daily: associateDaily,
      weeklyTotal
    });
  }

  // Compute totals per day & week
  let directHours = 0;
  let indirectHours = 0;
  let totalHours = 0;

  DAYS.forEach(day => {
    const d = dailyBreakdown[day];
    d.shift1.total = d.shift1.direct + d.shift1.indirect;
    d.shift2.total = d.shift2.direct + d.shift2.indirect;
    d.total = d.shift1.total + d.shift2.total;
    directHours += d.shift1.direct + d.shift2.direct;
    indirectHours += d.shift1.indirect + d.shift2.indirect;
    totalHours += d.total;
  });

  return {
    weekEnding,
    fileName,
    totalHours,
    directHours,
    indirectHours,
    employeeCount,
    dailyBreakdown,
    employeeDetails
  };
};
