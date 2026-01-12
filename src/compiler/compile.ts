import { Lexer } from '@/lexer/Lexer';
import { Parser } from '@/parser/Parser';
import { Generate, type GenerateOptions  } from './Generate';

interface CompilerError {
  message: string;
  position: {
    line: number;
    column: number;
    start: number;
    end: number;
  };
}

export interface CompilerOutput {
  code: string;
  errors: CompilerError[];
}

export function compile(input: string, options: Partial<GenerateOptions> = {}): CompilerOutput {
  const lexer = new Lexer(input);
  const lexerOutput = lexer.tokenize();
  if (lexerOutput.errors.length > 0) {
    const errors = lexerOutput.errors.map((error) => ({
      message: error.message,
      position: {
        line: error.line,
        column: error.column,
        start: error.position,
        end: error.position + 1,
      },
    }));

    return {
      code: '',
      errors,
    };
  }
  const parser = new Parser(lexerOutput.tokens);
  const parserOutput = parser.parse();
  if (parserOutput.errors.length > 0 || parserOutput.ast === null) {
    return {
      code: '',
      errors: parserOutput.errors,
    };
  }
  const generate = new Generate(parserOutput.ast, options);
  return {
    code: generate.generate(),
    errors: [],
  };
}
