import { afterEach, describe, expect, it, vi } from 'vitest';

import { routes } from '../routes';

const ID = '0b9f6f1e-3c1d-4a53-9d0e-1f0f2f6a7b01';

describe('routes', () => {
  it('builds internal routes without the basePath', () => {
    expect(routes.new('BLNI')).toBe('/new?bank=BLNI');
    expect(routes.request(ID)).toBe(`/${ID}`);
    expect(routes.profile(ID)).toBe(`/${ID}/profile`);
    expect(routes.baseDocuments(ID)).toBe(`/${ID}/base-documents`);
    expect(routes.survey(ID)).toBe(`/${ID}/survey`);
    expect(routes.submitted(ID)).toBe(`/${ID}/submitted`);
  });

  it('builds step routes with an optional typed block', () => {
    expect(routes.step(ID, 'company')).toBe(`/${ID}/company`);
    expect(routes.step(ID, 'company', { block: 'lawyer' })).toBe(
      `/${ID}/company?block=lawyer`,
    );
    expect(routes.step(ID, 'company', { bank: 'BLCR' })).toBe(
      `/${ID}/company?bank=BLCR`,
    );
    expect(routes.step(ID, 'company', { block: 'lawyer', bank: 'BLCR' })).toBe(
      `/${ID}/company?block=lawyer&bank=BLCR`,
    );
  });

  it('points external routes at other zones', () => {
    expect(routes.external.home()).toBe('/home');
    expect(routes.external.requests()).toBe('/home/account-requests');
    expect(routes.external.login()).toBe('/auth/login');
  });

  describe('external.home with NEXT_PUBLIC_HOME_URL', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    it('uses the configured URL', async () => {
      vi.stubEnv('NEXT_PUBLIC_HOME_URL', 'http://localhost:3002/home');
      vi.resetModules();
      const { routes: configured } = await import('../routes');

      expect(configured.external.home()).toBe('http://localhost:3002/home');
      expect(configured.external.requests()).toBe(
        'http://localhost:3002/home/account-requests',
      );
    });
  });
});
