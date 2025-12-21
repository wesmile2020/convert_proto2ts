import { TokenType, type Token } from '@/lexer/TokenType';
import {
  ASTKind,
  type BooleanLiteralNode,
  type EnumFieldNode,
  type EnumNode,
  type ExtendNode,
  type IdentifierNode,
  type ImportNode,
  type MessageNode,
  type NumberLiteralNode,
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

class Parser {
  private _tokens: Token[];
  private _position: number = 0;
  private _errors: ParseError[] = [];
  
  constructor(tokens: Token[]) {
    this._tokens = tokens;
  }

  private _previous(): Token {
    if (this._position === 0) {
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

  private _next(): Token {
    if (this._position + 1 >= this._tokens.length) {
      return EOF_TOKEN;
    }
    return this._tokens[this._position + 1];
  }

  private _expect(type: TokenType, message: string): boolean {
    if (this._current().type === type) {
      return true;
    }
    this._addError(message);
    return false;
  }

  private _addError(message: string, expected?: string[]): void {
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

  private _createPosition(start: number, end: number, startToken: Token): Position {
    return {
      line: startToken.line,
      column: startToken.column,
      start,
      end,
    };
  }

  private _parseStringLiteral(): StringLiteralNode | null {
    if (!this._expect(TokenType.STRING_LITERAL, "Expected a string literal.")) {
      return null;
    }
    const token = this._current();
    this._position += 1; // skip string literal
    return {
      type: ASTKind.STRING_LITERAL,
      position: this._createPosition(token.start, token.end, token),
      value: token.value,
    };
  }

  private _parseNumberLiteral(): NumberLiteralNode | null {
    if (!this._expect(TokenType.NUMBER_LITERAL, "Expected a number literal.")) {
      return null;
    }
    const token = this._current();
    this._position += 1; // skip number literal
    return {
      type: ASTKind.NUMBER_LITERAL,
      position: this._createPosition(token.start, token.end, token),
      value: token.value,
    };
  }

  private _parseBooleanLiteral(): BooleanLiteralNode | null {
    if (!this._expect(TokenType.TRUE, "Expected a boolean literal.")
      && !this._expect(TokenType.FALSE, "Expected a boolean literal.")) {
      return null;
    }
    const token = this._current();
    this._position += 1; // skip boolean literal
    return {
      type: ASTKind.BOOLEAN_LITERAL,
      position: this._createPosition(token.start, token.end, token),
      value: token.value === 'true',
    };
  }

    private _parseIdentifier(): IdentifierNode | null {
    if (!this._expect(TokenType.IDENTIFIER, "Expected identifier.")) {
      return null;
    }
    const token = this._current();
    this._position += 1; // skip identifier
    return {
      type: ASTKind.IDENTIFIER,
      position: this._createPosition(token.start, token.end, token),
      name: token.value,
    };
  }

  private _parseQualifiedIdentifier(): IdentifierNode | null {
    if (!this._expect(TokenType.IDENTIFIER, "Expected identifier.")) {
      return null;
    }
    const startToken = this._current();
    let value = startToken.value;
    this._position += 1; // skip identifier
    while (this._position < this._tokens.length && this._current().type === TokenType.DOT) {
      this._position += 1; // skip '.'
      if (!this._expect(TokenType.IDENTIFIER, "Expected identifier after '.' .")) {
        return null;
      }
      value += '.' + this._current().value;
      this._position += 1; // skip identifier
    }
    return {
      type: ASTKind.IDENTIFIER,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      name: value,
    };
  }

    private _skip(tokenType: TokenType): void {
    while (this._position < this._tokens.length && this._current().type === tokenType) {
      this._position += 1;
    }
  }

  private _transformComments() {
    this._skip(TokenType.COMMENT);
  }

  private _parseSyntax(): SyntaxNode | null {
    const startToken = this._current();
    this._position += 1; // skip 'syntax'
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.EQUAL, "Expected '=' after 'syntax'.")) {
      return null;
    }
    this._position += 1; // skip '='
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.STRING_LITERAL, "Expected string literal after '='.")) {
      return null;
    }
    const version = this._parseStringLiteral();
    if (!version) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.SEMICOLON, "Expected ';' after syntax version.")) {
      return null;
    }
    this._position += 1; // skip ';'
    
    return {
      type: ASTKind.SYNTAX,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      version,
    };
  }

  private _parsePackage(): PackageNode | null {
    const startToken = this._current();
    this._position += 1; // skip 'package'
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.IDENTIFIER, "Expected package name.")) {
      return null;
    }
    const packageName = this._parseQualifiedIdentifier();
    if (!packageName) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.SEMICOLON, "Expected ';' after package name.")) {
      return null;
    }
    this._position += 1; // skip ';'
    
    return {
      type: ASTKind.PACKAGE,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      name: packageName,
    };
  }

  private _parseImport(): ImportNode | null {
    const startToken = this._current();
    this._position += 1; // skip 'import'
    this._transformComments(); // transform and skip comments
    if (this._current().type === TokenType.PUBLIC) {
      this._position += 1; // skip 'public'
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.STRING_LITERAL, "Expected import path.")) {
      return null;
    }
    const importPath = this._parseStringLiteral();
    if (!importPath) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.SEMICOLON, "Expected ';' after import path.")) {
      return null;
    }
    this._position += 1; // skip ';'
    
    return {
      type: ASTKind.IMPORT,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      path: importPath,
    };
  }

  private _parseOption(): OptionNode | null {
    const startToken = this._current();
    this._position += 1; // skip 'option'
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.IDENTIFIER, "Expected option name.")) {
      return null;
    }
    const optionName = this._parseQualifiedIdentifier();
    if (!optionName) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.EQUAL, "Expected '=' after option name.")) {
      return null;
    }
    this._position += 1; // skip '='
    this._transformComments(); // transform and skip comments
    let optionValue: StringLiteralNode | NumberLiteralNode | BooleanLiteralNode | null = null;
    if (this._current().type === TokenType.STRING_LITERAL) {
      optionValue = this._parseStringLiteral();
    } else if (this._current().type === TokenType.NUMBER_LITERAL) {
      optionValue = this._parseNumberLiteral();
    } else if (this._current().type === TokenType.TRUE || this._current().type === TokenType.FALSE) {
      optionValue = this._parseBooleanLiteral();
    }
    if (!optionValue) {
      this._addError("Expected option value (string, number, or boolean).");
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.SEMICOLON, "Expected ';' after option value.")) {
      return null;
    }
    this._position += 1; // skip ';'

    return {
      type: ASTKind.OPTION,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      name: optionName,
      value: optionValue,
    };
  }

  private _parseReserved(): ReservedNode | null {
    const startToken = this._current();
    this._position += 1; // skip 'reserved'
    this._transformComments(); // transform and skip comments
    const ranges: (NumberLiteralNode | StringLiteralNode | ToNode)[] = [];
    while (this._position < this._tokens.length && this._current().type !== TokenType.SEMICOLON) {
      this._transformComments(); // transform and skip comments
      if (this._current().type === TokenType.SEMICOLON) {
        break;
      }
      if (this._current().type === TokenType.NUMBER_LITERAL) {
        const numberLiteral = this._parseNumberLiteral();
        if (!numberLiteral) {
          this._position += 1;
          continue;
        }
        if (this._current().type === TokenType.TO) {
          this._position += 1; // skip 'to'
          this._transformComments(); // transform and skip comments
          if (!this._expect(TokenType.NUMBER_LITERAL, "Expected number literal after 'to' in reserved range.")) {
            continue;
          }
          const endNumberLiteral = this._parseNumberLiteral();
          if (endNumberLiteral) {
            ranges.push({
              type: ASTKind.TO,
              position: this._createPosition(numberLiteral.position.start, endNumberLiteral.position.end, startToken),
              start: numberLiteral,
              end: endNumberLiteral,
            });
          }
        } else {
          ranges.push(numberLiteral);
          if (this._current().type === TokenType.NUMBER_LITERAL) {
            this._addError("Expected ',' between reserved numbers.");
            this._position += 1;
          }
        }
        continue;
      }
      if (this._current().type === TokenType.STRING_LITERAL) {
        const stringLiteral = this._parseStringLiteral();
        if (!stringLiteral) {
          this._position += 1;
          continue;
        }
        ranges.push(stringLiteral);
        if (this._current().type === TokenType.STRING_LITERAL) {
          this._addError("Expected ',' between reserved strings.");
          this._position += 1;
        }
        continue;
      }
      if (this._expect(TokenType.COMMA, "Expected ',' between reserved ranges.")) {
      } else {
        this._addError(`Unexpected Token: ${this._current().value} in reserved range.`);
      }
      this._position += 1; // forward to prevent infinite loop
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.SEMICOLON, "Expected ';' after reserved ranges.")) {
      return null;
    }
    this._position += 1; // skip ';'

    return {
      type: ASTKind.RESERVED,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      ranges,
    };
  }

  private _parseEnumField(): EnumFieldNode | null {
    const startToken = this._current();
    const name = this._parseIdentifier();
    if (!name) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.EQUAL, "Expected '=' after enum field name.")) {
      return null;
    }
    this._position += 1; // skip '='
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.NUMBER_LITERAL, "Expected number literal after '=' in enum field.")) {
      return null;
    }
    const numberLiteral = this._parseNumberLiteral();
    if (!numberLiteral) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.SEMICOLON, "Expected ';' after enum field.")) {
      return null;
    }
    this._position += 1; // skip ';'
    return {
      type: ASTKind.ENUM_FIELD,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      name,
      value: numberLiteral,
    };
  }

  private _parseEnum(): EnumNode | null {
    const startToken = this._current();
    this._position += 1; // skip 'enum'
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.IDENTIFIER, "Expected enum name.")) {
      return null;
    }
    const enumName = this._parseIdentifier();
    if (!enumName) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.LBRACE, "Expected '{' after enum name.")) {
      return null;
    }
    this._position += 1; // skip '{'

    const enumFields: EnumFieldNode[] = [];
    const reserved: ReservedNode[] = [];
    while (this._position < this._tokens.length && this._current().type !== TokenType.RBRACE) {
      this._transformComments(); // transform and skip comments
      if (this._current().type === TokenType.RBRACE) {
        break;
      }
      if (this._current().type === TokenType.RESERVED) {
        // parse reserved
        const reservedNode = this._parseReserved();
        if (reservedNode) {
          reserved.push(reservedNode);
        }
        continue;
      }
      if (this._current().type === TokenType.IDENTIFIER) {
        const enumField = this._parseEnumField(); 
        if (enumField) {
          enumFields.push(enumField);
        }
        continue;
      }

      this._addError("Expected enum field or reserved.");
      this._position += 1; // Prevent infinite loop for this example
    }
    this._position += 1; // skip '}'

    return {
      type: ASTKind.ENUM,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      name: enumName,
      fields: enumFields,
      reserved,
    };
  }

  parse(): ParseResult {
    const protoFile: ProtoFileNode = {
      type: ASTKind.PROTO_FILE,
      position: this._createPosition(0, this._tokens[this._tokens.length - 1].end, this._tokens[0]),
      syntax: null,
      package: null,
      options: [],
      imports: [],
      messages: [],
      enums: [],
      services: [],
      extends: [],
    };

    while (this._position < this._tokens.length) {
      if (this._current().type === TokenType.SYNTAX) {
        protoFile.syntax = this._parseSyntax();
        continue;
      }
      if (this._current().type === TokenType.PACKAGE) {
        protoFile.package = this._parsePackage();
        continue;
      }
      if (this._current().type === TokenType.IMPORT) {
        const importNode = this._parseImport();
        if (importNode) {
          protoFile.imports.push(importNode);
        }
        continue;
      }

      if (this._current().type === TokenType.OPTION) {
        const optionNode = this._parseOption();
        if (optionNode) {
          protoFile.options.push(optionNode);
        }
        continue;
      }

      if (this._current().type === TokenType.ENUM) {
        const enumNode = this._parseEnum();
        if (enumNode) {
          protoFile.enums.push(enumNode);
        }
        continue;
      }

      this._position += 1; // Prevent infinite loop for this example
    }

    return { ast: protoFile, errors: this._errors };
  }
}

export { Parser };