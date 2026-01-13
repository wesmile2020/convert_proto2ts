import { TokenType, type Token } from '@/lexer/TokenType';

export function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function isLabelToken(token: Token): boolean {
  return (
    token.type === TokenType.OPTIONAL ||
    token.type === TokenType.REQUIRED ||
    token.type === TokenType.REPEATED
  );
}
