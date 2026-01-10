import type { FieldNode, FieldTypeNode } from '@/parser/ASTType';

export function getWhitespace(count: number): string {
  let s = ''
  for (let i = 0; i < count; i++) {
    s += ' '
  }
  return s;
}

function transformInternalType(type: string): string {
  if (
    type === 'double'
    || type === 'float'
    || type === 'int32'
    || type === 'int64'
    || type === 'uint32'
    || type === 'uint64'
    || type === 'sint32'
    || type === 'sint64'
    || type === 'fixed32'
    || type === 'fixed64'
    || type === 'sfixed32'
    || type === 'sfixed64'
  ) {
    return 'number';
  }

  if (type === 'bool') {
    return 'boolean';
  }

  if (type === 'string') {
    return 'string';
  }

  if (type === 'bytes') {
    return 'Uint8Array';
  }

  if (type === 'map') {
    return 'Map';
  }

  return type;
}

export function transformFieldType(field: FieldNode): string {
  const fieldType = field.fieldType;
  let prefix = ': ';
  if (field.label?.value === 'optional') {
    prefix = '?: ';
  }
  let suffix = '';
  if (field.label?.value === 'repeated') {
    suffix = '[]';
  }
  if (
    fieldType.name === 'double'
    || fieldType.name === 'float'
    || fieldType.name === 'int32'
    || fieldType.name === 'int64'
    || fieldType.name === 'uint32'
    || fieldType.name === 'uint64'
    || fieldType.name === 'sint32'
    || fieldType.name === 'sint64'
    || fieldType.name === 'fixed32'
    || fieldType.name === 'fixed64'
    || fieldType.name === 'sfixed32'
    || fieldType.name === 'sfixed64'
  ) {
    return `${prefix}number${suffix}`;
  }
  if (fieldType.name === 'bool') {
    return `${prefix}boolean${suffix}`;
  }
  if (fieldType.name === 'string') {
    return `${prefix}string${suffix}`;
  }
  if (fieldType.name === 'bytes') {
    return `${prefix}Uint8Array${suffix}`;
  }

  if (fieldType.arguments.length > 0) {
    let name = fieldType.name;
    if (name === 'map') {
      name = 'Map';
    }
    const args = fieldType.arguments.map((item) => transformInternalType(item.value));
    return `${prefix}${name}<${args.join(', ')}>${suffix}`
  }

  return `${prefix}${fieldType.name}${suffix}`;
}
