import { isWhitespace } from '@/utils/utils';
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
    start?: number,
    startLine?: number,
    startColumn?: number,
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
  
  private _peek(offset: number = 1): string {
    return this._source[this._position + offset];
  }

  private _skipWhitespace(): void {
    while (this._position < this._source.length) {
      const char = this._source[this._position];
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

  private _skipLineComment(): void {
    const start = this._position;
    const startLine = this._line;
    const startColumn = this._column;

    this._position += 2;
    this._column += 2;

    while (this._position < this._source.length && this._source[this._position] !== '\n') {
      this._position += 1;
      this._column += 1;
    }

    const comment = this._source.slice(start, this._position);
    const token = this._createToken(TokenType.COMMENT, comment, start, startLine, startColumn);
    this._tokens.push(token);
  }

  private _skipBlockComment(): void {
    const start = this._position;
    const startLine = this._line;
    const startColumn = this._column;

    this._position += 2;
    this._column += 2;

    while (this._position < this._source.length) {
      if (this._source[this._position] === '\n') {
        this._line += 1;
        this._column = 1;
      } else {
        this._column += 1;
      }
      if (this._source[this._position] === '*' && this._peek() === '/') {
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

  tokenize(): LexerOutput {
    while (this._position < this._source.length) {
      const start = this._position;
      const char = this._source[this._position];
    }

    return {
      tokens: this._tokens,
      errors: this._errors,
    };
  }
}

export { Lexer };
