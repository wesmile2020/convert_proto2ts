# A lib for convert proto file to typescript declaration

## Installation

```bash
npm install convert_proto2ts
```

## Usage
```typescript
import { compile } from 'convert_proto2ts';

const protoContent = `
syntax = "proto3";
package example;

message Person {
  string name = 1;
  int32 id = 2;
}
`;

const options = {
  indentSize: 2,
  pathResolver: (path: string) => path.replace('.proto', '.d.ts'),
};

const compilerOutput = compile(protoContent, options);
console.log(compilerOutput);
```

## CompilerOptions

- `indentSize`: The number of spaces to use for indentation in the generated TypeScript code. Default is 2.
- `pathResolver`: A function that takes a path to a proto file and returns the corresponding path to the TypeScript declaration file. Default is `(path: string) => path`.
