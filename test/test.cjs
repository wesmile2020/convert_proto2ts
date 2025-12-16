const fs = require('fs');
const path = require('path');
const Lexer = require('../dist/index.js').Lexer;

const url = path.resolve(__dirname,'./test.proto');

const proto = fs.readFileSync(url, 'utf-8');


const lexer = new Lexer(proto);
const result = lexer.tokenize();
console.log(result);

