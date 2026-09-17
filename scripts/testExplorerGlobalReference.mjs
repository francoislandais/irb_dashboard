import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {getReferenceColumns} from '../app/src/data/core/referenceColumns.js';
const source=fs.readFileSync('app/src/ui/explorerView.js','utf8');
const html=fs.readFileSync('app/index.html','utf8');
assert.match(html, /<label[^>]*reference-date-field[^>]*hidden>/);
assert.match(html, /<select id="global-reference-select" disabled>/);
const state={columns:['ref_2026_03_31','ref_2026_06_30']};
const references=getReferenceColumns(state.columns);
let active;
let url=new URL('https://example.test/?template=TEST&explorer_reference_date='+encodeURIComponent(references[0].label));
const sandbox={getReferenceColumns,getLatestState:()=>state,getActiveExplorerContext:()=>active,isExplorerXYView:()=>false,createUrlState:()=>new URL(url),replaceExplorerUrlState:value=>url=value};
const ctx=vm.createContext(sandbox);
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
vm.runInContext(`let explorerGlobalReferenceLabel=${JSON.stringify(references[0].label)},explorerGlobalDisplayMode="temporal";
const EXPLORER_REFERENCE_URL_PARAM="explorer_reference_date",EXPLORER_DISPLAY_URL_PARAM="explorer_display",AXIS_URL_PARAM="axis",ROW_URL_PARAM="row",COLUMN_URL_PARAM="column",TAB_URL_PARAM="tab",EXPLORER_ANCHOR_REFERENCE_URL_PARAM="explorer_anchor_date",EXPLORER_HISTORY_PERIODS_URL_PARAM="explorer_history_periods",EXPLORER_GEOGRAPHY_LAYOUT_URL_PARAM="explorer_geography_layout",EXPLORER_GEOGRAPHY_SEARCH_URL_PARAM="explorer_geography_search";
let explorerAnchorReferenceLabel="",explorerGlobalHistoryPeriods=12,DEFAULT_EXPLORER_HISTORY_PERIODS=12,explorerGeographyLayout="euro-first",explorerGeographySearch="";`+
 section('function createExplorerTemplateContext()', 'function getActiveExplorerTemplate()')+
 section('function getSelectedExplorerReference(', 'function getActiveExplorerEvolutionOption()')+
 section('function updateUrlExplorerSelectionParams()', 'function getUrlDisplayModeParam()')+
 section('function recomputeExplorerSelectedCellColumnIndex(', 'function buildExplorerEvolutionSeries('),ctx);
const run=text=>vm.runInContext(text,ctx);
const first=run('createExplorerTemplateContext()'),second=run('createExplorerTemplateContext()');
active=first;
assert.equal(first.selectedReferenceLabel,references[0].label);
first.selectedReferenceLabel=references[1].label;
assert.equal(second.selectedReferenceLabel,references[1].label);
active=second;
assert.equal(run('getSelectedExplorerReference().label'),references[1].label);
sandbox.available=[references[0]];
run('recomputeExplorerSelectedCellColumnIndex(available,getLatestState(),[0])');
assert.equal(second.selectedReferenceLabel,references[1].label);
assert.equal(second.selectedCellColumnIndex,-1);
run('updateUrlExplorerSelectionParams()');
assert.equal(url.searchParams.get('explorer_reference_date'),references[1].label);
assert.equal(url.searchParams.get('template'),'TEST');
second.selectedReferenceLabel=references[0].label;
assert.equal(first.selectedReferenceLabel,references[0].label);
run('updateUrlExplorerSelectionParams()');
assert.equal(url.searchParams.get('explorer_reference_date'),references[0].label);
// A different dataset resolves the global default once, never per template.
state.columns=['ref_2025_12_31'];
assert.equal(run('getSelectedExplorerReference().label'),'31/12/2025');
assert.equal(first.selectedReferenceLabel,second.selectedReferenceLabel);
console.log('PASS: shared date across contexts, exact missing-date retention, URL synchronization and dataset renewal.');
