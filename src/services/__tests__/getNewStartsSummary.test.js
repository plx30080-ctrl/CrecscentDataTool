import { describe, it, expect } from 'vitest';
import { computeNewStartsSummary } from '../firestoreService';

describe('computeNewStartsSummary', () => {
  it('uses applicants when applicantsCount > 0', () => {
    const shiftResult = { success: true, data: [] };
    const onPremResult = { success: true, data: [{ newStarts: '5' }] };
    const summary = computeNewStartsSummary(shiftResult, onPremResult, 3);
    expect(summary.chosenBy).toBe('applicants');
    expect(summary.chosenCount).toBe(3);
  });

  it('deduplicates shift EIDs and picks shifts when no applicants', () => {
    const shiftResult = {
      success: true,
      data: [
        { shift: '1st', newStarts: [{ eid: 'E1' }, { eid: 'E2' }] },
        { shift: '2nd', newStarts: [{ eid: 'E2' }, { eid: 'E3' }] }
      ]
    };
    const onPremResult = { success: true, data: [{ newStarts: '0' }] };

    const summary = computeNewStartsSummary(shiftResult, onPremResult, 0);
    expect(summary.shiftCount).toBe(4);
    expect(summary.shiftUniqueCount).toBe(3);
    expect(summary.chosenBy).toBe('shifts');
    expect(summary.chosenCount).toBe(3);
    // perShift breakdown
    expect(summary.perShift['1st'].shiftCount).toBe(2);
    expect(summary.perShift['2nd'].shiftCount).toBe(2);
    expect(summary.perShift['1st'].uniqueCount).toBe(2);
    expect(summary.perShift['2nd'].uniqueCount).toBe(2);
  });

  it('falls back to onPremise count when no applicants and no shift EIDs', () => {
    const shiftResult = { success: true, data: [{ shift: '1st', newStarts: [] }] };
    const onPremResult = { success: true, data: [{ newStarts: '7' }] };
    const summary = computeNewStartsSummary(shiftResult, onPremResult, 0);
    expect(summary.chosenBy).toBe('onPremise');
    expect(summary.chosenCount).toBe(7);
  });
});