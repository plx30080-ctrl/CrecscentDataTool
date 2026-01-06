mport { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock logger to silence logs during tests
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock firebase/storage helpers
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn()
}));

import * as storage from 'firebase/storage';
import * as badgeService from '../badgeService';

describe('badgeService upload failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns failure if uploadBytes rejects (createOrUpdateBadgeFromApplicant)', async () => {
    // Arrange: uploadBytes rejects (simulates CORS/network failure)
    storage.uploadBytes.mockImplementation(() => Promise.reject(new Error('Network error')));

    const fakeApplicant = {
      eid: '123456',
      firstName: 'John',
      lastName: 'Doe',
      position: 'Worker',
      shift: '1st',
      recruiter: 'R1',
      status: 'Started'
    };

    // Act
    const result = await badgeService.createOrUpdateBadgeFromApplicant(fakeApplicant, /*photoFile*/ new Blob(), 'user-1');

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Network error|Photo upload failed/);
  });
});
