import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetMockDb } from '@/mocks/mockApi';

beforeEach(() => {
  resetMockDb();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});
