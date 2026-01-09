import { type Token, TokenType } from '@/lexer/TokenType';
import {
  ASTKind,
  type BooleanLiteralNode,
  type EnumFieldNode,
  type EnumNode,
  type ExtendNode,
  type ExtensionsNode,
  type FieldNode,
  type FieldOptionNode,
  type FieldTypeNode,
  type FiledLabelNode,
  type IdentifierNode,
  type ImportNode,
  type LabelType,
  type MessageNode,
  type NumberLiteralNode,
  type OneofNode, 
  type OptionNode,
  type PackageNode,
  type ParseError,
  type Position,
  type ProtoFileNode,
  type ReservedNode,
  type ServiceNode,
  type StringLiteralNode,
  type SyntaxNode,
  type ToNode,
} from './ASTType';
import { isInternalTypeToken, isLabelToken, isValidIdentifier } from './helper';

interface ParseResult {
  ast: ProtoFileNode | null;
  errors: ParseError[];
}

const EOF_TOKEN: Token = {
  type: TokenType.EOF,
  value: '',
  line: 0,
  column: 0,
  start: 0,
  end: 0,
};

export class Parser {
  private _tokens: Token[] = [];
  private _position: number = 0;
  private _errors: ParseError[] = [];
  
  constructor(tokens: Token[]) {
    this._tokens = tokens;
  }

  private _previous(): Token {
    if (this._position <= 0) {
      return EOF_TOKEN;
    }
    return this._tokens[this._position - 1];
  }

  private _current(): Token {
    if (this._position >= this._tokens.length) {
      return EOF_TOKEN;
    }
    return this._tokens[this._position];
  }

  private _advance(): Token {
    if (this._position < this._tokens.length) {
      this._position += 1;
    }
    return this._previous();
  }

  private _check(type: TokenType): boolean {
    if (this._position >= this._tokens.length) {
      return false;
    }
    return this._current().type === type;
  }

  private _addError(message: string, expected?: TokenType[]): void {
    const token = this._current();
    this._errors.push({
      message,
      position: {
        line: token.line,
        column: token.column,
        start: token.start,
        end: token.end,
      },
      expected,
    });
  }

  private _expect(type: TokenType, message: string): Token {
    if (this._check(type)) {
      return this._advance();
    }
    this._addError(message, [type]);
    return this._current();
  }

  private _expectIdentifier(message: string): Token {
    if (isValidIdentifier(this._current().value)) {
      this._position += 1;
      return this._previous();
    }
    this._addError(message, [TokenType.IDENTIFIER]);
    return this._current();
  }

  private _match(...types: TokenType[]): boolean {
    for (let i = 0; i < types.length; i += 1) {
      if (this._check(types[i])) {
        this._advance();
        return true;
      }
    }
    return false;
  }

  private _skipStatement(): void {
    while (this._position < this._tokens.length && !this._check(TokenType.SEMICOLON)) {
      this._advance();
    }
    if (this._check(TokenType.SEMICOLON)) {
      this._advance();
    }
  }

  private _createPosition(start: number, end: number, startToken: Token): Position {
    return {
      line: startToken.line,
      column: startToken.column,
      start,
      end,
    };
  }

  private _parseStringLiteral(message: string): StringLiteralNode {
    const startToken = this._expect(TokenType.STRING_LITERAL, message);
    return {
      type: ASTKind.STRING_LITERAL,
      position: this._createPosition(startToken.start, startToken.end, startToken),
      value: startToken.value,
    };
  }

  private _parseNumberLiteral(message: string): NumberLiteralNode {
    const startToken = this._expect(TokenType.NUMBER_LITERAL, message);
    return {
      type: ASTKind.NUMBER_LITERAL,
      position: this._createPosition(startToken.start, startToken.end, startToken),
      value: startToken.value,
    };
  }

  private _parseBooleanLiteral(message: string): BooleanLiteralNode {
    const startToken = this._current();
    if (!this._match(TokenType.TRUE, TokenType.FALSE)) {
      this._addError(message, [TokenType.TRUE, TokenType.FALSE]);
    }
    return {
      type: ASTKind.BOOLEAN_LITERAL,
      position: this._createPosition(startToken.start, startToken.end, startToken),
      value: startToken.value === 'true',
    };
  }

  private _parseSyntax(): SyntaxNode {
    const startToken = this._current();
    this._expect(TokenType.SYNTAX, 'Expect "syntax" keyword');
    this._expect(TokenType.EQUAL, 'Expect "=" after syntax keyword');
    const version = this._parseStringLiteral('Expect syntax version string after "="');
    this._expect(TokenType.SEMICOLON, 'Expect ";" after syntax version');
    
    return {
      type: ASTKind.SYNTAX,
      version,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  private _parseIdentifier(message: string): IdentifierNode {
    const startToken = this._expectIdentifier(message);
    if (!isValidIdentifier(startToken.value)) {
      this._addError(message);
    }
    return {
      type: ASTKind.IDENTIFIER,
      name: startToken.value,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  private _parseQualifiedIdentifier(message: string): IdentifierNode {
    const startToken = this._expectIdentifier(message);
    let name = startToken.value;
    while (this._match(TokenType.DOT)) {
      const nextToken = this._expectIdentifier('Expect identifier after "."');
      name += `.${nextToken.value}`;
    }

    return {
      type: ASTKind.IDENTIFIER,
      name,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parsePackage(): PackageNode {
    const startToken = this._current();
    this._expect(TokenType.PACKAGE, 'Expect "package" keyword');
    const name = this._parseQualifiedIdentifier('Expect package name after "package" keyword');
    this._expect(TokenType.SEMICOLON, 'Expect ";" after package name');
    
    return {
      type: ASTKind.PACKAGE,
      name,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  private _parseImport(): ImportNode {
    const startToken = this._current();
    this._expect(TokenType.IMPORT, 'Expect "import" keyword');
    const publicKeyword = this._match(TokenType.PUBLIC) ? 'public' : '';
    const path = this._parseStringLiteral('Expect import path after "import" keyword');
    this._expect(TokenType.SEMICOLON, 'Expect ";" after import path');
    
    return {
      type: ASTKind.IMPORT,
      publicKeyword,
      path,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  private _parseOptionName(): IdentifierNode {
    const startToken = this._current();
    let name = '';
    if (this._match(TokenType.L_PARENTHESES)) {
      const innerToken = this._expectIdentifier('Expect option name after "("');
      name = `${name}(${innerToken.value})`;
      this._expect(TokenType.R_PARENTHESES, 'Expect ")" after option name');
    } else {
      name = this._expectIdentifier('Expect option name after "option" keyword').value;
    }
    while (this._match(TokenType.DOT)) {
      const nextToken = this._expectIdentifier('Expect identifier after "."');
      name += `.${nextToken.value}`;
    }
    return {
      type: ASTKind.IDENTIFIER,
      name,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parseOption(): OptionNode {
    const startToken = this._current();
    this._expect(TokenType.OPTION, 'Expect "option" keyword');
    const name = this._parseOptionName();
    this._expect(TokenType.EQUAL, 'Expect "=" after option name');
    let value: StringLiteralNode | NumberLiteralNode | BooleanLiteralNode;
    if (this._check(TokenType.STRING_LITERAL)) {
      value = this._parseStringLiteral('Expect option value after "="');
    } else if (this._check(TokenType.NUMBER_LITERAL)) {
      value = this._parseNumberLiteral('Expect option value after "="');
    } else if (this._check(TokenType.TRUE) || this._check(TokenType.FALSE)) {
      value = this._parseBooleanLiteral('Expect option value after "="');
    } else {
      this._addError('Expect option (string, number, or boolean) value after "="');
      value = {
        type: ASTKind.STRING_LITERAL,
        value: '',
        position: this._createPosition(startToken.start, startToken.end, startToken),
      }
    }
    this._expect(TokenType.SEMICOLON, 'Expect ";" after option value');

    return {
      type: ASTKind.OPTION,
      name,
      value,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  // reference: https://protobuf.dev/programming-guides/proto3/#options
  private _parseEnum(): EnumNode {
    const startToken = this._current();
    this._expect(TokenType.ENUM, 'Expect "enum" keyword');
    const name = this._parseIdentifier('Expect enum name after "enum" keyword');
    this._expect(TokenType.LBRACE, 'Expect "{" after enum name');
    const fields: EnumFieldNode[] = [];
    const reserved: ReservedNode[] = [];
    while (!this._check(TokenType.RBRACE) && this._position < this._tokens.length) {
      this._position += 1;
    }
    this._expect(TokenType.RBRACE, 'Expect "}" after enum fields');
    return {
      type: ASTKind.ENUM,
      name,
      fields,
      reserved,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  parse(): ParseResult {
    // filter comment token
    this._tokens = this._tokens.filter((token) => token.type !== TokenType.COMMENT);

    const protoFile: ProtoFileNode = {
      type: ASTKind.PROTO_FILE,
      position: this._createPosition(0, this._tokens[this._tokens.length - 1].end, this._tokens[0]),
      syntax: null,
      package: null,
      imports: [],
      options: [],
      messages: [],
      enums: [],
      services: [],
      extends: [],
    };
    if (this._check(TokenType.SYNTAX)) {
      protoFile.syntax = this._parseSyntax();
    }

    while (this._position < this._tokens.length) {
      if (this._check(TokenType.PACKAGE)) {
        protoFile.package = this._parsePackage();
      } else if (this._check(TokenType.IMPORT)) {
        protoFile.imports.push(this._parseImport());
      } else if (this._check(TokenType.OPTION)) {
        protoFile.options.push(this._parseOption());
      } else if (this._check(TokenType.ENUM)) {
        protoFile.enums.push(this._parseEnum());
      } else {
        // TODO: this._addError(`Unknown token: ${this._current().value}`);
        this._position += 1;
      }
    }

    return { ast: protoFile, errors: this._errors };
  }
}
