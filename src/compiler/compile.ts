import { Lexer } from '@/lexer/Lexer';
import { Parser } from '@/parser/Parser';
import type { LexerError } from '@/lexer/TokenType';
import type { ParserError } from '@/parser/ASTType';
import { Generate, type GenerateOptions  } from './Generate';

interface CompilerOutput {
  code: string;
  errors: (LexerError | ParserError)[];
}

export function compile(input: string, options: Partial<GenerateOptions> = {}): CompilerOutput {
  const lexer = new Lexer(input);
  const lexerOutput = lexer.tokenize();
  if (lexerOutput.errors.length > 0) {
    return {
      code: '',
      errors: lexerOutput.errors,
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
