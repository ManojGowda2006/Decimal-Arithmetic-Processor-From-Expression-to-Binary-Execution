const test = require('node:test');
const assert = require('node:assert');
const { solve } = require('../js/divideConquer.js');
const { tokenize } = require('../js/regexValidator.js');

test('single term is the base case', () => {
  const r = solve([42]);
  assert.strictEqual(r.root.kind, 'leaf');
  assert.strictEqual(r.root.bits, '00101010');
  assert.strictEqual(r.result.value, 42);
  assert.strictEqual(r.steps.length, 0);
  assert.deepStrictEqual(r.stats, { terms: 1, additions: 0, recursiveCalls: 1, depth: 0 });
});

test('two terms: one combine', () => {
  const r = solve([5, -3]);
  assert.strictEqual(r.root.kind, 'combine');
  assert.strictEqual(r.root.right.encoding.negated.inverted, '11111100');
  assert.strictEqual(r.root.alu.sum, '00000010');
  assert.strictEqual(r.result.value, 2);
});

test('PRD §6 example: 50 + 40 - 20 + 10 = 80', () => {
  const r = solve(tokenize('50 + 40 - 20 + 10'));
  const { root } = r;

  assert.deepStrictEqual(root.terms, [50, 40, -20, 10]);
  assert.deepStrictEqual(root.left.terms, [50, 40]);
  assert.deepStrictEqual(root.right.terms, [-20, 10]);
  assert.strictEqual(root.left.value, 90);
  assert.strictEqual(root.right.value, -10);

  assert.strictEqual(root.left.bits, '01011010');
  assert.strictEqual(root.right.bits, '11110110');
  assert.strictEqual(r.result.bits, '01010000');
  assert.strictEqual(r.result.value, 80);
  assert.strictEqual(r.result.overflow, false);
  assert.strictEqual(r.result.correct, true);

  // Execution order is post-order: left combine, right combine, root.
  assert.deepStrictEqual(r.steps.map(s => s.terms), [[50, 40], [-20, 10], [50, 40, -20, 10]]);
  assert.deepStrictEqual(r.steps.map(s => s.step), [1, 2, 3]);
  assert.deepStrictEqual(r.stats, { terms: 4, additions: 3, recursiveCalls: 7, depth: 2 });
});

test('PRD §9 example: 100 + 40 - 20 + 10 -> ALU -126, true 130', () => {
  const r = solve(tokenize('100 + 40 - 20 + 10'));
  const [left, right, root] = r.steps;

  assert.strictEqual(left.bits, '10001100');
  assert.strictEqual(left.value, -116);
  assert.strictEqual(left.trueValue, 140);
  assert.strictEqual(left.overflow, true);

  assert.strictEqual(right.value, -10);
  assert.strictEqual(right.overflow, false);

  assert.strictEqual(root.bits, '10000010');
  assert.strictEqual(root.overflow, false);       // this step alone is fine
  assert.strictEqual(root.subtreeOverflow, true); // but its left child overflowed

  assert.deepStrictEqual(
    { value: r.result.value, trueValue: r.result.trueValue, overflow: r.result.overflow,
      overflowSteps: r.result.overflowSteps, inRange: r.result.inRange, correct: r.result.correct },
    { value: -126, trueValue: 130, overflow: true, overflowSteps: 1, inRange: false, correct: false }
  );
});

test('intermediate overflow can still yield the correct final answer (mod 256)', () => {
  const r = solve([100, 40, -20, -30]);
  assert.strictEqual(r.steps[0].overflow, true);
  assert.strictEqual(r.result.overflow, true);
  assert.strictEqual(r.result.inRange, true);
  assert.strictEqual(r.result.value, 90);
  assert.strictEqual(r.result.correct, true);
});

test('odd term count splits at floor(n/2)', () => {
  const r = solve([1, 2, 3]);
  assert.deepStrictEqual(r.root.left.terms, [1]);
  assert.deepStrictEqual(r.root.right.terms, [2, 3]);
  assert.strictEqual(r.result.value, 6);

  const five = solve([1, 2, 3, 4, 5]);
  assert.deepStrictEqual(five.root.left.terms, [1, 2]);
  assert.deepStrictEqual(five.root.right.terms, [3, 4, 5]);
  assert.strictEqual(five.result.value, 15);
});

test('n - 1 additions and depth ceil(log2 n) for n = 1..64', () => {
  for (let n = 1; n <= 64; n++) {
    const r = solve(Array(n).fill(1));
    assert.strictEqual(r.stats.additions, n - 1);
    assert.strictEqual(r.stats.recursiveCalls, 2 * n - 1);
    assert.strictEqual(r.stats.depth, Math.ceil(Math.log2(n)));
    assert.strictEqual(r.leaves.length, n);
  }
});

test('result always equals true sum wrapped to 8 bits', () => {
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 500; i++) {
    const n = 1 + Math.floor(rand() * 12);
    const terms = Array.from({ length: n }, () => Math.floor(rand() * 256) - 128);
    const r = solve(terms);
    const truth = terms.reduce((a, b) => a + b, 0);
    const wrapped = ((truth + 128) % 256 + 256) % 256 - 128;
    assert.strictEqual(r.result.trueValue, truth);
    assert.strictEqual(r.result.value, wrapped, `terms ${terms}`);
  }
});

test('ids are unique and leaves keep their 2\'s complement trace', () => {
  const r = solve(tokenize('-5 + 3 - 7'));
  const ids = new Set();
  (function walk(n) { ids.add(n.id); if (n.left) { walk(n.left); walk(n.right); } })(r.root);
  assert.strictEqual(ids.size, 5);
  assert.strictEqual(r.leaves[2].encoding.negated.original, '00000111');
  assert.strictEqual(r.result.value, -9);
});

test('rejects empty input', () => {
  assert.throws(() => solve([]), /at least one term/);
  assert.throws(() => solve(null), /at least one term/);
});
