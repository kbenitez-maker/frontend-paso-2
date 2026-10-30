import { describe, expect, it } from 'vitest';

import { isDocumentStage, isRequestStatus, isStatementKey } from '../request';

describe('request type guards', () => {
  it('accepts the known values and nothing else', () => {
    expect(isDocumentStage('checklist')).toBe(true);
    expect(isDocumentStage('base')).toBe(true);
    expect(isDocumentStage('other')).toBe(false);
    expect(isRequestStatus('draft')).toBe(true);
    expect(isRequestStatus(null)).toBe(false);
    expect(isStatementKey('declaration')).toBe(true);
    expect(isStatementKey('declarations')).toBe(false);
  });
});
