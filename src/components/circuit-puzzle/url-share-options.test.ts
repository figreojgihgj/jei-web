import { describe, expect, it } from 'vitest';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import {
  buildSharePayload,
  getShareValue,
  resolveShareMode,
} from './url-share-options';

describe('url-share-options', () => {
  it('should build payload with all share formats', () => {
    const payload = buildSharePayload(cloneLevel(DEFAULT_CIRCUIT_LEVEL));

    expect(payload.values.v1.length).toBe(payload.lengths.v1);
    expect(payload.values.v2.length).toBe(payload.lengths.v2);
    expect(payload.values.json.length).toBe(payload.lengths.json);
    expect(payload.values.v1.startsWith('v')).toBe(true);
    expect(payload.values.v2.startsWith('v2-')).toBe(true);
    expect(payload.values.json.startsWith('{')).toBe(true);
  });

  it('should resolve auto to shortest version', () => {
    const payload = buildSharePayload(cloneLevel(DEFAULT_CIRCUIT_LEVEL));
    const shortest = payload.lengths.v2 < payload.lengths.v1 ? 'v2' : 'v1';
    expect(resolveShareMode(payload, 'auto')).toBe(shortest);
  });

  it('should return selected content by mode', () => {
    const payload = buildSharePayload(cloneLevel(DEFAULT_CIRCUIT_LEVEL));
    expect(getShareValue(payload, 'v1')).toBe(payload.values.v1);
    expect(getShareValue(payload, 'v2')).toBe(payload.values.v2);
    expect(getShareValue(payload, 'json')).toBe(payload.values.json);
    expect(getShareValue(payload, 'auto')).toBe(payload.values[payload.autoVersion]);
  });
});
