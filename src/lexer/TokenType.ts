export const enum TokenType {
  /** identifier */
  IDENTIFIER,
  STRING_LITERAL,
  NUMBER_LITERAL,

  /** keyword */
  SYNTAX,
  PACKAGE,
  IMPORT,
  MESSAGE,
  ENUM,
  SERVICE,
  OPTION,
  RPC,
  RETURNS,
  OPTIONAL,
  REPEATED,
  REQUIRED,
  MAP,
  ONEOF,
  TO,
  RESERVED,
  EXTENSIONS,
  EXTEND,
  PUBLIC,
  TRUE,
  FALSE,

  /** type */
  DOUBLE,
  FLOAT,
  INT32,
  INT64,
  UINT32,
  UINT64,
  SINT32,
  SINT64,
  FIXED32,
  FIXED64,
  SFIXED32,
  SFIXED64,
  BOOL,
  STRING,
  BYTES,

  /** symbol */

  /** ; */
  SEMICOLON,
  /** , */
  COMMA,
  /** . */
  DOT,
  /** = */
  EQUAL,
  /** { */
  LBRACE,
  /** } */
  RBRACE,
  /** [ */
  LBRACKET,
  /** ] */
  RBRACKET,
  /** ( */
  L_PARENTHESES,
  /** ) */
  R_PARENTHESES,
  /** < */
  L_ANGLE,
  /** > */
  R_ANGLE,
  /** / */
  SLASH,
  /** * */
  STAR,

  /** other */
  /** comment // or /* */
  COMMENT,
  /** : */
  COLON,
  /** end of file */
  EOF,
};

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface LexerError {
  message: string;
  line: number;
  column: number;
}
