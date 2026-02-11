import { levelToJson, levelToJsonString } from './types';
import { encodeLevelForUrl } from './url-format';
import { encodeLevelForUrlV2 } from './url-format-v2';
import type { PuzzleLevelDefinition } from './types';

export type ShareMode = 'auto' | 'v1' | 'v2' | 'json';

export type SharePayload = {
  autoVersion: 'v1' | 'v2';
  lengths: {
    v1: number;
    v2: number;
    json: number;
  };
  values: {
    v1: string;
    v2: string;
    json: string;
  };
};

export function buildSharePayload(level: PuzzleLevelDefinition): SharePayload {
  const v1 = encodeLevelForUrl(level);
  const v2 = encodeLevelForUrlV2(level);
  const json = levelToJsonString(levelToJson(level));

  return {
    autoVersion: v2.length < v1.length ? 'v2' : 'v1',
    lengths: {
      v1: v1.length,
      v2: v2.length,
      json: json.length,
    },
    values: {
      v1,
      v2,
      json,
    },
  };
}

export function resolveShareMode(payload: SharePayload, mode: ShareMode): 'v1' | 'v2' | 'json' {
  if (mode === 'auto') return payload.autoVersion;
  return mode;
}

export function getShareValue(payload: SharePayload, mode: ShareMode): string {
  const resolved = resolveShareMode(payload, mode);
  return payload.values[resolved];
}
