import assert from 'node:assert/strict';
import { buildExplorerSelectionHistory, analyzeExplorerSelectionHistory } from '../app/src/data/explorerSelectionInsights.js';

const tableId = 'TEST_SELECTION_INSIGHTS';
const columns = ['jst_code', 'table_id', 'x_axis_rc_code', 'y_axis_rc_code', 'z_axis_rc_code',
  'ref_2024_12_31', 'ref_2025_03_31', 'ref_2025_06_30', 'ref_2025_09_30', 'ref_2025_12_31'];
const rows = [
  ['A', tableId, '0010', '0070', '', '0', '10', '', '30', '40'],
  ['A', tableId, '0020', '0070', '', '20', '20', '20', '20', '20'],
  ['B', tableId, '0010', '0070', '', '1', '1', '1', '1', '1']
];
const taxonomyColumns = ['table_id', 'framework', 'coordinate', 'code', 'description'];
const taxonomyRows = [
  [tableId, '4.0', 'x_axis_rc_code', '0010', 'Amount'],
  [tableId, '4.0', 'x_axis_rc_code', '0020', 'Base'],
  [tableId, '4.0', 'y_axis_rc_code', '0010', 'Legacy amount'],
  [tableId, '4.2', 'x_axis_rc_code', '0010', 'Amount'],
  [tableId, '4.2', 'x_axis_rc_code', '0020', 'Base'],
  [tableId, '4.2', 'y_axis_rc_code', '0070', 'Current amount']
];
const state = {
  columns, rows, selectedJst: 'A',
  availableTaxonomiesByTemplate: { [tableId]: ['4.0', '4.2'] },
  selectedTaxonomiesByTemplate: { [tableId]: '4.2' },
  taxonomyHistory: {
    columns: ['table_id', 'framework', 'effective_from', 'effective_to'],
    rows: [[tableId, '4.0', '2024-01-01', '2024-12-31'], [tableId, '4.2', '2025-01-01', '']]
  },
  taxonomySource: { columns: taxonomyColumns, rows: taxonomyRows },
  explorerPoints: taxonomyRows.filter((row) => row[1] === '4.2').map((row) => ({
    tableId, coordinate: row[2], code: row[3], description: row[4]
  }))
};
const selections = { selectedXCode: '0010', selectedYCode: '0070', selectedZCode: '' };
const raw = buildExplorerSelectionHistory(state, { tableId, institutionId: 'A', selections });
assert.deepEqual(raw.points.map((point) => point.status),
  ['code-unavailable', 'valid', 'missing', 'valid', 'valid']);
assert.equal(raw.points[0].value, null, 'a raw zero must not override an unavailable taxonomy code');
assert.equal(raw.points[2].value, null, 'a blank cell must not become a numeric zero');
const ratio = buildExplorerSelectionHistory(state, { tableId, institutionId: 'A', selections,
  denominator: { tableId, selections: { ...selections, selectedXCode: '0020' } } });
assert.equal(ratio.format, 'Percent');
assert.equal(ratio.points[1].value, 0.5);
assert.equal(ratio.points[2].status, 'missing');
assert.equal(analyzeExplorerSelectionHistory(raw, raw.points[2].label, 3).direction, '',
  'a missing selected value must never produce a trend');

const monthly = Array.from({ length: 15 }, (_, index) => ({
  date: new Date(2025 + Math.floor(index / 12), index % 12, 28),
  label: `m${index}`, framework: '4.2', status: 'valid', value: index
}));
const monthlyInsights = analyzeExplorerSelectionHistory({ points: monthly }, 'm14', 1);
assert.equal(monthlyInsights.cadenceMonths, 1);
assert.equal(monthlyInsights.comparisons[0].absolute, 1);
assert.equal(monthlyInsights.comparisons[1].absolute, 12);
assert.equal(monthlyInsights.chartComparisons[0].absolute, 3);
assert.equal(monthlyInsights.chartComparisons[1].absolute, 12);
assert.equal(monthlyInsights.direction, 'Three consecutive increases');
const acrossFramework = monthly.map((point) => ({ ...point,
  framework: point.date.getFullYear() === 2025 ? '4.0' : '4.2' }));
assert.equal(analyzeExplorerSelectionHistory({ points: acrossFramework }, 'm14', 1).chartComparisons[1].absolute, 12,
  'a framework change alone must not interrupt a comparison when the code exists');
const olderSelection = analyzeExplorerSelectionHistory({ points: monthly }, 'm5', 1);
assert.ok(olderSelection.chartPoints.some((point) => point.label === 'm6'),
  'the graph must retain selectable dates after the currently selected date');

const quarterly = Array.from({ length: 14 }, (_, index) => ({
  date: new Date(2022 + Math.floor(index / 4), (index % 4) * 3 + 2, 28),
  label: `q${index}`, framework: '4.2', status: 'valid', value: index + (index === 13 ? 30 : 0)
}));
const quarterInsights = analyzeExplorerSelectionHistory({ points: quarterly }, 'q13', 1);
assert.equal(quarterInsights.cadenceMonths, 3, 'a quarterly table cannot claim a monthly comparison');
assert.equal(quarterInsights.comparisons[0].absolute, 31);
// A flat history cannot justify a robust dispersion estimate, so it must not
// be labelled as an anomaly just because the last value changed.
assert.equal(quarterInsights.unusual, null);
quarterly.forEach((point, index) => { point.value = [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 50][index]; });
assert.ok(analyzeExplorerSelectionHistory({ points: quarterly }, 'q13', 3).unusual);
console.log('PASS: selected history keeps zero, missing and absent codes distinct; ratios and calendar-frequency comparisons are correct; anomaly signals require a robust baseline.');
