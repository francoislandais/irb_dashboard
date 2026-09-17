import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { buildExplorerXYSeries, buildExplorerXYHeaders } from "../app/src/data/explorerXY.js";
import { buildDataIndexes } from "../app/src/data/dataIndex.js";
import { normalizeAxisCode } from "../app/src/data/core/axisCode.js";
import { getReferenceColumns } from "../app/src/data/core/referenceColumns.js";
import { buildExplorerDisplayRows, normalizeExplorerSeriesRow, normalizeHierarchyPath, getParentPaths, getExplicitPaths } from "../app/src/data/explorer.js";
import { formatMetricValue, isUnitFormat } from "../app/src/data/core/formatting.js";

const point = (axis, code, description, format = "") => {
  const parts = description.split(" / ");
  return { tableId: "TEST", coordinate: `${axis}_axis_rc_code`, code: normalizeAxisCode(code, axis), description,
    displayDescription: parts.at(-1), hierarchyPath: parts.join(" > "), parentPath: parts.slice(0,-1).join(" > "), indentLevel: parts.length - 1, format };
};
const columns = ["jst_code", "table_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code", "ref_2025_03_31", "ref_2025_06_30"];
const points = [point("x", "10", "Assets / Gross"), point("x", "20", "Assets / Net"), point("x", "30", "Standalone"),
  point("y", "10", "Loans", "Unit"), point("y", "20", "Deposits", "%"), point("z", "EUR", "Euro")];
const rows = [
  ["A","TEST","10","10","EUR","10","20"], ["A","TEST","10","10","EUR","2","3"],
  ["A","TEST","20","10","EUR","0","4"], ["A","TEST","10","20","EUR","0.25","0.5"],
  ["A","TEST","20","20","EUR","","-2"], ["A","TEST","30","20","EUR","invalid", ""],
  ["A","TEST","10","10","USD","999","999"], ["B","TEST","10","10","EUR","888","888"],
  ["A","OTHER","10","10","EUR","777","777"], ["A","TEST","10","10","","100","200"]
];
const base = { columns, rows, explorerPoints: points, selectedJst: "A" };
const dates = getReferenceColumns(columns);
let matrix;
for (const indexed of [false,true]) {
  const state = { ...base, ...(indexed ? { dataIndexes: buildDataIndexes(columns,rows) } : {}) };
  const input = JSON.stringify(state.rows);
  const options = { tableId: "TEST", axis: "y", selectedZCode: "EUR", referenceLabel: dates[0].label };
  matrix = buildExplorerXYSeries(state, options);
  assert.deepEqual(matrix.rows.map(row => row.values.map(p => p.value)), [[12,0,null],[0.25,null,null]]);
  assert.equal(matrix.rows[0].values[0].format, "Unit");
  assert.equal(matrix.rows[1].values[0].format, "%");
  for (const axis of ["x", "z"]) {
    assert.deepEqual(buildExplorerXYSeries(state, {...options, axis}), matrix);
  }
  assert.equal(buildExplorerXYSeries(state,{...options,referenceLabel:dates[1].label}).rows[0].values[0].value,23);
  assert.equal(buildExplorerXYSeries(state,{...options,selectedZCode:"__ALL__"}).rows[0].values[0].value,100);
  assert.equal(buildExplorerXYSeries(state,{...options,onlyCodes:new Set(["0020"])}).rows.length,1);
  assert.equal(JSON.stringify(state.rows),input);
}

// Every header slot must be covered once, including unequal depth and
// repeated labels belonging to different parents.
function checkHeaders(cols) {
  const headers=buildExplorerXYHeaders(cols);
  const grid=Array.from({length:headers.length},()=>Array(cols.length).fill(0));
  for(let level=0;level<headers.length;level++) for(const cell of headers[level]) {
    for(let r=level;r<level+cell.rowSpan;r++) for(let c=cell.columnIndex;c<cell.columnIndex+cell.colSpan;c++) grid[r][c]++;
  }
  assert.ok(grid.flat().every(value=>value===1));
  assert.equal(headers.flat().filter(cell=>cell.leaf).length,cols.length);
  return headers;
}
const header=checkHeaders(matrix.dateColumns);
assert.equal(header[0][0].colSpan,2);
assert.equal(header[0][1].rowSpan,2);
checkHeaders(["A > Shared > One","A > Shared > Two","B > Shared > Three","A > Shared > Four","Solo"].map((hierarchyPath,i)=>({hierarchyPath,code:String(i)})));
assert.equal(checkHeaders([{hierarchyPath:Array.from({length:12},(_,i)=>`Level ${i}`).join(" > "),code:"deep"},{hierarchyPath:"Short",code:"short"}]).length,12);

// Small DOM fixture: execute the actual table renderer without a browser.
class Element {
  constructor(tag) { this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.classList={add(){},toggle(){}}; }
  append(...nodes) { for(const node of nodes){ if(node.parent) node.parent.children=node.parent.children.filter(n=>n!==node); node.parent=this;this.children.push(node);} }
  prepend(...nodes) { this.append(...nodes);this.children=[...nodes,...this.children.filter(n=>!nodes.includes(n))]; }
  setAttribute(k,v){this[k]=v;}
  get rows(){return this.children.filter(n=>n.tagName==="TR");}
  get cells(){return this.children.filter(n=>["TH","TD"].includes(n.tagName));}
  getBoundingClientRect(){return {height:32};}
}
const source=readFileSync(new URL("../app/src/ui/explorerView.js",import.meta.url),"utf8");
let context={activeAxis:"y",selectedXCode:"0010",selectedYCode:"0010",selectedZCode:"EUR",selectedReferenceLabel:dates[0].label};
const table=new Element("table");
let selectedCalls=0;
const sandbox={
  EXPLORER_ALL_CURRENCIES_CODE:"__ALL__",
  buildExplorerXYHeaders,buildExplorerDisplayRows,normalizeExplorerSeriesRow,normalizeHierarchyPath,getParentPaths,getExplicitPaths,isUnitFormat,
  document:{createElement:tag=>new Element(tag)}, elements:{explorerTable:table},
  getActiveExplorerContext:()=>context,getActiveExplorerAxis:()=>context.activeAxis,
  getActiveExplorerTemplate:()=>({tableId:"TEST"}),isExplorerHistorySelectionActive:()=>false,
  getExplorerAxisDisplayName:()=>"Row",getExplorerContributionBaseValues:()=>null,
  hasCollapsedExplicitAncestor:()=>false,createExplorerSearchText:row=>row.description,
  createDescriptionContent:()=>new Element("span"),formatExplorerFocusedValue:o=>formatMetricValue(o.pointValue,o.selectedUnit,o.valueFormat),
  getLatestState:()=>base,getSelectedExplorerCodeForActiveAxis:()=>context.activeAxis==="y"?context.selectedYCode:context.selectedXCode,
  refreshExplorerSelectionOnly:()=>selectedCalls++,saveExplorerScrollPosition(){},focusSelectedExplorerRow(){},
};
for(const name of ["clearExplorerCellRangeSelection","expandDefaultExplorerPaths","applyExplorerDateFocusValueIntensity","applyExplorerTreeState","renderExplorerKriPaginationBar"]) sandbox[name]=()=>{};
const ctx=vm.createContext(sandbox);
vm.runInContext('let explorerGlobalDisplayMode="xy",lastRenderedExplorerTableSeries=null,lastRenderedExplorerSelectedUnit="",explorerXYHeaderObserver=null,shouldFocusOpenedExplorerPoint=false,hasInteractedWithExplorerSelection=false,explorerContextTopic="";'+source.slice(source.indexOf("function isExplorerXYView()"),source.indexOf("// A separate element outside"))+source.slice(source.indexOf("function selectExplorerRow("),source.indexOf("function applyExplorerSelection()")),ctx);
// Real template contexts share the display mode and preserve their normal axis.
vm.runInContext(source.slice(source.indexOf("function createExplorerTemplateContext()"),source.indexOf("function getActiveExplorerTemplate(")),ctx);
const first=vm.runInContext('createExplorerTemplateContext()',ctx);
const second=vm.runInContext('createExplorerTemplateContext()',ctx);
first.activeAxis="x"; second.activeAxis="z";
assert.equal(first.activeAxis,"y"); assert.equal(second.activeAxis,"y");
vm.runInContext('explorerGlobalDisplayMode="temporal"',ctx);
assert.equal(first.activeAxis,"x"); assert.equal(second.activeAxis,"z");
vm.runInContext('explorerGlobalDisplayMode="xy"',ctx);
Object.assign(first,context); context=first;
// Axis button clicks in XY return before any selection or render side effect.
const axisHandler=source.slice(source.indexOf('if (button.disabled || isExplorerXYView()) return;'),source.indexOf('hasInteractedWithExplorerSelection = true;',source.indexOf('if (button.disabled || isExplorerXYView()) return;')));
for(const axis of ["x","y","z"]) {
  sandbox.button={disabled:false,dataset:{explorerAxis:axis}};
  assert.equal(vm.runInContext('(function(){'+axisHandler+'throw new Error("Axis click changed XY");})()',ctx),undefined);
}
sandbox.matrix=matrix;
vm.runInContext('renderExplorerTable(matrix,"millions")',ctx);
const thead=table.children.find(n=>n.tagName==="THEAD");
const tbody=table.children.find(n=>n.tagName==="TBODY");
assert.equal(thead.rows.length,2);
assert.equal(thead.rows[0].cells[0].rowSpan,2);
assert.equal(tbody.rows[0].cells[2].textContent,"12");
assert.equal(tbody.rows[0].cells[3].textContent,"0");
assert.equal(tbody.rows[0].cells[4].textContent,"-");
assert.equal(tbody.rows[0].cells[3].dataset.explorerXyColumnCode,"0020");
assert.equal(tbody.rows[0].cells[3].dataset.explorerCellDate,dates[0].label);
vm.runInContext('selectExplorerRow("0020", {xyColumnCode:"0020",cellColumnIndex:1})',ctx);
assert.equal(context.selectedXCode,"0020");assert.equal(context.selectedYCode,"0020");assert.equal(context.activeAxis,"y");assert.equal(context.selectedCellColumnIndex,1);assert.equal(selectedCalls,1);
// An ordinary Column axis does not transpose XY or change cell semantics.
context.activeAxis="x";
sandbox.matrix=buildExplorerXYSeries(base,{tableId:"TEST",axis:"x",selectedZCode:"EUR",referenceLabel:dates[0].label});
table.children=[];
vm.runInContext('renderExplorerTable(matrix,"millions"); selectExplorerRow("0010", {xyColumnCode:"0030",cellColumnIndex:2})',ctx);
assert.equal(context.selectedXCode,"0030");assert.equal(context.selectedYCode,"0010");assert.equal(context.activeAxis,"y");
assert.equal(context.selectedReferenceLabel,dates[0].label);
// The XY data is not fed through temporal frequency/history slicing.
vm.runInContext(source.slice(source.indexOf("function buildExplorerEvolutionSeries("),source.indexOf("function getCompleteExplorerSelectionsForBenchmark(")),ctx);
assert.equal(vm.runInContext('buildExplorerEvolutionSeries(matrix,{})',ctx),sandbox.matrix);
// Search on the opposite axis restricts columns and values together.
sandbox.getExplorerAdvancedSearchResults=()=>({hasQuery:true,byTemplate:new Map([["TEST",{restrictedAxis:"x",matchesByAxis:{x:new Set(["0020"])}}]])});
vm.runInContext(source.slice(source.indexOf("function filterExplorerSeriesByAdvancedSearch("),source.indexOf("// Same matching rules as filterExplorerSeriesByAdvancedSearch")),ctx);
sandbox.matrix=matrix;
const filtered=vm.runInContext('filterExplorerSeriesByAdvancedSearch(matrix,{},"TEST","y")',ctx);
assert.equal(filtered.dateColumns.length,1);assert.equal(filtered.dateColumns[0].code,"0020");assert.equal(filtered.rows[0].values[0].value,0);
assert.equal(buildExplorerXYSeries({...base,explorerPoints:[...points,points[0]]},{tableId:"TEST",selectedZCode:"EUR"}).dateColumns.length,3);
const missing=buildExplorerXYSeries({...base,rows:[],explorerPoints:[]},{tableId:"TEST"});assert.ok(missing.status);assert.equal(missing.rows.length,0);
context.activeAxis="z";assert.equal(vm.runInContext('isExplorerXYView()',ctx),true);
console.log("PASS: XY values, fixed orientation, global display mode, dates, Z/JST filters, missing vs zero, formats, merged header coverage, real table rendering, coordinate selection and inert axis buttons.");
