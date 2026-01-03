import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from '../firestoreService';

describe('getAggregateHours', () => {
  const START = new Date('2025-01-01');
  const END = new Date('2025-01-07');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers the latest hours submission per date and removes older duplicates', async () => {
    vi.spyOn(service, 'fetchHoursData').mockResolvedValue({
      success: true,
      data: [
        {
          date: new Date('2025-01-02'),
          totalHours: 8,
          shift1Hours: 8,
          shift2Hours: 0,
          totalDirect: 5,
          totalIndirect: 3,
          submittedAt: { toDate: () => new Date('2025-01-02T00:00:00Z') }
        },
        {
          date: new Date('2025-01-02'),
          totalHours: 4,
          shift1Hours: 4,
          shift2Hours: 0,
          totalDirect: 2,
          totalIndirect: 2,
          submittedAt: { toDate: () => new Date('2025-01-02T12:00:00Z') }
        }
      ]
    });

    vi.spyOn(service, 'getLaborReports').mockResolvedValue({ success: true, data: [] });

    const res = await service.getAggregateHours(START, END, 'day');
    expect(res.success).toBe(true);
    const key = '2025-01-02';
    expect(res.data[key].totalHours).toBe(4); // newer submission kept
    expect(res.data[key].totalDirect).toBe(2);
  });

  it('clamps labor report daily breakdown to the selected date range and overrides legacy hours', async () => {
    const laborReports = [
      {
        id: 'lr1',
        weekEnding: new Date('2025-01-12'), // weekStart will be 2025-01-06
        dailyBreakdown: {
          monday: { shift1: { total: 10, direct: 6, indirect: 4 }, shift2: { total: 0, direct: 0, indirect: 0 }, total: 10, direct: 6, indirect: 4 },
          tuesday: { shift1: { total: 12, direct: 7, indirect: 5 }, shift2: { total: 0, direct: 0, indirect: 0 }, total: 12, direct: 7, indirect: 5 },
          sunday: { shift1: { total: 20 }, shift2: { total: 0 }, total: 20 }
        }
      }
    ];

    // Legacy hours data should be overridden for the same date
    vi.spyOn(service, 'fetchHoursData').mockResolvedValue({
      success: true,
      data: [
        {
          date: new Date('2025-01-06'),
          totalHours: 5,
          shift1Hours: 5,
          shift2Hours: 0,
          totalDirect: 3,
          totalIndirect: 2,
          submittedAt: { toDate: () => new Date('2025-01-06T00:00:00Z') }
        }
      ]
    });

    vi.spyOn(service, 'getLaborReports').mockResolvedValue({ success: true, data: laborReports });

    const res = await service.getAggregateHours(START, END, 'day');
    expect(res.success).toBe(true);

    // Keys inside range should exist
    const mondayKey = '2025-01-06';
    const tuesdayKey = '2025-01-07';
    expect(res.data[mondayKey]).toBeDefined();
    expect(res.data[tuesdayKey]).toBeDefined();

    // Overridden by labor report values
    expect(res.data[mondayKey].totalHours).toBe(10);
    expect(res.data[mondayKey].totalDirect).toBe(6);

    // Sunday (2025-01-12) is outside END range, should be absent
    expect(res.data['2025-01-12']).toBeUndefined();
  });
});