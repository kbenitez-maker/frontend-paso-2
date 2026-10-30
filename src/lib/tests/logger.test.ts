// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger as developmentLogger } from '../logger';

const MESSAGE = Symbol.for('message');

/** Formats one event the way the logger's console transport would print it. */
const printed = (
  logger: typeof developmentLogger,
  info: Record<string, unknown>,
) => {
  const transport = logger.transports[0];
  if (transport?.format === undefined) throw new Error('no console format');
  const result = transport.format.transform({
    service: 'dxb-portal-account-request',
    ...info,
  } as never);
  if (typeof result === 'boolean') throw new Error('event was filtered');
  return String(result[MESSAGE as never]);
};

describe('logger', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('only writes to the console, never to a log file', () => {
    expect(developmentLogger.transports).toHaveLength(1);
    expect(developmentLogger.transports[0]?.constructor.name).toBe('Console');
  });

  it('prints a readable line with the event fields in development', () => {
    const line = printed(developmentLogger, {
      level: 'warn',
      message: 'Proxy auth: request sent without a bearer token',
      event: 'bff.auth_missing',
      reason: 'cookie_missing',
    });

    expect(line).toContain('Proxy auth: request sent without a bearer token');
    expect(line).toContain('"event":"bff.auth_missing"');
    expect(line).toContain('"reason":"cookie_missing"');
    expect(line).not.toContain('service');
  });

  it('appends the stack of an error in development', () => {
    const line = printed(developmentLogger, {
      level: 'error',
      message: 'boom',
      stack: 'Error: boom\n    at here',
    });

    expect(line).toContain('boom \nError: boom');
  });

  // Last: reloading the module with another NODE_ENV resets winston's colors.
  it('prints one JSON line with every field in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { logger } = await import('../logger');

    const line = printed(logger, {
      level: 'error',
      message: 'Proxy upstream error response',
      event: 'bff.upstream_error',
      status: 403,
    });

    const entry: unknown = JSON.parse(line);
    expect(entry).toMatchObject({
      level: 'error',
      message: 'Proxy upstream error response',
      service: 'dxb-portal-account-request',
      event: 'bff.upstream_error',
      status: 403,
    });
    expect(line).toMatch(/"timestamp":"\d{4}-\d{2}-\d{2}T/);
  });
});
