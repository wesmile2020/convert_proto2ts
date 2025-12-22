export function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

export function isDigit(char: string): boolean {
  return /\d/.test(char);
}

export function isIdentifierStart(char: string): boolean {
  return /[a-zA-Z_]/.test(char);
}

export function isIdentifierChar(char: string): boolean {
  return /[a-zA-Z0-9_]/.test(char);
}
