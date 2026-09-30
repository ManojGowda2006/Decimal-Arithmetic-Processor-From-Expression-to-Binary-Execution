# PRD — Decimal Arithmetic Processor

> **Revision 1.1** — resolves an inconsistency in v1.0. See [§16 Revision Notes](#16-revision-notes).

## 1. Project Overview

**Project Title:** Decimal Arithmetic Processor

**Type:** Integrated Micro Project

**Subjects:**

* FLAT — Formal Language and Automata Theory
* DAA — Design and Analysis of Algorithms
* COA — Computer Organization and Architecture

### Purpose

The application demonstrates how a simple **decimal arithmetic expression** can be validated, broken into smaller parts, and finally executed using **binary 2's complement arithmetic**.

The user works with normal decimal numbers. The application exposes what happens internally during processing.

---

# 2. Problem Statement

Users normally perform arithmetic operations using decimal numbers without seeing how these operations are represented and processed internally by a computer.

This project develops a simple arithmetic processor that:

1. Validates decimal arithmetic expressions using **Regular Expressions**.
2. Processes the expression using a **Divide and Conquer** approach.
3. Converts the operands into **8-bit binary representation**.
4. Performs addition/subtraction using **2's Complement arithmetic**.
5. Detects and displays **signed integer overflow**.
6. Shows the binary execution steps along with the final decimal result.

---

# 3. Project Objectives

### FLAT

Use a Regular Expression to validate whether the user's arithmetic expression follows the allowed format.

### DAA

Use Divide and Conquer to divide a multi-term expression into smaller groups, process them recursively, and combine their results.

### COA

Implement a simplified **8-bit 2's Complement ALU** capable of:

* Binary addition
* Subtraction using 2's Complement
* Signed number representation
* Overflow detection

---

# 4. Scope

### Supported

* Integer operands in the range **0 to 127** (the sign comes from the operator)
* An optional leading sign on the first term (e.g. `-5 + 3`)
* Addition `+`
* Subtraction `-`
* 8-bit signed arithmetic
* Multiple terms

Example:

```text
50 + 40 - 20 + 10
```

* Regular Expression validation
* Divide & Conquer processing
* 2's Complement conversion
* Binary addition
* Overflow detection
* Step-by-step execution display

### Not Supported

* Multiplication
* Division
* Decimal/floating-point numbers
* Parentheses
* Complex mathematical precedence
* Scientific notation
* Full compiler/parser implementation
* Database
* Authentication
* Backend

---

# 5. Example User Flow

### Step 1 — Enter Expression

```text
Enter Expression:

50 + 40 - 20 + 10
```

Click:

```text
[ Process Expression ]
```

### Step 2 — FLAT: Validate

The application checks the expression using a Regular Expression.

```text
Expression:
50 + 40 - 20 + 10

✓ Valid Expression
```

If the user enters:

```text
100 ++ 40
```

the application displays:

```text
✗ Invalid Expression
Please enter a valid arithmetic expression.
```

### Grammar

Each operand `N` must be a decimal integer from 0 to 127. This range limit is written into the regular expression itself:

```text
N    = 12[0-7] | 1[01][0-9] | [1-9]?[0-9]
EXPR = ^ \s* [+-]? \s* N ( \s* [+-] \s* N )* \s* $
```

Inputs such as `100 ++ 40`, `5 -`, `abc`, `200`, and `128` are rejected.

---

# 6. DAA: Divide & Conquer

The valid expression is converted into signed terms:

```text
50 + 40 - 20 + 10
```

becomes:

```text
+50
+40
-20
+10
```

The terms are divided recursively (`mid = floor(n / 2)`; a single term is the base case).

```text
              [50, 40, -20, 10]
                       |
                    DIVIDE
                  /         \
             [50, 40]      [-20, 10]
                |             |
             DIVIDE        DIVIDE
             /    \        /    \
            50    40     -20     10
             \    /        \     /
             COMBINE       COMBINE
                 |             |
                90            -10
                  \           /
                   COMBINE
                       |
                      80
```

The important point is that **Divide & Conquer is actually used for the calculation**. Every COMBINE step is executed by the 8-bit ALU (§7), not by ordinary decimal arithmetic.

---

# 7. COA: 2's Complement ALU

Each operand is represented using 8 bits.

```text
50 → 00110010
40 → 00101000
```

The ALU performs ripple-carry binary addition:

```text
  00110010
+ 00101000
-----------
  01011010   = 90
```

The application then interprets the 8-bit result as a signed 2's Complement number.

For 8-bit signed representation, the supported range is:

```text
-128 to +127
```

The range is asymmetric because `10000000` represents -128 and has no positive counterpart.

---

# 8. Subtraction

Subtraction will not require a separate subtraction algorithm.

The ALU will perform:

```text
A - B
```

as:

```text
A + 2's Complement(B)
```

In practice, every `- B` term is converted into its negative 8-bit form with an explicit 2's complement step, and every COMBINE step is an ALU **addition**.

For example:

```text
5 - 3
```

```text
5  = 00000101
3  = 00000011

2's Complement of 3:

00000011
↓ flip
11111100
↓ +1
11111101
```

Then:

```text
  00000101
+ 11111101
-----------
1 00000010   (carry-out discarded)

Result = 2
```

---

# 9. Overflow Detection

The application must identify when a result cannot fit into 8-bit signed representation.

Example:

```text
100 + 40
```

```text
100 = 01100100
 40 = 00101000

  01100100
+ 00101000
-----------
  10001100   → read as signed: -116
```

Mathematically:

```text
100 + 40 = 140
```

But:

```text
8-bit signed range = -128 to +127
```

Therefore:

```text
⚠ Signed Overflow
```

The two signed-overflow cases are **positive + positive → negative** and **negative + negative → positive**. The ALU sets its overflow flag as:

```text
V = (carry into MSB) XOR (carry out of MSB)
```

### Overflow in multi-term expressions

With Divide & Conquer, overflow can happen at an **intermediate** COMBINE step even if later steps do not overflow. So the application reports:

1. **ALU result** — the 8-bit value the hardware actually produces (wrapped).
2. **Mathematical result** — the true decimal value of the expression.
3. **Overflow status** — flagged on every tree node where overflow occurred, plus an overall status.

Example: `100 + 40 - 20 + 10`

```text
[100, 40]  → 01100100 + 00101000 = 10001100 = -116   ⚠ overflow (true value 140)
[-20, 10]  → 11101100 + 00001010 = 11110110 =  -10
root       → 10001100 + 11110110 = 10000010 = -126   (no overflow at this step)

ALU result:          -126  (10000010)
Mathematical result:  130
Status: ⚠ Overflow occurred — 130 is outside -128..+127
```

The ALU result is correct *modulo 256*: `-126 + 256 = 130`. This is the expected behaviour of fixed-width hardware, and the application shows it explicitly instead of hiding it.

---

# 10. Main UI

```text
┌─────────────────────────────────────────────┐
│          DECIMAL ARITHMETIC PROCESSOR       │
├─────────────────────────────────────────────┤
│ Enter Expression                            │
│ [ 50 + 40 - 20 + 10                     ]  │
│             [ PROCESS ]                     │
├─────────────────────────────────────────────┤
│ FLAT — REGEX VALIDATION                     │
│ ✓ Valid Expression                          │
├─────────────────────────────────────────────┤
│ DAA — DIVIDE & CONQUER                      │
│ [50, 40, -20, 10]                          │
│      /          \                           │
│ [50,40]      [-20,10]                      │
│    ↓             ↓                          │
│   90           -10                          │
│      \         /                            │
│          80                                 │
├─────────────────────────────────────────────┤
│ COA — 8-BIT 2's COMPLEMENT ALU             │
│ 50 → 00110010                              │
│ 40 → 00101000                              │
│   00110010                                  │
│ + 00101000                                  │
│ ----------                                  │
│   01011010   = 90   V=0                     │
│ ... (one block per COMBINE step)            │
├─────────────────────────────────────────────┤
│ FINAL RESULT                                │
│ ALU result:          80  (01010000)         │
│ Mathematical result: 80                     │
│ ✓ No overflow                               │
└─────────────────────────────────────────────┘
```

---

# 11. Functional Requirements

### FR1 — Expression Input

The system must allow the user to enter a decimal arithmetic expression.

### FR2 — Expression Validation

The system must validate the expression, including the operand range 0–127, using a Regular Expression.

### FR3 — Expression Processing

The system must convert the valid expression into signed terms.

### FR4 — Divide & Conquer

The system must recursively divide the terms into smaller groups, calculate each group with the ALU, and combine the results.

### FR5 — Binary Conversion

The system must convert decimal operands into 8-bit binary representation.

### FR6 — 2's Complement

The system must calculate the 2's Complement when performing subtraction.

### FR7 — ALU Simulation

The system must perform binary addition using an 8-bit simulated ALU.

### FR8 — Overflow Detection

The system must detect signed overflow at every COMBINE step and clearly notify the user.

### FR9 — Execution Display

The system must display the important intermediate steps rather than only showing the final answer.

### FR10 — Final Result

The system must display the 8-bit ALU result (decimal and binary), the mathematical result, and the overflow status.

---

# 12. Non-Functional Requirements

* Simple and easy-to-understand interface.
* Fast processing for small and medium expressions.
* No database required.
* No login required.
* Should work in a modern web browser, opened directly from disk (no server required).
* Calculations should be deterministic and reproducible.
* Code should be divided into separate modules for FLAT, DAA, and COA.

---

# 13. Project Structure

```text
decimal-arithmetic-processor/
│
├── index.html
├── style.css
│
├── js/
│   ├── regexValidator.js   ← FLAT
│   ├── divideConquer.js    ← DAA
│   ├── twosComplement.js   ← COA
│   ├── alu.js              ← COA
│   └── app.js              ← UI
│
├── test/                   ← unit tests (node --test)
├── docs/PRD.md
└── README.md
```

---

# 14. Technology

**Frontend:** HTML, CSS, JavaScript (classic scripts, no build step).

**Testing:** Node.js built-in test runner (`npm test`), no dependencies.

**No backend or database is required.**

---

# 15. Expected Outcome

Input:

```text
50 + 40 - 20 + 10
```

Output:

```text
1. FLAT   → Valid expression
2. DAA    → Divide expression, process sub-expressions, combine results
3. COA    → Decimal → Binary, 2's Complement, Binary ALU operation, Overflow detection
4. Result → 80  (01010000), no overflow
```

Overflow demonstration input `100 + 40 - 20 + 10` → ALU result `-126`, mathematical result `130`, **overflow flagged** at the `[100, 40]` step.

### The core idea in one sentence

> **The project demonstrates how a human-readable decimal arithmetic expression is validated using Formal Language concepts, efficiently processed using Divide and Conquer, and executed at the binary level using 2's Complement arithmetic.**

---

# 16. Revision Notes

**v1.1**

* **Fixed:** v1.0 gave `100 + 40 - 20 + 10 → 130` as the expected result. But 130 does not fit in 8-bit signed range (-128..+127), so an 8-bit ALU cannot produce it. The real ALU output is `-126` (130 wrapped modulo 256), with overflow at the intermediate `100 + 40` step.
* **Changed:** the primary example is now `50 + 40 - 20 + 10 = 80`, which stays in range. The `100 + 40 ...` expression is kept as the overflow demonstration.
* **Added:** the final result shows both the ALU result and the mathematical result, and overflow is reported for each node (§9, FR8, FR10).
* **Clarified:** the operand range is 0–127 and is enforced by the regex (§5); subtraction is 2's-complement negation followed by ALU addition (§8); the D&C split rule is `floor(n/2)` (§6).
