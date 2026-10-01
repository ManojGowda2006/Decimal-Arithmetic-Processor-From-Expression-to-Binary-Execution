const test = require('node:test');
const assert = require('node:assert');
const tc = require('../js/twosComplement.js');

test('range constants', () => {
  assert.strictEqual(tc.BITS, 8);
  assert.strictEqual(tc.MIN, -128);
  assert.strictEqual(tc.MAX, 127);
});

test('toBinary8 known values', () => {
  const cases = {
    0: '00000000',
    1: '00000001',
    5: '00000101',
    40: '00101000',
    50: '00110010',
    100: '01100100',
    127: '01111111',
    [-1]: '11111111',
    [-3]: '11111101',
    [-10]: '11110110',
    [-20]: '11101100',
    [-127]: '10000001',
    [-128]: '10000000'
  };
  for (const [n, bits] of Object.entries(cases)) {
    assert.strictEqual(tc.toBinary8(Number(n)), bits, `toBinary8(${n})`);
  }
});

test('toBinary8 and fromBinary8 round-trip across the whole range', () => {
  for (let n = -128; n <= 127; n++) {
    assert.strictEqual(tc.fromBinary8(tc.toBinary8(n)), n);
  }
});

test('fromBinary8 reads the MSB as -128', () => {
  assert.strictEqual(tc.fromBinary8('10001100'), -116);
  assert.strictEqual(tc.fromBinary8('10000010'), -126);
  assert.strictEqual(tc.fromBinary8('01010000'), 80);
});

test('toBinary8 rejects out-of-range and non-integers', () => {
  for (const bad of [128, -129, 255, 1.5, NaN]) {
    assert.throws(() => tc.toBinary8(bad), RangeError);
  }
});

test('bit-pattern functions reject malformed input', () => {
  for (const bad of ['0101', '012345678', '0000000x', 5, null]) {
    assert.throws(() => tc.fromBinary8(bad), TypeError);
    assert.throws(() => tc.invert(bad), TypeError);
  }
});

test('invert flips every bit', () => {
  assert.strictEqual(tc.invert('00000011'), '11111100');
  assert.strictEqual(tc.invert('11111111'), '00000000');
});

test('addOne propagates carry and drops the carry-out', () => {
  assert.strictEqual(tc.addOne('11111100'), '11111101');
  assert.strictEqual(tc.addOne('00000111'), '00001000');
  assert.strictEqual(tc.addOne('11111111'), '00000000');
});

test('twosComplement of 3 shows flip and +1 (PRD §8)', () => {
  assert.deepStrictEqual(tc.twosComplement('00000011'), {
    original: '00000011',
    inverted: '11111100',
    result: '11111101',
    overflow: false
  });
});

test('twosComplement negates every value except -128', () => {
  for (let n = -127; n <= 127; n++) {
    const r = tc.twosComplement(tc.toBinary8(n));
    assert.strictEqual(tc.fromBinary8(r.result), -n || 0);
    assert.strictEqual(r.overflow, false);
  }
  const min = tc.twosComplement('10000000');
  assert.strictEqual(min.result, '10000000');
  assert.strictEqual(min.overflow, true);
});

test('twosComplement of 0 is 0', () => {
  assert.strictEqual(tc.twosComplement('00000000').result, '00000000');
});

test('encodeTerm traces negative terms through 2\'s complement', () => {
  assert.deepStrictEqual(tc.encodeTerm(40), { value: 40, bits: '00101000', negated: null });
  assert.deepStrictEqual(tc.encodeTerm(-20), {
    value: -20,
    bits: '11101100',
    negated: { original: '00010100', inverted: '11101011', result: '11101100', overflow: false }
  });
  assert.deepStrictEqual(tc.encodeTerm(-128), { value: -128, bits: '10000000', negated: null });
});
