const test = require('node:test');
const assert = require('node:assert');
const { validate, tokenize, EXPRESSION_REGEX } = require('../js/regexValidator.js');

test('accepts well-formed expressions', () => {
  for (const expr of [
    '50 + 40 - 20 + 10',
    '100 + 40 - 20 + 10',
    '5-3',
    '  7  ',
    '0',
    '127 + 127',
    '-5 + 3',
    '+5',
    '1+2+3+4+5+6+7'
  ]) {
    assert.ok(validate(expr).valid, `expected valid: "${expr}"`);
  }
});

test('operand range 0..127 is enforced by the regex', () => {
  for (const n of [0, 9, 10, 99, 100, 109, 110, 119, 120, 127]) {
    assert.ok(EXPRESSION_REGEX.test(String(n)), `${n} should match`);
  }
  for (const n of [128, 129, 130, 199, 200, 255, 1000]) {
    assert.ok(!EXPRESSION_REGEX.test(String(n)), `${n} should not match`);
  }
});

test('rejects malformed expressions with a reason', () => {
  const cases = {
    '': /empty/,
    '   ': /empty/,
    '100 ++ 40': /operators in a row/,
    '5 -': /ends with an operator/,
    '5 + - 3': /operators in a row/,
    'abc': /Invalid character "a"/,
    '5 * 3': /Invalid character "\*"/,
    '2.5 + 1': /Invalid character "\."/,
    '(5 + 3)': /Invalid character "\("/,
    '5 3': /Missing operator/,
    '200 + 1': /out of range/,
    '128': /out of range/,
    '007 + 1': /leading zero/
  };
  for (const [expr, reason] of Object.entries(cases)) {
    const r = validate(expr);
    assert.strictEqual(r.valid, false, `expected invalid: "${expr}"`);
    assert.match(r.error, reason, `wrong reason for "${expr}": ${r.error}`);
  }
});

test('non-string input is invalid', () => {
  assert.strictEqual(validate(undefined).valid, false);
  assert.strictEqual(validate(42).valid, false);
});

test('tokenize produces signed terms', () => {
  assert.deepStrictEqual(tokenize('50 + 40 - 20 + 10'), [
    { op: '+', magnitude: 50, value: 50 },
    { op: '+', magnitude: 40, value: 40 },
    { op: '-', magnitude: 20, value: -20 },
    { op: '+', magnitude: 10, value: 10 }
  ]);
});

test('tokenize handles a leading sign and no spaces', () => {
  assert.deepStrictEqual(tokenize('-5+3').map(t => t.value), [-5, 3]);
  assert.deepStrictEqual(tokenize('+7').map(t => t.value), [7]);
});

test('tokenize normalizes -0 to 0', () => {
  assert.ok(Object.is(tokenize('- 0')[0].value, 0));
});

test('tokenize refuses invalid input', () => {
  assert.throws(() => tokenize('100 ++ 40'), /invalid expression/);
});
