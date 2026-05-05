/**
 * Test setup file for Vitest
 * This file is executed before running tests
 */

import '@testing-library/jest-dom'

// Mock MediaPipe if needed in tests
(global as any).MediaPipe = {} as any;
