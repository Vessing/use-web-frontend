export type StructuredTypeSyntax =
  | { kind: 'named'; name: string }
  | { kind: 'collection'; collectionKind: 'Set' | 'Bag' | 'Sequence' | 'OrderedSet'; elementType: StructuredTypeSyntax }
  | { kind: 'tuple'; fields: Array<{ name: string; type: StructuredTypeSyntax }> };

const COLLECTIONS = new Set(['Set', 'Bag', 'Sequence', 'OrderedSet']);

export function parseStructuredTypeSyntax(source: string): StructuredTypeSyntax {
  try {
    const parser = new TypeSyntaxParser(source.trim());
    const type = parser.parseType();
    parser.skipWhitespace();
    return parser.atEnd() ? type : { kind: 'named', name: source };
  } catch {
    return { kind: 'named', name: source };
  }
}

export function formatStructuredTypeSyntax(type: StructuredTypeSyntax): string {
  if (type.kind === 'named') return type.name;
  if (type.kind === 'collection') return `${type.collectionKind}(${formatStructuredTypeSyntax(type.elementType)})`;
  return `Tuple(${type.fields.map((field) => `${field.name}:${formatStructuredTypeSyntax(field.type)}`).join(',')})`;
}

class TypeSyntaxParser {
  private position = 0;
  constructor(private readonly source: string) {}

  parseType(): StructuredTypeSyntax {
    const name = this.identifier();
    this.skipWhitespace();
    if (!this.peek('(')) return { kind: 'named', name };
    this.position += 1;
    if (name === 'Tuple') return this.tuple();
    if (!COLLECTIONS.has(name)) throw new Error('Unsupported generic type');
    const elementType = this.parseType();
    this.require(')');
    return { kind: 'collection', collectionKind: name as 'Set' | 'Bag' | 'Sequence' | 'OrderedSet', elementType };
  }

  skipWhitespace() { while (!this.atEnd() && /\s/.test(this.source[this.position])) this.position += 1; }
  atEnd() { return this.position >= this.source.length; }

  private tuple(): StructuredTypeSyntax {
    const fields: Array<{ name: string; type: StructuredTypeSyntax }> = [];
    while (true) {
      this.skipWhitespace();
      if (this.peek(')')) { this.position += 1; break; }
      const name = this.identifier();
      this.require(':');
      fields.push({ name, type: this.parseType() });
      this.skipWhitespace();
      if (this.peek(')')) { this.position += 1; break; }
      this.require(',');
    }
    if (!fields.length) throw new Error('Tuple requires a field');
    return { kind: 'tuple', fields };
  }

  private identifier(): string {
    this.skipWhitespace();
    const start = this.position;
    while (!this.atEnd()) {
      const current = this.source[this.position];
      if (/[A-Za-z0-9_]/.test(current)) this.position += 1;
      else if (current === ':' && this.source[this.position + 1] === ':') this.position += 2;
      else break;
    }
    const result = this.source.slice(start, this.position);
    if (!/^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/.test(result)) throw new Error('Invalid identifier');
    return result;
  }

  private require(token: string) { this.skipWhitespace(); if (!this.peek(token)) throw new Error(`Expected ${token}`); this.position += 1; }
  private peek(token: string) { return this.source[this.position] === token; }
}
