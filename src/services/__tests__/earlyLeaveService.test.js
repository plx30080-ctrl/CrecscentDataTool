import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase imports
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, col, id) => ({ _ref: `${col}/${id}` })),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
}));

vi.mock('../../firebase', () => ({ db: {} }));
vi.mock('../../utils/logger', () => ({ default: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { restoreFromDNR } from '../earlyLeaveService';
import { doc, updateDoc } from 'firebase/firestore';

describe('restoreFromDNR', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls updateDoc with correct payload and returns success on success', async () => {
    updateDoc.mockResolvedValueOnce(true);

    const result = await restoreFromDNR('dnr123', 'user-1', 'Restored by test');

    expect(result.success).toBe(true);
    // Ensure doc() was called with db, 'dnrDatabase', dnrId
    expect(doc).toHaveBeenCalledWith({}, 'dnrDatabase', 'dnr123');

    // Ensure updateDoc was called and payload contains expected fields
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const payload = updateDoc.mock.calls[0][1];
    expect(payload.status).toBe('Active');
    expect(payload.removedAt).toBeNull();
    expect(payload.removedBy).toBeNull();
    expect(payload.restoredBy).toBe('user-1');
    expect(payload.notes).toBe('Restored by test');
    expect(payload.restoredAt).toBeDefined();
  });

  it('returns an error object when updateDoc throws', async () => {
    updateDoc.mockRejectedValueOnce(new Error('Permission denied'));

    const result = await restoreFromDNR('dnr123', 'user-1', 'Attempt restore');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});
