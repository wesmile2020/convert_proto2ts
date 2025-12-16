export const TokenType = {
  /** identifier */
  IDENTIFIER: 0,
  STRING_LITERAL: 1,
  NUMBER_LITERAL: 2,

  /** keyword */
  SYNTAX: 3,
  PACKAGE: 4,
  IMPORT: 5,
  MESSAGE: 6,
  ENUM: 7,
  SERVICE: 8,
  RPC: 9,
  RETURNS: 10,
  OPTIONAL: 11,
  REPEATED: 12,
  REQUIRED: 13,
  MAP: 14,
  ONEOF: 15,

  /** type */
  DOUBLE: 16,
  FLOAT: 17,
  INT32: 18,
  INT64: 19,
  UINT32: 20,
  UINT64: 21,
  SINT32: 22,
  SINT64: 23,
  FIXED32: 24,
  FIXED64: 25,
  SFIXED32: 26,
  SFIXED64: 27,
  BOOL: 28,
  STRING: 29,
  BYTES: 30,

  /** symbol */
  SEMICOLON: 31,  // ;
  COMMA: 32,  // ,
  DOT: 33,  // .
  EQUAL: 34,  // =
  LBRACE: 35,  // {
  RBRACE: 36,  // }
  LBRACKET: 37,  // [
  RBRACKET: 38,  // ]
  L_PARENTHESES: 39,  // (
  R_PARENTHESES: 40,  // )
  L_ANGLE: 41,  // <
  R_ANGLE: 42,  // >
  SLASH: 43,  // /
  STAR: 44,  // *

  /** other */
  COMMENT: 45,  // // 或 /* */
  WHITESPACE: 46,  // 空格
  NEWLINE: 47,  // 换行
  EOF: 48,  // 文件结束
};

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

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