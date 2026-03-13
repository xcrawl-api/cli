import { describe, expect, it } from 'vitest';

import { toStableJson } from '../../src/formatters/json';

describe('toStableJson', () => {
  it('sorts keys recursively for stable output', () => {
    const value = {
      b: 1,
      a: {
        d: 3,
        c: 2
      }
    };

    expect(toStableJson(value)).toBe('{\n  "a": {\n    "c": 2,\n    "d": 3\n  },\n  "b": 1\n}\n');
  });
});
