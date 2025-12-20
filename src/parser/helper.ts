import { type ASTNode, ASTKind } from './ASTType';

export function isIdentifierNode(node: ASTNode): node is ASTNode<ASTKind.IDENTIFIER> {
  return node.type === ASTKind.IDENTIFIER;
}

export function isStringLiteralNode(node: ASTNode): node is ASTNode<ASTKind.STRING_LITERAL> {
  return node.type === ASTKind.STRING_LITERAL;
}

export function isNumberLiteralNode(node: ASTNode): node is ASTNode<ASTKind.NUMBER_LITERAL> {
  return node.type === ASTKind.NUMBER_LITERAL;
}
