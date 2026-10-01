const test = require('node:test');
const assert = require('node:assert');
const alu = require('../js/alu.js');
const tc = require('../js/twosComplement.js');

test('50 + 40 = 90, no overflow', () => {
  const r = alu.addValues(50, 40);
  assert.strictEqual(r.a, '00110010');
  assert.strictEqual(r.b, '00101000');
  assert.strictEqual(r.sum, '01011010');
  assert.strictEqual(r.decimal.result, 90);
  assert.strictEqual(r.overflow, false);
  assert.strictEqual(r.overflowReason, null);
});

test('100 + 40 overflows to -116 (PRD §9)', () => {
  const r = alu.addValues(100, 40);
  assert.strictEqual(r.sum, '10001100');
  assert.strictEqual(r.decimal.result, -116);
  assert.strictEqual(r.decimal.trueResult, 140);
  assert.strictEqual(r.overflow, true);
  assert.deepStrictEqual(r.flags, { C: 0, V: 1, N: 1, Z: 0 });
  assert.strictEqual(r.overflowReason, 'positive + positive gave a negative result');
});

test('-116 + -10 = -126 with no overflow (PRD §9 root step)', () => {
  const r = alu.add('10001100', '11110110');
  assert.strictEqual(r.sum, '10000010');
  assert.strictEqual(r.decimal.result, -126);
  assert.strictEqual(r.carryOut, 1);
  assert.strictEqual(r.overflow, false);
});

test('5 + (-3) = 2, carry-out discarded (PRD §8)', () => {
  const r = alu.add('00000101', '11111101');
  assert.strictEqual(r.sum, '00000010');
  assert.strictEqual(r.carryOut, 1);
  assert.strictEqual(r.overflow, false);
  assert.strictEqual(r.decimal.result, 2);
});

test('carries record the carry into each column (MSB first)', () => {
  // 00000101 + 11111101: bit 0 (1+1) carries into bit 1; bit 1 (0+0+1) stops it;
  // bit 2 (1+1) starts a carry that ripples all the way out of the MSB.
  const r = alu.add('00000101', '11111101');
  assert.deepStrictEqual(r.carries, [1, 1, 1, 1, 1, 0, 1, 0]);
  // 50 + 40: only bit 5 (1+1) generates a carry -> into bit 6 (index 1).
  assert.deepStrictEqual(alu.addValues(50, 40).carries, [0, 1, 0, 0, 0, 0, 0, 0]);
});

test('boundary overflows', () => {
  const posOverflow = alu.addValues(127, 1);
  assert.strictEqual(posOverflow.sum, '10000000');
  assert.strictEqual(posOverflow.overflow, true);

  const negOverflow = alu.addValues(-128, -1);
  assert.strictEqual(negOverflow.sum, '01111111');
  assert.strictEqual(negOverflow.overflow, true);
  assert.strictEqual(negOverflow.overflowReason, 'negative + negative gave a positive result');

  const bigNeg = alu.addValues(-100, -40);
  assert.strictEqual(bigNeg.overflow, true);
  assert.strictEqual(bigNeg.decimal.result, 116);
});

test('mixed signs never overflow', () => {
  assert.strictEqual(alu.addValues(127, -128).overflow, false);
  assert.strictEqual(alu.addValues(-128, 127).decimal.result, -1);
});

test('zero flag', () => {
  assert.strictEqual(alu.addValues(20, -20).flags.Z, 1);
  assert.strictEqual(alu.addValues(20, -19).flags.Z, 0);
});

test('add matches wrapped arithmetic and V matches the true range, for all 65536 pairs', () => {
  for (let a = -128; a <= 127; a++) {
    for (let b = -128; b <= 127; b++) {
      const r = alu.addValues(a, b);
      const truth = a + b;
      const wrapped = ((truth + 128) % 256 + 256) % 256 - 128;
      if (r.decimal.result !== wrapped) assert.fail(`${a} + ${b}: got ${r.decimal.result}, want ${wrapped}`);
      const outOfRange = truth < -128 || truth > 127;
      if (r.overflow !== outOfRange) assert.fail(`${a} + ${b}: overflow ${r.overflow}, want ${outOfRange}`);
    }
  }
});

test('subtract 5 - 3 shows the 2\'s complement steps', () => {
  const r = alu.subtractValues(5, 3);
  assert.strictEqual(r.operation, 'subtract');
  assert.deepStrictEqual(r.negation, {
    original: '00000011',
    inverted: '11111100',
    result: '11111101',
    overflow: false
  });
  assert.strictEqual(r.carryIn, 1);
  assert.strictEqual(r.sum, '00000010');
  assert.strictEqual(r.decimal.result, 2);
  assert.strictEqual(r.decimal.b, 3);
});

test('subtract handles -128 correctly via carry-in', () => {
  const r = alu.subtractValues(0, -128);
  assert.strictEqual(r.sum, '10000000');
  assert.strictEqual(r.decimal.trueResult, 128);
  assert.strictEqual(r.overflow, true);

  assert.strictEqual(alu.subtractValues(-1, -128).decimal.result, 127);
  assert.strictEqual(alu.subtractValues(-1, -128).overflow, false);
});

test('subtract matches wrapped arithmetic and V for all pairs', () => {
  for (let a = -128; a <= 127; a++) {
    for (let b = -128; b <= 127; b++) {
      const r = alu.subtractValues(a, b);
      const truth = a - b;
      const wrapped = ((truth + 128) % 256 + 256) % 256 - 128;
      if (r.decimal.result !== wrapped) assert.fail(`${a} - ${b}: got ${r.decimal.result}, want ${wrapped}`);
      if (r.overflow !== (truth < -128 || truth > 127)) assert.fail(`${a} - ${b}: wrong overflow`);
    }
  }
});

test('rejects malformed operands', () => {
  assert.throws(() => alu.add('0101', '00000001'), TypeError);
  assert.throws(() => alu.addValues(128, 0), RangeError);
});

test('encoded terms feed straight into the adder', () => {
  const r = alu.add(tc.encodeTerm(10).bits, tc.encodeTerm(-20).bits);
  assert.strictEqual(r.decimal.result, -10);
  assert.strictEqual(r.sum, '11110110');
});
