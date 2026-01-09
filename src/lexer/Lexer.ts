import { isDigit, isIdentifierChar, isIdentifierStart, isWhitespace } from './helper';
import { TokenType, type LexerError, type Token } from './TokenType';
import { KEYWORDS, SYMBOLS } from './define';

interface LexerOutput {
  tokens: Token[];
  errors: LexerError[];
}

class Lexer {
  private _source: string;
  private _position: number = 0;
  private _line: number = 1;
  private _column: number = 1;
  private _tokens: Token[] = [];
  private _errors: LexerError[] = [];

  constructor(input: string) {
    this._source = input;
  }

  private _createToken(
    type: TokenType,
    value: string,
    start: number,
    startLine: number,
    startColumn: number,
  ): Token {
    return {
      type,
      value,
      line: startLine ?? this._line,
      column: startColumn ?? this._column,
      start: start ?? this._position,
      end: this._position,
    }
  }

  private _addError(message: string, line?: number, column?: number): void {
    this._errors.push({
      message,
      line: line ?? this._line,
      column: column ?? this._column,
    });
  }
  
  private _current(): string {
    if (this._position >= this._source.length) {
      return '';
    }
    return this._source[this._position];
  }

  private _next(): string {
    if (this._position + 1 >= this._source.length) {
      return '';
    }
    return this._source[this._position + 1];
  }

  private _skipWhitespace(): void {
    while (this._position < this._source.length) {
      const char = this._current();
      if (!isWhitespace(char)) {
        break;
      }
      if (char === '\n') {
        this._line += 1;
        this._column = 1;
      } else {
        this._column += 1;
      }
      this._position += 1;
    }
  }

  private _readLineComment(): void {
    const start = this._position;
    const startLine = this._line;
    const startColumn = this._column;

    this._position += 2;
    this._column += 2;

    while (this._position < this._source.length && this._current() !== '\n') {
      this._position += 1;
      this._column += 1;
    }

    const comment = this._source.slice(start, this._position);
    const token = this._createToken(TokenType.COMMENT, comment, start, startLine, startColumn);
    this._tokens.push(token);
  }

  private _readBlockComment(): void {
    const start = this._position;
    const startLine = this._line;
    const startColumn = this._column;

    this._position += 2;
    this._column += 2;

    while (this._position < this._source.length) {
      if (this._current() === '\n') {
        this._line += 1;
        this._column = 1;
      } else {
        this._column += 1;
      }
      if (this._current() === '*' && this._next() === '/') {
        this._column += 2;
        this._position += 2;
        break;
      }

      this._position += 1;
    }

    if (this._position >= this._source.length) {
      this._addError('Unterminated block comment', startLine, startColumn);
      return;
    }

    const comment = this._source.slice(start, this._position);
    const token = this._createToken(TokenType.COMMENT, comment, start, startLine, startColumn);
    this._tokens.push(token);
  }

  private _readStringLiteral(quote: string): Token | null {
    const start = this._position;
    const startLine = this._line;
    const startColumn = this._column;

    this._position += 1;
    this._column += 1;

    let value = '';
    while (this._position < this._source.length && this._current() !== quote) {
      const char = this._current();
      if (char === '\\' && this._position + 1 < this._source.length) {
        const nextChar = this._source[this._position + 1];
        if (nextChar === 'n') {
          value += '\n';
        } else if (nextChar === 't') {
          value += '\t';
        } else if (nextChar === 'r') {
          value += '\r';
        } else if (nextChar === '\\') {
          value += '\\';
        } else if (nextChar === '"') {
          value += '"';
        } else {
          value += nextChar;
        }
        this._position += 2;
        this._column += 2;
      } else {
        value += char;
        this._position += 1;
        this._column += 1;
      }
    }

    if (this._position >= this._source.length) {
      this._addError('Unterminated string literal', startLine, startColumn);
      return null;
    }

    this._position += 1;
    this._column += 1;

    return this._createToken(TokenType.STRING_LITERAL, value, start, startLine, startColumn);
  }

  private _readNumber(): Token {
    const start = this._position;
    const startLine = this._line;
    const startColumn = this._column;

    if (this._current() === '-') {
      this._position += 1;
      this._column += 1;
    }

    while (this._position < this._source.length && isDigit(this._current())) {
      this._position += 1;
      this._column += 1;
    }

    // check decimal
    if (this._current() === '.') {
      this._position += 1;
      this._column += 1;
      while (this._position < this._source.length && isDigit(this._current())) {
        this._position += 1;
        this._column += 1;
      }
    }

    const value = this._source.slice(start, this._position);
    return this._createToken(TokenType.NUMBER_LITERAL, value, start, startLine, startColumn);
  }

  private _readIdentifier(): Token {
    const start = this._position;
    const startLine = this._line;
    const startColumn = this._column;

    while (this._position < this._source.length && isIdentifierChar(this._current())) {
      this._position += 1;
      this._column += 1;
    }

    const value = this._source.slice(start, this._position);

    // check is keyword and ignore case
    const type = KEYWORDS[value.toLowerCase()] ?? TokenType.IDENTIFIER;
    return this._createToken(type, value, start, startLine, startColumn);
  }

  tokenize(): LexerOutput {
    while (this._position < this._source.length) {
      const start = this._position;
      const char = this._current();
      
      if (isWhitespace(char)) {
        this._skipWhitespace();
        continue;
      }

      // skip comment
      if (char === '/') {
        if (this._next() === '/') {
          this._readLineComment();
          continue;
        }
        if (this._next() === '*') {
          this._readBlockComment();
          continue;
        }
      }

      // string identifier
      if (char === '"') {
        const token = this._readStringLiteral(char);
        if (token) {
          this._tokens.push(token);
        }
        continue;
      }

      // number identifier
      if (isDigit(char) || (char === '-' && isDigit(this._next()))) {
        const token = this._readNumber();
        this._tokens.push(token);
        continue;
      }

      // identifier or keyword
      if (isIdentifierStart(char)) {
        const token = this._readIdentifier();
        this._tokens.push(token);
        continue;
      }

      // symbol
      if (SYMBOLS[char] !== undefined) {
        const startColumn = this._column;
        this._position += 1;
        this._column += 1;
        const token = this._createToken(SYMBOLS[char], char, start, this._line, startColumn);
        this._tokens.push(token);
        continue;
      }

      // unknown character
      this._addError(`Unknown character: ${char}`, this._line, this._column);
      this._position += 1;
      this._column += 1;
    }

    return {
      tokens: this._tokens,
      errors: this._errors,
    };
  }
}

export { Lexer };
