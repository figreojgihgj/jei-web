import { describe, expect, it } from 'vitest';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import { decodeLevelFromUrl, encodeLevelForUrl } from './url-format';
import { decodeLevelFromUrlV2, encodeLevelForUrlV2 } from './url-format-v2';
import { decodeLevelFromSharedUrl, encodeLevelForShortestUrl } from './url-format-share';
import type { PuzzleLevelDefinition } from './types';

describe('url-format-share', () => {
  it('should choose shortest result between v1 and v2', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const v1 = encodeLevelForUrl(level);
    const v2 = encodeLevelForUrlV2(level);
    const chosen = encodeLevelForShortestUrl(level);

    expect(chosen.lengths.v1).toBe(v1.length);
    expect(chosen.lengths.v2).toBe(v2.length);
    expect(chosen.encoded.length).toBe(Math.min(v1.length, v2.length));
  });

  it('should decode v1 encoded string', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const encoded = encodeLevelForUrl(level);
    const expected = decodeLevelFromUrl(encoded);
    const decoded = decodeLevelFromSharedUrl(encoded);

    expect(decoded).toEqual(expected);
  });

  it('should decode v2 encoded string', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const encoded = encodeLevelForUrlV2(level);
    const expected = decodeLevelFromUrlV2(encoded);
    const decoded = decodeLevelFromSharedUrl(encoded);

    expect(decoded).toEqual(expected);
  });

  it('should keep compatibility with tiny levels', () => {
    const level: PuzzleLevelDefinition = {
      id: 'tiny',
      name: 'Tiny',
      rows: 1,
      cols: 1,
      blocked: [],
      hintCells: [],
      rowTargets: [0],
      colTargets: [0],
      pieces: [],
    };

    const chosen = encodeLevelForShortestUrl(level);
    const decoded = decodeLevelFromSharedUrl(chosen.encoded);

    expect(decoded.rows).toBe(1);
    expect(decoded.cols).toBe(1);
    expect(decoded.pieces).toHaveLength(0);
  });
});
