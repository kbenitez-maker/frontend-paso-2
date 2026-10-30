import { describe, expect, it } from 'vitest';

import { HttpException } from '@lafise/lde-web-lib';

import {
  failureOfError,
  outcomeKeyOf,
  resultOfLookup,
  surfaceOf,
} from '../lib/lookup-outcome';

const lookup = (
  companyExists: boolean,
  onboardingAvailable: boolean,
  hasActive: boolean | null = false,
) => ({
  company_exists: companyExists,
  has_active_onboarding_request: hasActive,
  onboarding_lookup_available: onboardingAvailable,
});

describe('resultOfLookup', () => {
  it('lets only a company that is new to the bank move on', () => {
    expect(resultOfLookup(lookup(false, true))).toEqual({ proceed: true });
  });

  it('blocks an existing client even when onboarding could not be read', () => {
    expect(resultOfLookup(lookup(true, false, null))).toEqual({
      proceed: false,
      block: 'existing_client',
    });
  });

  it('blocks a request already in progress when the body says so', () => {
    expect(resultOfLookup(lookup(false, true, true))).toEqual({
      proceed: false,
      block: 'request_in_progress',
    });
  });

  it('does not treat a missing onboarding answer as new to the bank', () => {
    expect(resultOfLookup(lookup(false, false, null))).toEqual({
      proceed: false,
      block: 'unavailable',
    });
  });

  it('does not move on when the store answered but the onboarding flag was not read', () => {
    expect(resultOfLookup(lookup(false, true, null))).toEqual({
      proceed: false,
      block: 'unavailable',
    });
  });
});

describe('surfaceOf', () => {
  it('picks the surface by what the applicant can do about it', () => {
    expect(surfaceOf('existing_client')).toBe('screen');
    expect(surfaceOf('request_in_progress')).toBe('notice');
    expect(surfaceOf('timeout')).toBe('toast');
    expect(surfaceOf('unavailable')).toBe('toast');
  });

  it('has copy for every block', () => {
    expect(outcomeKeyOf('existing_client')).toBe('existingClient');
    expect(outcomeKeyOf('request_in_progress')).toBe('requestInProgress');
    expect(outcomeKeyOf('timeout')).toBe('timeout');
    expect(outcomeKeyOf('unavailable')).toBe('unavailable');
  });
});

describe('failureOfError', () => {
  const rejection = (status: number, code: string) =>
    HttpException.fromResponseData(status, { error: { code, message: 'x' } });

  it('reads a gateway timeout as slow', () => {
    expect(failureOfError(rejection(504, 'HTTP_504'))).toBe('timeout');
  });

  it('reads FCJ010 as slow and FCJ008 as a request already in progress', () => {
    expect(failureOfError(rejection(400, 'FCJ010'))).toBe('timeout');
    expect(failureOfError(rejection(400, 'FCJ008'))).toBe(
      'request_in_progress',
    );
  });

  it('reads a client abort after the time limit as slow', () => {
    const aborted = new HttpException(
      0,
      'timeout of 10000ms exceeded',
      'ECONNABORTED',
    );

    expect(failureOfError(aborted)).toBe('timeout');
  });

  it.each([
    rejection(400, 'FCJ009'),
    rejection(500, 'HTTP_500'),
    rejection(422, 'VALIDATION_FAILED'),
    new Error('network down'),
  ])('never reads %s as a way forward', (error) => {
    expect(failureOfError(error)).toBe('unavailable');
  });
});
