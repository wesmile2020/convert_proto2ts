const fs = require('fs');
const path = require('path');
const { Lexer, Parser } = require('../dist/index.js');

const url = path.resolve(__dirname,'./test.proto');

const proto = fs.readFileSync(url, 'utf-8');


const lexer = new Lexer(proto);
const tokenResult = lexer.tokenize();

const parser = new Parser(tokenResult.tokens);
const parseResult = parser.parse();
// console.log(parseResult);
if (parseResult.errors.length === 0) {
  fs.writeFileSync(path.resolve(__dirname,'./ast.json'), JSON.stringify(parseResult.ast, null, 2));
}
