# Decimal Arithmetic Processor — From Expression to Binary Execution

An integrated micro project (FLAT · DAA · COA). A decimal expression such as `50 + 40 - 20 + 10` goes through three stages:

1. **FLAT**: it is validated with a regular expression.
2. **DAA**: it is evaluated recursively with Divide & Conquer.
3. **COA**: every combine step runs on a simulated **8-bit 2's complement ALU**, which detects overflow.

See [docs/PRD.md](docs/PRD.md) for the full requirements.

## Run

Open `index.html` in any modern browser. No server or build step is needed.

## Test

```sh
npm test
```

Uses the Node.js built-in test runner (Node 18+). There are no dependencies to install.

## Project structure

```text
index.html, style.css   UI
js/regexValidator.js    FLAT — regex validation + tokenizing
js/divideConquer.js     DAA  — recursive divide & combine
js/twosComplement.js    COA  — 8-bit binary / 2's complement
js/alu.js               COA  — ripple-carry adder + overflow flag
js/app.js               UI glue
test/                   unit tests
```
