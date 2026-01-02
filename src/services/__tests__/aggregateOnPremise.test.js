import { describe, it, expect } from 'vitest';
import { aggregateOnPremiseByDateAndShift } from '../firestoreService';

describe('aggregateOnPremiseByDateAndShift', () => {
  it('aggregates multiple entries for same date and shift', () => {
    const entries = [
      { id: 'a', date: new Date('2025-01-01'), shift: '1st', working: '5', requested: '6' },
      { id: 'b', date: new Date('2025-01-01'), shift: '1st', working: 3, requested: 4 },
      { id: 'c', date: new Date('2025-01-02'), shift: '1st', working: 2 }
    ];

    const agg = aggregateOnPremiseByDateAndShift(entries);
    expect(agg.length).toBe(2);
    const first = agg[0];
    expect(first.shift).toBe('1st');
    expect(first.working).toBe(8);
    expect(first.requested).toBe(10);
  });

  it('handles missing fields gracefully', () => {
    const entries = [{ id: 'x', date: new Date('2025-01-05'), shift: '2nd' }];
    const agg = aggregateOnPremiseByDateAndShift(entries);
    expect(agg.length).toBe(1);
    expect(agg[0].working).toBe(0);
  });
});