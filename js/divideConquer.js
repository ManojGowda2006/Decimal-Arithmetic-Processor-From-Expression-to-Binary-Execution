/*
 * DAA — Divide & Conquer evaluation of signed terms.
 *
 *   solve([t0 .. tn-1]):
 *     n == 1  -> base case: encode the term as an 8-bit pattern
 *     n  > 1  -> DIVIDE at mid = floor(n / 2)
 *                CONQUER both halves recursively
 *                COMBINE the two 8-bit results on the ALU (binary addition)
 *
 * Recurrence: T(n) = 2T(n/2) + O(1)  =>  T(n) = O(n)
 * Exactly n - 1 ALU additions; recursion depth = ceil(log2 n).
 *
 * The real calculation happens here: every COMBINE is ALU.add on bit
 * patterns. The decimal "true value" is tracked next to it only so the
 * UI can show what the 8-bit hardware got right or wrong.
 */
(function (global) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var TC = isNode ? require('./twosComplement.js') : global.TwosComplement;
  var ALU = isNode ? require('./alu.js') : global.ALU;

  // Accepts plain numbers or tokens from RegexValidator.tokenize ({value}).
  function toValues(terms) {
    if (!Array.isArray(terms) || terms.length === 0) {
      throw new Error('Divide & Conquer needs at least one term.');
    }
    return terms.map(function (t) {
      return typeof t === 'number' ? t : t.value;
    });
  }

  function solve(terms) {
    var values = toValues(terms);
    var nextId = 0;
    var steps = [];   // combine nodes in execution (post-order) order
    var leaves = [];
    var calls = 0;

    function build(lo, hi, depth) {
      calls++;
      var slice = values.slice(lo, hi);
      var node = { id: nextId++, depth: depth, terms: slice };

      if (hi - lo === 1) {
        var enc = TC.encodeTerm(slice[0]);
        node.kind = 'leaf';
        node.encoding = enc;
        node.bits = enc.bits;
        node.value = slice[0];
        node.trueValue = slice[0];
        node.overflow = false;
        node.subtreeOverflow = false;
        leaves.push(node);
        return node;
      }

      var mid = lo + Math.floor((hi - lo) / 2);
      node.kind = 'combine';
      node.left = build(lo, mid, depth + 1);
      node.right = build(mid, hi, depth + 1);

      var r = ALU.add(node.left.bits, node.right.bits);
      node.alu = r;
      node.bits = r.sum;
      node.value = r.decimal.result;
      node.trueValue = node.left.trueValue + node.right.trueValue;
      node.overflow = r.overflow;
      node.subtreeOverflow = r.overflow || node.left.subtreeOverflow || node.right.subtreeOverflow;
      node.step = steps.length + 1;
      steps.push(node);
      return node;
    }

    var root = build(0, values.length, 0);

    var maxDepth = 0;
    leaves.forEach(function (l) { if (l.depth > maxDepth) maxDepth = l.depth; });

    return {
      root: root,
      steps: steps,
      leaves: leaves,
      result: {
        value: root.value,
        bits: root.bits,
        trueValue: root.trueValue,
        // Any COMBINE step set the V flag.
        overflow: root.subtreeOverflow,
        overflowSteps: steps.filter(function (s) { return s.overflow; }).length,
        // Does the true answer fit in 8 bits at all?
        inRange: root.trueValue >= TC.MIN && root.trueValue <= TC.MAX,
        // Did the 8-bit answer match the true answer? (It can, even after an
        // intermediate overflow, because the ALU works modulo 256.)
        correct: root.value === root.trueValue
      },
      stats: {
        terms: values.length,
        additions: steps.length,
        recursiveCalls: calls,
        depth: maxDepth
      }
    };
  }

  var api = { solve: solve };

  if (isNode) module.exports = api;
  else global.DivideConquer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
