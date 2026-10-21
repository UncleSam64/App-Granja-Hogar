/**
 * Shared helpers for unit tests.
 *
 * Tests run in native ESM mode, so modules are mocked with `jest.unstable_mockModule`
 * *before* the code under test is loaded with `await import(...)`.
 */
import jwt from 'jsonwebtoken';

/** Signs a token the real auth middleware will accept. */
export const tokenFor = (permissions = ['admin'], user = {}) =>
  jwt.sign(
    { id: 1, username: 'tester', name: 'test', lastName: 'user', permissions, ...user },
    process.env.JWT_SECRET
  );

export const bearer = (permissions, user) => `Bearer ${tokenFor(permissions, user)}`;

/** Mock for models/index.js: `withTransaction` just runs the callback with a fake connection. */
export const dbModuleMock = (jest) => ({
  default: { query: jest.fn() },
  withTransaction: jest.fn(async (fn) => fn('tx-conn')),
});
