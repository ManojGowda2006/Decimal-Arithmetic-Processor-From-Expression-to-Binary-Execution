/*
 * COA — Simulated 8-bit ALU (ripple-carry adder).
 *
 * The adder works one bit at a time from the LSB, like a chain of full adders:
 *   sum_i   = a_i XOR b_i XOR c_i
 *   c_(i+1) = (a_i AND b_i) OR (c_i AND (a_i XOR b_i))
 *
 * Status flags:
 *   C (carry)    = carry out of the MSB
 *   V (overflow) = carry into MSB XOR carry out of MSB
 *   N (negative) = MSB of the result
 *   Z (zero)     = result is 00000000
 *
 * V is the signed-overflow flag: it is set exactly when
 * positive + positive -> negative, or negative + negative -> positive.
 */
(function (global) {
  'use strict';

  var TC = typeof module !== 'undefined' && module.exports
    ? require('./twosComplement.js')
    : global.TwosComplement;

  var BITS = TC.BITS;

  function signOf(bits) {
    return bits[0] === '1' ? 'negative' : 'positive';
  }

  // Ripple-carry addition of two 8-bit patterns with an optional carry-in.
  // carries[i] is the carry INTO bit column i (MSB-first, same indexing as
  // the bit strings), so carries[0] is the carry into the MSB.
  function add(aBits, bBits, carryIn) {
    var a = TC.fromBinary8(aBits);  // also validates the patterns
    var b = TC.fromBinary8(bBits);
    var carry = carryIn ? 1 : 0;

    var sum = '';
    var carries = new Array(BITS);
    for (var i = BITS - 1; i >= 0; i--) {
      var x = Number(aBits[i]);
      var y = Number(bBits[i]);
      carries[i] = carry;
      sum = (x ^ y ^ carry) + sum;
      carry = (x & y) | (carry & (x ^ y));
    }

    var carryOut = carry;
    var carryIntoMsb = carries[0];
    var overflow = (carryIntoMsb ^ carryOut) === 1;

    var reason = null;
    if (overflow) {
      reason = signOf(aBits) + ' + ' + signOf(bBits) + ' gave a ' + signOf(sum) + ' result';
    }

    return {
      a: aBits,
      b: bBits,
      carryIn: carryIn ? 1 : 0,
      sum: sum,
      carries: carries,
      carryOut: carryOut,
      flags: {
        C: carryOut,
        V: overflow ? 1 : 0,
        N: Number(sum[0]),
        Z: sum === '00000000' ? 1 : 0
      },
      overflow: overflow,
      overflowReason: reason,
      decimal: {
        a: a,
        b: b,
        result: TC.fromBinary8(sum),
        trueResult: a + b + (carryIn ? 1 : 0)
      }
    };
  }

  // A - B = A + 2's complement(B).
  // Like real hardware, the adder receives invert(B) with carry-in 1, which
  // is exactly "+ (invert(B) + 1)" and keeps V correct even for B = -128.
  // The 2's complement steps are returned for display.
  function subtract(aBits, bBits) {
    var negation = TC.twosComplement(bBits);
    var result = add(aBits, negation.inverted, 1);
    result.operation = 'subtract';
    result.negation = negation;
    result.decimal.b = TC.fromBinary8(bBits);
    result.decimal.trueResult = result.decimal.a - result.decimal.b;
    return result;
  }

  // Convenience wrappers taking signed decimal operands (-128..127).
  function addValues(a, b) {
    return add(TC.toBinary8(a), TC.toBinary8(b));
  }

  function subtractValues(a, b) {
    return subtract(TC.toBinary8(a), TC.toBinary8(b));
  }

  var api = {
    add: add,
    subtract: subtract,
    addValues: addValues,
    subtractValues: subtractValues
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.ALU = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
