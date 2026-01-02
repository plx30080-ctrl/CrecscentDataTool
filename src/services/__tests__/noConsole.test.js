/* eslint-disable no-unused-vars */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
/* global process */
function listFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const res = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(res));
    } else {
      files.push(res);
    }
  }
  return files;
}

it('should not contain console.* calls in src (except logger implementation)', () => {
  const srcDir = join(process.cwd(), 'src');
const files = listFiles(srcDir).filter(f => (f.endsWith('.js') || f.endsWith('.jsx')) && !f.includes('__tests__') && !f.includes('.test.'));

  const violations = [];
  files.forEach(file => {
    // Skip the logger implementation which intentionally uses console to bind methods
    if (file.endsWith('src/utils/logger.js')) return;

    const content = readFileSync(file, 'utf8');
    if (content.includes('console.')) {
      violations.push({ file, snippet: content.match(/.{0,40}console\.[^\n]{0,120}/)?.[0] || 'console found' });
    }
  });

  if (violations.length > 0) {
    const msg = violations.map(v => `${v.file}: ${v.snippet}`).join('\n');
    throw new Error('Found console.* usages in source files:\n' + msg);
  }

  expect(violations.length).toBe(0);
});