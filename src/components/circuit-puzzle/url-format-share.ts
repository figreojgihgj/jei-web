import { decodeLevelFromUrl, encodeLevelForUrl } from './url-format';
import { decodeLevelFromUrlV2, encodeLevelForUrlV2 } from './url-format-v2';
import type { PuzzleLevelDefinition } from './types';

export type UrlEncodingVersion = 'v1' | 'v2';

export type UrlEncodingChoice = {
  encoded: string;
  version: UrlEncodingVersion;
  lengths: {
    v1: number;
    v2: number;
  };
};

export function encodeLevelForShortestUrl(level: PuzzleLevelDefinition): UrlEncodingChoice {
  const encodedV1 = encodeLevelForUrl(level);
  const encodedV2 = encodeLevelForUrlV2(level);

  if (encodedV2.length < encodedV1.length) {
    return {
      encoded: encodedV2,
      version: 'v2',
      lengths: { v1: encodedV1.length, v2: encodedV2.length },
    };
  }

  return {
    encoded: encodedV1,
    version: 'v1',
    lengths: { v1: encodedV1.length, v2: encodedV2.length },
  };
}

export function decodeLevelFromSharedUrl(encoded: string): PuzzleLevelDefinition {
  if (encoded.startsWith('v2-')) {
    return decodeLevelFromUrlV2(encoded);
  }

  try {
    return decodeLevelFromUrl(encoded);
  } catch (v1Error) {
    try {
      return decodeLevelFromUrlV2(encoded);
    } catch {
      throw v1Error;
    }
  }
}
