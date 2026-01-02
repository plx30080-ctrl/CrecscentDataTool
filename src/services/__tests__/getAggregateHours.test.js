import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';

// Partially mock Firestore functions so getHoursData won't hit network
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDocs: vi.fn(),
    query: vi.fn(),
    collection: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    Timestamp: { fromDate: (d) => d }
  };
});

import * as firestoreFns from 'firebase/firestore';
import * as service from '../firestoreService';

describe('getAggregateHours (integration style)', () => {
  const START = new Date('2025-01-01');
  const END = new Date('2025-01-31');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('includes labor reports (daily breakdown) into aggregated results', async () => {
    // Provide one hours doc via mocked getDocs for hoursData (used by getHoursData)
    const hoursDoc = {
      id: 'h1',
      data: () => ({ date: { toDate: () => new Date('2025-01-10') }, totalHours: 8, shift1Hours: 8, shift2Hours: 0, directHours: 6, indirectHours: 2 })
    };
    firestoreFns.getDocs.mockResolvedValue({ docs: [hoursDoc] });

    // Mock the laborReportService helper to return laborReports
    const laborReports = [
      {
        id: 'lr1',
        weekEnding: new Date('2025-01-12'),
        dailyBreakdown: {
          monday: { shift1: { total: 8, direct: 6, indirect: 2 }, shift2: { total: 0, direct: 0, indirect: 0 }, total: 8, direct: 6, indirect: 2 }
        }
      }
    ];

    const laborService = await import('../laborReportService');
    vi.spyOn(laborService, 'getLaborReportsByDateRange').mockResolvedValue({ success: true, data: laborReports });

    const res = await service.getAggregateHours(START, END, 'day');
    expect(res.success).toBe(true);

    // Expect aggregated to include the labor report day (weekStart Monday)
    const weekStart = dayjs(laborReports[0].weekEnding).subtract(6, 'day');
    const mondayKey = weekStart.format('YYYY-MM-DD');

    const aggregated = res.data;
    expect(aggregated[mondayKey]).toBeDefined();
    expect(aggregated[mondayKey].totalHours).toBe(8);
    expect(aggregated[mondayKey].totalDirect).toBe(6);
  });

  it('distributes labor report totalHours when no daily breakdown (week grouping)', async () => {
    // No hours docs
    firestoreFns.getDocs.mockResolvedValue({ docs: [] });

    const laborReports = [
      {
        id: 'lr2',
        weekEnding: new Date('2025-01-12'),
        totalHours: 70,
        directHours: 35,
        indirectHours: 35
      }
    ];

    const laborService = await import('../laborReportService');
    vi.spyOn(laborService, 'getLaborReportsByDateRange').mockResolvedValue({ success: true, data: laborReports });

    const res = await service.getAggregateHours(START, END, 'week');
    expect(res.success).toBe(true);

    const weekStart = dayjs(laborReports[0].weekEnding).subtract(6, 'day');
    const weekKey = weekStart.format('YYYY-MM-DD');

    expect(res.data[weekKey]).toBeDefined();
    expect(res.data[weekKey].totalHours).toBe(70);
    expect(res.data[weekKey].totalDirect).toBe(35);
  });
});