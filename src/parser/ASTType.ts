import type { TokenType } from "@/lexer/TokenType";

export interface Position {
  line: number;
  column: number;
  start: number;
  end: number;
}

export const enum ASTKind {
  FIELD_TYPE,
  FIELD_LABEL,
  FIELD_OPTION,

  IDENTIFIER,
  STRING_LITERAL,
  NUMBER_LITERAL,
  BOOLEAN_LITERAL,
  OPTION,
  TO,
  RESERVED,
  FIELD,
  ONEOF,
  ENUM_FIELD,
  ENUM,
  EXTEND,
  EXTENSIONS,
  MESSAGE,
  RPC_METHOD,
  SERVICE,
  IMPORT,
  PACKAGE,
  SYNTAX,
  PROTO_FILE,
}

export interface ASTNode<T extends ASTKind = ASTKind> {
  type: T;
  position: Position;
}

export interface IdentifierNode extends ASTNode<ASTKind.IDENTIFIER> {
  value: string;
}

export interface StringLiteralNode extends ASTNode<ASTKind.STRING_LITERAL> {
  value: string;
}

export interface NumberLiteralNode extends ASTNode<ASTKind.NUMBER_LITERAL> {
  value: string;
}

export interface BooleanLiteralNode extends ASTNode<ASTKind.BOOLEAN_LITERAL> {
  value: boolean;
}

export interface OptionNode extends ASTNode<ASTKind.OPTION> {
  name: IdentifierNode;
  value: StringLiteralNode | NumberLiteralNode | BooleanLiteralNode;
}

export interface ToNode extends ASTNode<ASTKind.TO> {
  start: NumberLiteralNode;
  end: NumberLiteralNode;
}

export interface ReservedNode extends ASTNode<ASTKind.RESERVED> {
  ranges: (NumberLiteralNode | StringLiteralNode | ToNode)[];
}

export interface FieldTypeNode extends ASTNode<ASTKind.FIELD_TYPE> {
  name: string;
  arguments: IdentifierNode[];
}

export type LabelType = 'optional' | 'required' | 'repeated';

export interface FiledLabelNode extends ASTNode<ASTKind.FIELD_LABEL> {
  value: LabelType;
}

export interface FieldOptionNode extends ASTNode<ASTKind.FIELD_OPTION> {
  name: IdentifierNode;
  value: StringLiteralNode | NumberLiteralNode | BooleanLiteralNode;
}

export interface FieldNode extends ASTNode<ASTKind.FIELD> {
  name: IdentifierNode;
  fieldType: FieldTypeNode;
  fieldNumber: NumberLiteralNode;
  label: FiledLabelNode | null;
  options: FieldOptionNode[];
}

export interface OneofNode extends ASTNode<ASTKind.ONEOF> {
  name: IdentifierNode;
  fields: FieldNode[];
}

export interface EnumFieldNode extends ASTNode<ASTKind.ENUM_FIELD> {
  name: IdentifierNode;
  value: NumberLiteralNode;
  options: FieldOptionNode[];
}

export interface EnumNode extends ASTNode<ASTKind.ENUM> {
  name: IdentifierNode;
  fields: EnumFieldNode[];
  reserved: ReservedNode[];
  options: OptionNode[];
}

export interface ExtensionsNode extends ASTNode<ASTKind.EXTENSIONS> {
  ranges: (ToNode | NumberLiteralNode)[];
}

export interface ExtendNode extends ASTNode<ASTKind.EXTEND> {
  name: IdentifierNode;
  fields: FieldNode[];
}

export interface MessageNode extends ASTNode<ASTKind.MESSAGE> {
  name: IdentifierNode;
  fields: FieldNode[];
  oneofs: OneofNode[];
  enums: EnumNode[];
  extensions: ExtensionsNode | null;
  extends: ExtendNode[];
  reserved: ReservedNode[];
  messages: MessageNode[];
}

export interface RpcMethodNode extends ASTNode<ASTKind.RPC_METHOD> {
  name: IdentifierNode;
  inputType: IdentifierNode;
  outputType: IdentifierNode;
}

export interface ServiceNode extends ASTNode<ASTKind.SERVICE> {
  name: IdentifierNode;
  methods: RpcMethodNode[];
}

export interface ImportNode extends ASTNode<ASTKind.IMPORT> {
  publicKeyword: 'public' | '';
  path: StringLiteralNode;
}

export interface PackageNode extends ASTNode<ASTKind.PACKAGE> {
  name: IdentifierNode;
}

export interface SyntaxNode extends ASTNode<ASTKind.SYNTAX> {
  version: StringLiteralNode;
}

export interface ProtoFileNode extends ASTNode<ASTKind.PROTO_FILE> {
  syntax: SyntaxNode | null;
  package: PackageNode | null;
  imports: ImportNode[];
  options: OptionNode[];
  messages: MessageNode[];
  enums: EnumNode[];
  services: ServiceNode[];
  extends: ExtendNode[];
}

export interface ParserError {
  message: string;
  position: Position;
  expected?: TokenType[];
}
