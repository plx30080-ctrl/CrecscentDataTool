import { describe, it, expect } from 'vitest';
import { mergeLaborReportsToAggregated } from '../firestoreService';
import dayjs from 'dayjs';

describe('mergeLaborReportsToAggregated', () => {
  it('merges dailyBreakdown into day-keyed aggregated map', () => {
    const weekEnding = new Date('2025-01-12'); // assumed week ending (Sunday)
    const report = {
      weekEnding,
      dailyBreakdown: {
        monday: { shift1: { total: 8, direct: 6, indirect: 2 }, shift2: { total: 0, direct: 0, indirect: 0 }, total: 8, direct: 6, indirect: 2 },
        tuesday: { shift1: { total: 6, direct: 6, indirect: 0 }, shift2: { total: 0, direct: 0, indirect: 0 }, total: 6, direct: 6, indirect: 0 }
      }
    };

    const aggregated = mergeLaborReportsToAggregated({}, [report], 'day');

    // Compute expected keys for Monday and Tuesday
    const weekStart = dayjs(weekEnding).subtract(6, 'day');
    const mondayKey = weekStart.format('YYYY-MM-DD');
    const tuesdayKey = weekStart.add(1, 'day').format('YYYY-MM-DD');

    expect(aggregated[mondayKey].totalHours).toBe(8);
    expect(aggregated[mondayKey].shift1Hours).toBe(8);
    expect(aggregated[mondayKey].totalDirect).toBe(6);
    expect(aggregated[mondayKey].totalIndirect).toBe(2);
    expect(aggregated[tuesdayKey].totalHours).toBe(6);
  });

  it('distributes totalHours across week for day grouping and adds week bucket for week grouping', () => {
    const weekEnding = new Date('2025-01-12');
    const report = {
      weekEnding,
      totalHours: 70,
      directHours: 35,
      indirectHours: 35
    };

    const aggregatedDay = mergeLaborReportsToAggregated({}, [report], 'day');
    const weekStart = dayjs(weekEnding).subtract(6, 'day');
    const mondayKey = weekStart.format('YYYY-MM-DD');

    // totalHours should be distributed evenly: 70 / 7 = 10 per day
    expect(aggregatedDay[mondayKey].totalHours).toBeCloseTo(10, 6);
    // With half direct/half indirect, per-day direct should be 5
    expect(aggregatedDay[mondayKey].totalDirect).toBeCloseTo(5, 6);

    const aggregatedWeek = mergeLaborReportsToAggregated({}, [report], 'week');
    const weekKey = weekStart.format('YYYY-MM-DD');
    expect(aggregatedWeek[weekKey].totalHours).toBe(70);
    expect(aggregatedWeek[weekKey].totalDirect).toBe(35);
  });
});