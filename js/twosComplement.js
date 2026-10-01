/*
 * COA — 8-bit signed (2's complement) representation.
 *
 * Bit patterns are 8-character strings, MSB first: 5 -> "00000101".
 * Signed value of b7..b0 = -128*b7 + 64*b6 + ... + 1*b0, giving the
 * asymmetric range -128..+127 ("10000000" = -128 has no positive partner).
 */
(function (global) {
  'use strict';

  var BITS = 8;
  var MIN = -128;
  var MAX = 127;

  function assertBits(bits) {
    if (typeof bits !== 'string' || !/^[01]{8}$/.test(bits)) {
      throw new TypeError('Expected an 8-bit string of 0s and 1s, got: ' + bits);
    }
  }

  function assertInRange(n) {
    if (!Number.isInteger(n) || n < MIN || n > MAX) {
      throw new RangeError(n + ' is outside the 8-bit signed range ' + MIN + '..' + MAX);
    }
  }

  // Repeated division by 2 on an unsigned value 0..255.
  function unsignedToBits(u) {
    var bits = '';
    for (var i = 0; i < BITS; i++) {
      bits = (u % 2) + bits;
      u = Math.floor(u / 2);
    }
    return bits;
  }

  // Flip every bit (1's complement).
  function invert(bits) {
    assertBits(bits);
    var out = '';
    for (var i = 0; i < BITS; i++) out += bits[i] === '0' ? '1' : '0';
    return out;
  }

  // Binary +1 with carry propagation from the LSB; the final carry-out is discarded.
  function addOne(bits) {
    assertBits(bits);
    var out = '';
    var carry = 1;
    for (var i = BITS - 1; i >= 0; i--) {
      var sum = Number(bits[i]) + carry;
      out = (sum % 2) + out;
      carry = sum >> 1;
    }
    return out;
  }

  // 2's complement = invert + 1. Returns every step for display.
  // Negating -128 ("10000000") gives "10000000" again; flagged as overflow.
  function twosComplement(bits) {
    assertBits(bits);
    var inverted = invert(bits);
    var result = addOne(inverted);
    return {
      original: bits,
      inverted: inverted,
      result: result,
      overflow: bits === '10000000'
    };
  }

  // Decimal -> 8-bit 2's complement pattern.
  // Non-negative values are converted directly; negative values are built
  // the way the hardware view describes: |n| in binary, then 2's complement.
  function toBinary8(n) {
    assertInRange(n);
    if (n >= 0) return unsignedToBits(n);
    if (n === MIN) return '10000000';
    return twosComplement(unsignedToBits(-n)).result;
  }

  // 8-bit pattern -> signed decimal. The MSB carries weight -128.
  function fromBinary8(bits) {
    assertBits(bits);
    var value = bits[0] === '1' ? MIN : 0;
    for (var i = 1; i < BITS; i++) {
      if (bits[i] === '1') value += 1 << (BITS - 1 - i);
    }
    return value;
  }

  // Full trace of how a signed term becomes its bit pattern.
  // A negative term shows the magnitude's pattern and the 2's complement steps.
  function encodeTerm(value) {
    assertInRange(value);
    if (value >= 0) {
      return { value: value, bits: toBinary8(value), negated: null };
    }
    var magnitudeBits = unsignedToBits(-value);
    var steps = value === MIN ? null : twosComplement(magnitudeBits);
    return { value: value, bits: toBinary8(value), negated: steps };
  }

  var api = {
    BITS: BITS,
    MIN: MIN,
    MAX: MAX,
    toBinary8: toBinary8,
    fromBinary8: fromBinary8,
    invert: invert,
    addOne: addOne,
    twosComplement: twosComplement,
    encodeTerm: encodeTerm
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TwosComplement = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
