import assert from "node:assert/strict";
import { formatMetricValue } from "../app/src/data/core/formatting.js";

assert.equal(formatMetricValue(0.0187, "millions", "%"), "1,87 %");
assert.equal(formatMetricValue(1.87, "millions", "%"), "187 %");
assert.equal(formatMetricValue(-1.87, "millions", "%"), "-187 %");
assert.equal(formatMetricValue(1.87, "millions"), "0");

console.log("PASS: explicitly percent-formatted values are scaled from fractions, including values above 100%.");
