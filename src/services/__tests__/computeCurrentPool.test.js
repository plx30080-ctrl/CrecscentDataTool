import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { computeCurrentPool } from '../firestoreService';

describe('computeCurrentPool', () => {
  it('counts applicants processed in last N days and excludes started/hired/declined/rejected', () => {
    const refDate = new Date('2025-01-15');
    const twoWeeksAgo = dayjs(refDate).subtract(14, 'day').toDate();

    const applicants = [
      { id: 'a1', status: 'Processed', processedDate: dayjs(refDate).subtract(3, 'day').toDate() }, // should count
      { id: 'a2', status: 'Processed', processedDate: dayjs(refDate).subtract(13, 'day').toDate() }, // should count
      { id: 'a3', status: 'Processed', processedDate: dayjs(refDate).subtract(15, 'day').toDate() }, // outside window
      { id: 'a4', status: 'Started', processedDate: dayjs(refDate).subtract(2, 'day').toDate() }, // excluded by status
      { id: 'a5', status: 'Hired', processedDate: dayjs(refDate).subtract(1, 'day').toDate() }, // excluded by status
      { id: 'a6', status: 'Processed' } // missing processedDate, shouldn't count
    ];

    const count = computeCurrentPool(applicants, 14, refDate);
    expect(count).toBe(2);
  });

  it('returns zero for empty or missing processed dates', () => {
    const refDate = new Date('2025-01-15');
    const applicants = [
      { id: 'b1', status: 'Processed' },
      { id: 'b2', status: 'Started' }
    ];
    expect(computeCurrentPool(applicants, 14, refDate)).toBe(0);
  });
});