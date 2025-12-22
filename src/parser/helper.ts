import { TokenType, type Token } from '@/lexer/TokenType';
import { type ASTNode, ASTKind } from './ASTType';

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

export function isInternalTypeToken(token: Token): boolean {
  return (
    token.type === TokenType.DOUBLE ||
    token.type === TokenType.FLOAT ||
    token.type === TokenType.INT32 ||
    token.type === TokenType.INT64 ||
    token.type === TokenType.UINT32 ||
    token.type === TokenType.UINT64 ||
    token.type === TokenType.SINT32 ||
    token.type === TokenType.SINT64 ||
    token.type === TokenType.FIXED32 ||
    token.type === TokenType.FIXED64 ||
    token.type === TokenType.SFIXED32 ||
    token.type === TokenType.SFIXED64 ||
    token.type === TokenType.BOOL ||
    token.type === TokenType.STRING ||
    token.type === TokenType.BYTES
  );
}

export function isIdentifierNode(node: ASTNode): node is ASTNode<ASTKind.IDENTIFIER> {
  return node.type === ASTKind.IDENTIFIER;
}

export function isStringLiteralNode(node: ASTNode): node is ASTNode<ASTKind.STRING_LITERAL> {
  return node.type === ASTKind.STRING_LITERAL;
}

export function isNumberLiteralNode(node: ASTNode): node is ASTNode<ASTKind.NUMBER_LITERAL> {
  return node.type === ASTKind.NUMBER_LITERAL;
}
