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
  type ParserError,
  type Position,
  type ProtoFileNode,
  type ReservedNode,
  type RpcMethodNode,
  type ServiceNode,
  type StringLiteralNode,
  type SyntaxNode,
  type ToNode,
} from './ASTType';
import { isLabelToken, isValidIdentifier } from './helper';
import { isIdentifierChar } from '@/lexer/helper';

interface ParserOutput {
  ast: ProtoFileNode | null;
  errors: ParserError[];
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
  private _errors: ParserError[] = [];

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

  private _nextEffect(count: number = 1): Token {
    let t = count;
    for (let i = this._position + 1; i < this._tokens.length; i += 1) {
      if (this._tokens[i].type !== TokenType.COMMENT) {
        t -= 1;
        if (t <= 0) {
          return this._tokens[i];
        }
      }
    }

    return EOF_TOKEN;
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
      value: startToken.value,
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
      value: name,
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
      name = `(${innerToken.value}`;
      while (this._match(TokenType.DOT)) {
        const nextToken = this._expectIdentifier('Expect identifier after "."');
        name += `.${nextToken.value}`;
      }
      name += ')';
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
      value: name,
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
      };
    }
    this._expect(TokenType.SEMICOLON, 'Expect ";" after option value');

    return {
      type: ASTKind.OPTION,
      name,
      value,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  private _parseFieldOptions(): FieldOptionNode[] {
    if (!this._check(TokenType.LBRACKET)) {
      return [];
    }
    this._advance(); // skip "["
    const options: FieldOptionNode[] = [];
    do {
      const startToken = this._current();
      const name = this._parseIdentifier('Expect option name');
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
        };
      }
      options.push({
        type: ASTKind.FIELD_OPTION,
        name,
        value,
        position: this._createPosition(startToken.start, this._previous().end, startToken),
      });
    } while (this._match(TokenType.COMMA));
    this._expect(TokenType.RBRACKET, 'Expect "]" after field options');

    return options;
  }

  private _parseEnumField(): EnumFieldNode {
    const startToken = this._current();
    const name = this._parseIdentifier('Expect enum field name');
    this._expect(TokenType.EQUAL, 'Expect "=" after enum field name');
    const value = this._parseNumberLiteral('Expect enum field value after "="');

    const options = this._parseFieldOptions();
    this._expect(TokenType.SEMICOLON, 'Expect ";" after enum field value');
    return {
      type: ASTKind.ENUM_FIELD,
      name,
      value,
      options,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  private _parseReserved(): ReservedNode {
    const startToken = this._current();
    this._expect(TokenType.RESERVED, 'Expect "reserved" keyword');
    const ranges: (ToNode | NumberLiteralNode | StringLiteralNode)[] = [];

    do {
      if (this._check(TokenType.NUMBER_LITERAL)) {
        if (this._nextEffect().type === TokenType.TO) {
          const toStartToken = this._current();
          const toStart = this._parseNumberLiteral('Expect number value');
          this._expect(TokenType.TO, 'Expect "to" keyword after number literal');
          const toEnd = this._parseNumberLiteral('Expect number value after "to" keyword');
          ranges.push({
            type: ASTKind.TO,
            start: toStart,
            end: toEnd,
            position: this._createPosition(toStartToken.start, this._previous().end, toStartToken),
          });
        } else {
          const value = this._parseNumberLiteral(
            'Expect (string, number) value after "reserved" keyword',
          );
          ranges.push(value);
        }
      } else if (this._check(TokenType.STRING_LITERAL)) {
        const value = this._parseStringLiteral(
          'Expect (string, number) value after "reserved" keyword',
        );
        ranges.push(value);
      } else {
        this._addError(`Unknown token in reserved ranges: ${this._current().value}`);
      }
    } while (this._match(TokenType.COMMA));
    this._expect(TokenType.SEMICOLON, 'Expect ";" after reserved ranges');

    return {
      type: ASTKind.RESERVED,
      ranges,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parseEnum(): EnumNode {
    const startToken = this._current();
    this._expect(TokenType.ENUM, 'Expect "enum" keyword');
    const name = this._parseIdentifier('Expect enum name after "enum" keyword');
    this._expect(TokenType.LBRACE, 'Expect "{" after enum name');
    const fields: EnumFieldNode[] = [];
    const reserved: ReservedNode[] = [];
    const options: OptionNode[] = [];
    while (!this._check(TokenType.RBRACE) && this._position < this._tokens.length) {
      if (isValidIdentifier(this._current().value) && this._nextEffect().type === TokenType.EQUAL) {
        fields.push(this._parseEnumField());
      } else if (this._check(TokenType.OPTION)) {
        options.push(this._parseOption());
      } else if (this._check(TokenType.RESERVED)) {
        reserved.push(this._parseReserved());
      } else {
        this._addError(`Unknown token in enum: ${this._current().value}`);
        this._position += 1;
      }
    }
    this._expect(TokenType.RBRACE, 'Expect "}" after enum fields');

    return {
      type: ASTKind.ENUM,
      name,
      fields,
      reserved,
      options,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  private _parseLabel(): FiledLabelNode {
    const startToken = this._current();
    if (!isLabelToken(this._current())) {
      this._addError('Expect (optional, required, repeated) label token');
    }
    this._position += 1;

    return {
      type: ASTKind.FIELD_LABEL,
      value: startToken.value as LabelType,
      position: this._createPosition(startToken.start, startToken.end, startToken),
    };
  }

  private _parseFieldType(): FieldTypeNode {
    const startToken = this._current();
    const name = this._parseQualifiedIdentifier('Expect field type name').value;
    const fieldArguments: IdentifierNode[] = [];
    if (this._match(TokenType.L_PARENTHESES)) {
      do {
        fieldArguments.push(this._parseQualifiedIdentifier('Expect field type argument'));
      } while (this._match(TokenType.COMMA));
      this._expect(TokenType.R_PARENTHESES, 'Expect ")" after field type arguments');
    }

    return {
      type: ASTKind.FIELD_TYPE,
      name,
      arguments: fieldArguments,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parseField(): FieldNode {
    const startToken = this._current();
    const label = isLabelToken(this._current()) ? this._parseLabel() : null;
    const fieldType = this._parseFieldType();
    const name = this._parseIdentifier('Expect field name');
    this._expect(TokenType.EQUAL, 'Expect "=" after field name');
    const fieldNumber = this._parseNumberLiteral('Expect field number');
    const options = this._parseFieldOptions();
    this._expect(TokenType.SEMICOLON, 'Expect ";" after field value');

    return {
      type: ASTKind.FIELD,
      name,
      fieldType,
      fieldNumber,
      label,
      options,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parseExtend(): ExtendNode {
    const startToken = this._current();
    this._expect(TokenType.EXTEND, 'Expect "extend" keyword');
    const name = this._parseIdentifier('Expect extend name after "extend" keyword');
    this._expect(TokenType.LBRACE, 'Expect "{" after extend name');
    const fields: FieldNode[] = [];
    while (!this._check(TokenType.RBRACE) && this._position < this._tokens.length) {
      if (isIdentifierChar(this._current().value)) {
        fields.push(this._parseField());
      } else {
        this._addError(`Unknown token in extend: ${this._current().value}`);
        this._position += 1;
      }
    }
    this._expect(TokenType.RBRACE, 'Expect "}" after extend fields');

    return {
      type: ASTKind.EXTEND,
      name,
      fields,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parseExtensions(): ExtensionsNode {
    const startToken = this._current();
    this._expect(TokenType.EXTENSIONS, 'Expect "extensions" keyword');
    const ranges: (NumberLiteralNode | ToNode)[] = [];
    do {
      if (this._nextEffect().type === TokenType.TO) {
        const toStartToken = this._current();
        const toStart = this._parseNumberLiteral('Expect number value');
        this._expect(TokenType.TO, 'Expect "to" keyword after number literal');
        const toEnd = this._parseNumberLiteral('Expect number value after "to" keyword');
        ranges.push({
          type: ASTKind.TO,
          start: toStart,
          end: toEnd,
          position: this._createPosition(toStartToken.start, this._previous().end, toStartToken),
        });
      } else {
        ranges.push(this._parseNumberLiteral('Expect extensions range'));
      }
    } while (this._match(TokenType.COMMA));
    this._expect(TokenType.SEMICOLON, 'Expect ";" after extensions range');

    return {
      type: ASTKind.EXTENSIONS,
      ranges,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parseOneof(): OneofNode {
    const startToken = this._current();
    this._expect(TokenType.ONEOF, 'Expect "oneof" keyword');
    const name = this._parseIdentifier('Expect oneof name after "oneof" keyword');
    this._expect(TokenType.LBRACE, 'Expect "{" after oneof name');
    const fields: FieldNode[] = [];
    while (!this._check(TokenType.RBRACE) && this._position < this._tokens.length) {
      if (isIdentifierChar(this._current().value)) {
        fields.push(this._parseField());
      } else {
        this._addError(`Unknown token in oneof: ${this._current().value}`);
        this._position += 1;
      }
    }
    this._expect(TokenType.RBRACE, 'Expect "}" after oneof fields');

    return {
      type: ASTKind.ONEOF,
      name,
      fields,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _isStatementStart(type: TokenType): boolean {
    return (
      this._check(type) &&
      isIdentifierChar(this._nextEffect().value) &&
      this._nextEffect(2).type === TokenType.LBRACE
    );
  }

  private _parseMessage(): MessageNode {
    const startToken = this._current();
    this._expect(TokenType.MESSAGE, 'Expect "message" keyword');
    const name = this._parseIdentifier('Expect message name after "message" keyword');
    this._expect(TokenType.LBRACE, 'Expect "{" after message name');
    const oneofs: OneofNode[] = [];
    const enums: EnumNode[] = [];
    let extensions: ExtensionsNode | null = null;
    const extendNodes: ExtendNode[] = [];
    const reserved: ReservedNode[] = [];
    const messages: MessageNode[] = [];
    const fields: FieldNode[] = [];

    while (!this._check(TokenType.RBRACE) && this._position < this._tokens.length) {
      if (this._isStatementStart(TokenType.ONEOF)) {
        oneofs.push(this._parseOneof());
      } else if (this._isStatementStart(TokenType.ENUM)) {
        enums.push(this._parseEnum());
      } else if (
        this._check(TokenType.EXTENSIONS) &&
        this._nextEffect().type === TokenType.NUMBER_LITERAL
      ) {
        extensions = this._parseExtensions();
      } else if (this._isStatementStart(TokenType.EXTEND)) {
        extendNodes.push(this._parseExtend());
      } else if (
        this._check(TokenType.RESERVED) &&
        (this._nextEffect().type === TokenType.STRING_LITERAL ||
          this._nextEffect().type === TokenType.NUMBER_LITERAL)
      ) {
        reserved.push(this._parseReserved());
      } else if (this._isStatementStart(TokenType.MESSAGE)) {
        messages.push(this._parseMessage());
      } else if (isIdentifierChar(this._current().value)) {
        fields.push(this._parseField());
      } else {
        this._addError(`Unknown token in message: ${this._current().value}`);
        this._position += 1;
      }
    }
    this._expect(TokenType.RBRACE, 'Expect "}" after message fields');

    return {
      type: ASTKind.MESSAGE,
      name,
      fields,
      oneofs,
      enums,
      extensions,
      extends: extendNodes,
      reserved,
      messages,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parseRpcMethod(): RpcMethodNode {
    const startToken = this._current();
    this._expect(TokenType.RPC, 'Expect "rpc" keyword');
    const name = this._parseIdentifier('Expect rpc method name after "rpc" keyword');

    this._expect(TokenType.L_PARENTHESES, 'Expect "(" after rpc method name');
    const inputType = this._parseIdentifier('Expect request type after "("');
    this._expect(TokenType.R_PARENTHESES, 'Expect ")" after request type');

    this._expect(TokenType.RETURNS, 'Expect "returns" keyword');

    this._expect(TokenType.L_PARENTHESES, 'Expect "(" after "returns" keyword');
    const outputType = this._parseIdentifier('Expect response type after "returns" keyword');
    this._expect(TokenType.R_PARENTHESES, 'Expect ")" after response type');

    this._expect(TokenType.SEMICOLON, 'Expect ";" after rpc method');

    return {
      type: ASTKind.RPC_METHOD,
      name,
      inputType,
      outputType,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  private _parseService(): ServiceNode {
    const startToken = this._current();
    this._expect(TokenType.SERVICE, 'Expect "service" keyword');
    const name = this._parseIdentifier('Expect service name after "service" keyword');
    this._expect(TokenType.LBRACE, 'Expect "{" after service name');
    const methods: RpcMethodNode[] = [];
    while (!this._check(TokenType.RBRACE) && this._position < this._tokens.length) {
      if (isIdentifierChar(this._current().value)) {
        methods.push(this._parseRpcMethod());
      } else {
        this._addError(`Unknown token in service: ${this._current().value}`);
        this._position += 1;
      }
    }
    this._expect(TokenType.RBRACE, 'Expect "}" after service methods');

    return {
      type: ASTKind.SERVICE,
      name,
      methods,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
    };
  }

  parse(): ParserOutput {
    // filter comment token
    this._tokens = this._tokens.filter((token) => token.type !== TokenType.COMMENT);

    const protoFile: ProtoFileNode = {
      type: ASTKind.PROTO_FILE,
      position: this._createPosition(0, this._tokens[this._tokens.length - 1].end, this._tokens[0]),
      syntax: null,
      package: null,
      imports: [],
      options: [],
      enums: [],
      extends: [],
      messages: [],
      services: [],
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
      } else if (this._check(TokenType.EXTEND)) {
        protoFile.extends.push(this._parseExtend());
      } else if (this._check(TokenType.MESSAGE)) {
        protoFile.messages.push(this._parseMessage());
      } else if (this._check(TokenType.SERVICE)) {
        protoFile.services.push(this._parseService());
      } else {
        if (!this._check(TokenType.SEMICOLON)) {
          this._addError(`Unknown token in proto file: ${this._current().value}`);
        }
        this._position += 1;
      }
    }

    return { ast: protoFile, errors: this._errors };
  }
}
