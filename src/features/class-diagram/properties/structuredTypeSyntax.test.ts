import { describe, expect, it } from 'vitest';
import { formatStructuredTypeSyntax, parseStructuredTypeSyntax } from './structuredTypeSyntax';

describe('structured API-v1 type syntax', () => {
  it('round-trips nested collection and tuple syntax without deciding type semantics', () => {
    const source = 'Sequence(Tuple(label:String,amount:Money,tags:Set(String)))';
    expect(formatStructuredTypeSyntax(parseStructuredTypeSyntax(source))).toBe(source);
  });

  it('leaves unknown or invalid backend syntax available as a named value', () => {
    expect(parseStructuredTypeSyntax('FutureType<X>')).toEqual({ kind: 'named', name: 'FutureType<X>' });
  });
});
