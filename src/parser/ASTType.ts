export interface Position {
  line: number;
  column: number;
  start: number;
  end: number;
}

export const enum ASTKind {
  FIELD_TYPE,
  FIELD_OPTION,

  IDENTIFIER,
  STRING_LITERAL,
  NUMBER_LITERAL,
  OPTION,
  TO,
  RESERVED,
  FIELD,
  ONEOF,
  ENUM_VALUE,
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
  name: string;
}

export interface StringLiteralNode extends ASTNode<ASTKind.STRING_LITERAL> {
  value: string;
}

export interface NumberLiteralNode extends ASTNode<ASTKind.NUMBER_LITERAL> {
  value: string;
}

export interface BooleanLiteralNode extends ASTNode<ASTKind.NUMBER_LITERAL> {
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
  name: IdentifierNode;
}

export interface FiledTypeWithArgumentsNode extends FieldTypeNode {
  arguments: IdentifierNode[];
}

export interface FieldOptionNode extends ASTNode<ASTKind.FIELD_OPTION> {
  name: IdentifierNode;
  value: StringLiteralNode | NumberLiteralNode | BooleanLiteralNode;
}

export interface FieldNode extends ASTNode<ASTKind.FIELD> {
  name: IdentifierNode;
  fieldType: FieldTypeNode;
  fieldNumber: NumberLiteralNode;
  label: 'optional' | 'required' | 'repeated' | null;
  options: FieldOptionNode[];
}

export interface OneofNode extends ASTNode<ASTKind.ONEOF> {
  name: IdentifierNode;
  fields: FieldNode[];
}

export interface EnumValueNode extends ASTNode<ASTKind.ENUM_VALUE> {
  name: IdentifierNode;
  value: NumberLiteralNode;
}

export interface EnumNode extends ASTNode<ASTKind.ENUM> {
  name: IdentifierNode;
  values: EnumValueNode[];
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
  reserved: ReservedNode | null;
  messages: MessageNode[];
}

export interface RpcMethodNode extends ASTNode<ASTKind.RPC_METHOD> {
  name: IdentifierNode;
  inputType: FieldTypeNode;
  outputType: FieldTypeNode;
}

export interface ServiceNode extends ASTNode<ASTKind.SERVICE> {
  name: IdentifierNode;
  methods: RpcMethodNode[];
}

export interface ImportNode extends ASTNode<ASTKind.IMPORT> {
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
  messages: MessageNode[];
  enums: EnumNode[];
  services: ServiceNode[];
  extends: ExtendNode[];
}
