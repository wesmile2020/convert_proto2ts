import { TokenType, type Token } from '@/lexer/TokenType';
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

  private _parseStringLiteral(message: string): StringLiteralNode | null {
    if (!this._expect(TokenType.STRING_LITERAL, message)) {
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

  private _parseNumberLiteral(message: string): NumberLiteralNode | null {
    if (!this._expect(TokenType.NUMBER_LITERAL, message)) {
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

  private _parseBooleanLiteral(message: string): BooleanLiteralNode | null {
    if (!this._expect(TokenType.TRUE, message)
      && !this._expect(TokenType.FALSE, message)) {
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

  private _parseLabel(): FiledLabelNode | null {
    const token = this._current();
    if (!isLabelToken(token)) {
      this._addError('Expected `optional`, `required`, or `repeated` label.');
      return null;
    }
    this._position += 1; // skip label token

    return {
      type: ASTKind.FIELD_LABEL,
      position: this._createPosition(token.start, this._previous().end, token),
      value: token.value as LabelType,
    };
  }

  private _parseIdentifier(message: string): IdentifierNode | null {
    if (!isValidIdentifier(this._current().value)) {
      this._addError(message);
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

  private _parseQualifiedIdentifier(message: string): IdentifierNode | null {
    if (!isValidIdentifier(this._current().value)) {
      this._addError(message);
      return null;
    }
    const startToken = this._current();
    let value = startToken.value;
    this._position += 1; // skip identifier
    while (this._position < this._tokens.length && this._current().type === TokenType.DOT) {
      this._position += 1; // skip '.'
      if (!isValidIdentifier(this._current().value)) {
        this._addError('Expected identifier after "." .');
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
    const version = this._parseStringLiteral("Expected string literal after '=' in syntax.");
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
    const packageName = this._parseQualifiedIdentifier('Expected package name after "package" keyword.');
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
    const importPath = this._parseStringLiteral("Expected import path after import keyword.");
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
    const optionName = this._parseQualifiedIdentifier("Expected option name after 'option' keyword.");
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
      optionValue = this._parseStringLiteral("Expected option value (string).");
    } else if (this._current().type === TokenType.NUMBER_LITERAL) {
      optionValue = this._parseNumberLiteral("Expected option value (number).");
    } else if (this._current().type === TokenType.TRUE || this._current().type === TokenType.FALSE) {
      optionValue = this._parseBooleanLiteral("Expected option value (boolean).");
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
        const numberLiteral = this._parseNumberLiteral('Expected number literal in reserved range.');
        if (!numberLiteral) {
          this._position += 1;
          continue;
        }
        if (this._current().type === TokenType.TO) {
          this._position += 1; // skip 'to'
          this._transformComments(); // transform and skip comments
          const endNumberLiteral = this._parseNumberLiteral("Expected number literal after 'to' in reserved range.");
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
            this._addError('Expected "," between reserved numbers.');
          }
        }
        if (this._current().type === TokenType.COMMA) {
          this._position += 1; // skip ','
        }
        continue;
      }
      if (this._current().type === TokenType.STRING_LITERAL) {
        const stringLiteral = this._parseStringLiteral("Expected string literal in reserved range.");
        if (stringLiteral) {
          ranges.push(stringLiteral);
        }
        if (this._current().type === TokenType.STRING_LITERAL) {
          this._addError("Expected ',' between reserved strings.");
        }
        if (this._current().type === TokenType.COMMA) {
          this._position += 1; // skip ','
        }
        continue;
      }
      if (this._current().type === TokenType.COMMA) {
        this._addError('Expect identifier or number before ",".');
        this._position += 1;
        continue;
      }
      this._addError(`Unexpected Token: ${this._current().value} in reserved range.`);
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
    const name = this._parseIdentifier('Expected enum field name.');
    if (!name) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.EQUAL, `Expected '=' after enum field name.`)) {
      return null;
    }
    this._position += 1; // skip '='
    this._transformComments(); // transform and skip comments
    const numberLiteral = this._parseNumberLiteral(`Expected number literal after '=' in enum field.`);
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
    const enumName = this._parseIdentifier('Expected enum name.');
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
      if (isValidIdentifier(this._current().value)) {
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

  private _parseInternalType(): FieldTypeNode | null {
    const token = this._current();
    if (!isInternalTypeToken(token)) {
      this._addError(`Unexpected Token: ${token.value} in not support type.`);
      return null;
    }
    this._position += 1; // skip internal type token
    return {
      type: ASTKind.FIELD_TYPE,
      position: this._createPosition(token.start, this._previous().end, token),
      name: token.value,
    };
  }

  private _parseFieldOptions(): FieldOptionNode[] {
    const options: FieldOptionNode[] = [];
    if (this._current().type !== TokenType.LBRACKET) {
      return options;
    }
    this._position += 1; // skip '['
    while (this._position < this._tokens.length && this._current().type !== TokenType.RBRACKET) {
      this._transformComments(); // transform and skip comments
      if (this._current().type === TokenType.RBRACKET) {
        break;
      }
      const startToken = this._current();
      const optionsName = this._parseIdentifier('Expected option name in field options.');
      if (!optionsName) {
        continue;
      }
      this._transformComments(); // transform and skip comments
      if (!this._expect(TokenType.EQUAL, 'Expected "=" after option name.')) {
        this._position += 1;
        continue;
      }
      this._position += 1; // skip '='
      this._transformComments(); // transform and skip comments
      let optionValue: StringLiteralNode | BooleanLiteralNode | NumberLiteralNode | null = null;
      if (this._current().type === TokenType.STRING_LITERAL) {
        optionValue = this._parseStringLiteral('Expected string literal after "=" in field option.');
      } else if (this._current().type === TokenType.TRUE || this._current().type === TokenType.FALSE) {
        optionValue = this._parseBooleanLiteral('Expected boolean literal after "=" in field option.');
      } else if (this._current().type === TokenType.NUMBER_LITERAL) {
        optionValue = this._parseNumberLiteral('Expected number literal after "=" in field option.');
      }
      if (!optionValue) {
        this._addError('Expect string, boolean, or number value after "=" in field option.');
        continue;
      }
      options.push({
        type: ASTKind.FIELD_OPTION,
        position: this._createPosition(startToken.start, this._previous().end, startToken),
        name: optionsName,
        value: optionValue,
      });
      this._transformComments();
      
      if (isValidIdentifier(this._current().value)) {
        this._addError('Expect "," after field option.');
      }

      if (this._current().type === TokenType.COMMA) {
        this._position += 1; // skip ','
        continue;
      }

      this._addError(`Unexpected Token: ${this._current().value} in field option.`);
      this._position += 1;
    }

    if (this._expect(TokenType.RBRACKET, 'Expected "]" after field options.')) {
      this._position += 1; // skip ']'
    }
    return options;
  }

  private _parseField(): FieldNode | null {
    const startToken = this._current();
    let label: FiledLabelNode | null = null;
    if (isLabelToken(this._current())) {
      label = this._parseLabel();
    }
    this._transformComments(); // transform and skip comments

    let fieldType: FieldTypeNode | null = null;
    if (isInternalTypeToken(this._current())) {
      fieldType = this._parseInternalType();
    } else if (isValidIdentifier(this._current().value)) {
      fieldType = {
        type: ASTKind.FIELD_TYPE,
        position: this._createPosition(this._current().start, this._current().end, this._current()),
        name: this._current().value,
      };
      this._position += 1;
    }
    if (!fieldType) {
      this._addError('Expect internal type or identifier for field type.');
      return null;
    }
    this._transformComments(); // transform and skip comments
    const name = this._parseIdentifier('Expected field name after field type.');
    if (!name) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.EQUAL, `Expected '=' after field name.`)) {
      return null;
    }
    this._position += 1; // skip '='
    this._transformComments(); // transform and skip comments
    const fieldNumber = this._parseNumberLiteral(`Expected number literal after '=' in field.`);
    if (!fieldNumber) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    const options = this._parseFieldOptions();
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.SEMICOLON, "Expected ';' after field.")) {
      return null;
    }
    this._position += 1; // skip ';'
    
    return {
      type: ASTKind.FIELD,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      name: name,
      fieldType: fieldType,
      fieldNumber: fieldNumber,
      label: label,
      options,
    };
  }

  private _checkIsMessageField(): boolean {
    if (
      isLabelToken(this._current()) ||
      isInternalTypeToken(this._current())
    ) {
      return true;
    }
    if (isValidIdentifier(this._current().value)) {
      for (let i = this._position + 1; i < this._tokens.length; i += 1) {
        if (this._tokens[i].type === TokenType.SEMICOLON) {
          break;
        }
        if (this._tokens[i].type === TokenType.EQUAL) {
          return true;
        }
      }
    }

    return false;
  }

  private _parseMessage(): MessageNode | null {
    const startToken = this._current();
    this._position += 1; // skip 'message'
    this._transformComments(); // transform and skip comments
    const messageName = this._parseIdentifier('Expected message name after message keyword.');
    if (!messageName) {
      return null;
    }
    this._transformComments(); // transform and skip comments
    if (!this._expect(TokenType.LBRACE, "Expected '{' after message name.")) {
      return null;
    }
    this._position += 1; // skip '{'
    
    const fields: FieldNode[] = [];
    const oneofs: OneofNode[] = [];
    const enums: EnumNode[] = [];
    let extensions: ExtensionsNode | null = null;
    const extendNodes: ExtendNode[] = [];
    const reserved: ReservedNode[] = [];
    const messages: MessageNode[] = [];
    while (this._position < this._tokens.length && this._current().type !== TokenType.RBRACE) {
      this._transformComments(); // transform and skip comments
      if (this._current().type === TokenType.RBRACE) {
        break;
      }
      if (this._checkIsMessageField()) {
        const field = this._parseField();
        if (field) {
          fields.push(field);
        }
        continue;
      }

      if (this._current().type === TokenType.MESSAGE) {
        const message = this._parseMessage();
        if (message) {
          messages.push(message);
        }
        continue;
      }
      
      if (this._current().type === TokenType.RESERVED) {
        // parse reserved
        const reservedNode = this._parseReserved();
        if (reservedNode) {
          reserved.push(reservedNode);
        }
        continue;
      }

      this._position += 1;
    }
    if (!this._expect(TokenType.RBRACE, "Expected '}' after message body.")) {
      return null;
    }
    this._position += 1; // skip '}'
    
    return {
      type: ASTKind.MESSAGE,
      position: this._createPosition(startToken.start, this._previous().end, startToken),
      name: messageName,
      fields,
      oneofs,
      enums,
      extensions,
      extends: extendNodes,
      reserved,
      messages,
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

      if (this._current().type === TokenType.MESSAGE) {
        const messageNode = this._parseMessage();
        if (messageNode) {
          protoFile.messages.push(messageNode);
        }
        continue;
      }

      this._position += 1; // Prevent infinite loop for this example
    }

    return { ast: protoFile, errors: this._errors };
  }
}

export { Parser };
