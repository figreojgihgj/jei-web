import { describe, expect, it } from 'vitest';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import type { PuzzleLevelDefinition } from './types';
import { solveLevel, verifySolution } from './auto-solver';

describe('auto solver', () => {
  it('solves default level and passes verification', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const result = solveLevel(level, {
      exactHintCover: true,
      onlyHintCells: true,
      enforceHintColors: true,
      timeoutMs: 5_000,
      maxNodes: 2_000_000,
    });

    expect(result.status).toBe('solved');
    expect(result.solution).not.toBeNull();

    if (!result.solution) return;
    const verification = verifySolution(level, result.solution, {
      exactHintCover: true,
      enforceHintColors: true,
    });
    expect(verification.ok).toBe(true);
    expect(verification.errors).toEqual([]);
  });

  it('returns no-solution when hint color is impossible', () => {
    const level: PuzzleLevelDefinition = {
      id: 'tiny-impossible',
      name: 'Tiny Impossible',
      rows: 2,
      cols: 2,
      blocked: [],
      hintCells: [{ x: 0, y: 0 }],
      hintColors: { '0,0': '#ff0000' },
      rowTargets: [1, 0],
      colTargets: [1, 0],
      pieces: [
        {
          id: 'p-1',
          name: 'P1',
          color: '#00ff00',
          count: 1,
          cells: [{ x: 0, y: 0 }],
        },
      ],
      colorWeights: { '#00ff00': 1, '#ff0000': 1 },
    };

    const result = solveLevel(level, {
      exactHintCover: true,
      onlyHintCells: true,
      enforceHintColors: true,
      timeoutMs: 1_000,
      maxNodes: 10_000,
    });

    expect(result.status).toBe('no-solution');
    expect(result.solution).toBeNull();
  });

  it('returns node-limit when maxNodes is too small', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const result = solveLevel(level, {
      exactHintCover: true,
      onlyHintCells: true,
      enforceHintColors: true,
      timeoutMs: 10_000,
      maxNodes: 1,
    });

    expect(result.status).toBe('node-limit');
    expect(result.solution).toBeNull();
  });
});
