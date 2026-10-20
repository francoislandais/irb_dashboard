import assert from "node:assert/strict";
import { createIrbGradeYScale } from "../app/src/data/irbGradeScale.js";

const points = [{ pd: 0 }, { pd: 0.0001 }, { pd: 0.001 }, { pd: 0.01 }];
const linear = createIrbGradeYScale(points);
assert.equal(linear.position(0), 1);
assert.ok(linear.position(0.001) > linear.position(0.01));
const log = createIrbGradeYScale(points, "log10");
assert.deepEqual(log.ticks, [0.0001, 0.001, 0.01]);
assert.equal(log.position(0), null);
assert.ok(Math.abs(log.position(0.0001) - 1) < 1e-12);
assert.ok(Math.abs(log.position(0.001) - 0.5) < 1e-12);
assert.ok(Math.abs(log.position(0.01)) < 1e-12);
const zeroOnly = createIrbGradeYScale([{ pd: 0 }], "log10");
assert.deepEqual(zeroOnly.ticks, []);
assert.equal(zeroOnly.position(0), null);
console.log("PASS: linear and log10 PD scales, including zero-PD handling.");
