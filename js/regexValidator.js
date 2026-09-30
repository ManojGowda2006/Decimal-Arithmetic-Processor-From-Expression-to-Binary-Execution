/*
 * FLAT — Regular-expression validation and tokenizing.
 *
 * The language of valid expressions is regular:
 *
 *   N    = 12[0-7] | 1[01][0-9] | [1-9]?[0-9]        (decimal 0..127, no leading zeros)
 *   EXPR = ^ \s* [+-]? \s* N ( \s* [+-] \s* N )* \s* $
 *
 * The 0..127 bound on operands is enforced by the regex itself, so every
 * accepted operand has an 8-bit signed representation.
 */
(function (global) {
  'use strict';

  var OPERAND = '(?:12[0-7]|1[01][0-9]|[1-9]?[0-9])';
  var OPERAND_REGEX = new RegExp('^' + OPERAND + '$');
  var EXPRESSION_REGEX = new RegExp(
    '^\\s*[+-]?\\s*' + OPERAND + '(?:\\s*[+-]\\s*' + OPERAND + ')*\\s*$'
  );
  var TERM_REGEX = /([+-]?)\s*(\d+)/g;

  // Explains *why* an input is rejected. Acceptance is decided only by
  // EXPRESSION_REGEX; this just picks a helpful message.
  function diagnose(expr) {
    var trimmed = expr.trim();
    if (trimmed === '') return 'Expression is empty.';

    var badChar = trimmed.match(/[^0-9+\-\s]/);
    if (badChar) return 'Invalid character "' + badChar[0] + '". Only digits, + and - are allowed.';

    if (/[+-]\s*[+-]/.test(trimmed)) return 'Two operators in a row.';
    if (/[+-]$/.test(trimmed)) return 'Expression ends with an operator.';
    if (/\d\s+\d/.test(trimmed)) return 'Missing operator between numbers.';

    var numbers = trimmed.match(/\d+/g) || [];
    for (var i = 0; i < numbers.length; i++) {
      if (!OPERAND_REGEX.test(numbers[i])) {
        if (numbers[i].length > 1 && numbers[i][0] === '0') {
          return 'Number "' + numbers[i] + '" has a leading zero.';
        }
        return 'Number ' + numbers[i] + ' is out of range. Operands must be 0 to 127.';
      }
    }
    return 'Please enter a valid arithmetic expression.';
  }

  function validate(expr) {
    if (typeof expr !== 'string') expr = '';
    var valid = EXPRESSION_REGEX.test(expr);
    return {
      valid: valid,
      expression: expr.trim(),
      error: valid ? null : diagnose(expr)
    };
  }

  // Splits a *valid* expression into signed terms:
  //   "50 + 40 - 20" -> [{op:'+', magnitude:50, value:50}, {op:'+', ...40}, {op:'-', magnitude:20, value:-20}]
  function tokenize(expr) {
    var result = validate(expr);
    if (!result.valid) throw new Error('Cannot tokenize invalid expression: ' + result.error);

    var terms = [];
    var match;
    TERM_REGEX.lastIndex = 0;
    while ((match = TERM_REGEX.exec(expr)) !== null) {
      var op = match[1] || '+';
      var magnitude = parseInt(match[2], 10);
      terms.push({
        op: op,
        magnitude: magnitude,
        value: op === '-' ? -magnitude || 0 : magnitude
      });
    }
    return terms;
  }

  var api = {
    OPERAND_PATTERN: OPERAND,
    EXPRESSION_REGEX: EXPRESSION_REGEX,
    validate: validate,
    tokenize: tokenize
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.RegexValidator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
