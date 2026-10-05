import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import { getInstitutionChartLabels } from '../app/src/data/institutionChartLabels.js';
import { buildBenchmarkChartModel, renderBenchmarkEndpointLabels } from '../app/src/ui/benchmarkLineChart.js';

const source=readFileSync(new URL('../app/src/ui/explorerView.js',import.meta.url),'utf8');
const start=source.indexOf('function buildExplorerBenchmark(');
const end=source.indexOf('function renderExplorerActiveFilters(',start);
assert.ok(start>=0&&end>start);

const dates=[
  {label:'March',date:new Date(2026,2,31),index:0},
  {label:'June',date:new Date(2026,5,30),index:1},
  {label:'September',date:new Date(2026,8,30),index:2}
];
const rows={
  A:{data:[[10,20,30]],base:[[100,100,100]]},
  B:{data:[[1,2,3]],base:[[10,20,30]]}
};
let pointCalculations=0;
let contribution=null;
const sandbox={
  EXPLORER_TARGET:{tableId:'TEST'},
  getLatestState:()=>({columns:['March','June','September'],selectedJst:'A'}),
  getActiveExplorerTemplate:()=>({tableId:'TEST',label:'Test'}),
  getActiveExplorerContext:()=>({activeAxis:'y'}),
  getCompleteExplorerSelectionsForBenchmark:()=>({}),
  getExplorerBenchmarkContributionContext:()=>contribution,
  getCompleteAxisColumnIndexes:()=>({}),
  getExplorerTemplateReferenceDates:()=>dates,
  getBenchmarkValueFormat:()=>'',
  getBenchmarkLabel:()=> 'Test',
  getPeerBenchmarkJstCodes:()=>['A','B'],
  getBenchmarkRows:(_state,_indexes,tableId,_selections,jst)=>rows[jst][tableId==='BASE'?'base':'data'],
  getBenchmarkPointValue:(data,base,index,isContribution)=>{
    pointCalculations++;
    const value=data.reduce((sum,row)=>sum+row[index],0);
    return isContribution?value/base.reduce((sum,row)=>sum+row[index],0):value;
  }
};
const context=vm.createContext(sandbox);
vm.runInContext(source.slice(start,end),context);

const full=context.buildExplorerBenchmark(['A','B']);
assert.deepEqual([...full.series.map(serie=>serie.values.map(point=>point.value))],[[10,20,30],[1,2,3]]);
assert.equal(pointCalculations,6);

pointCalculations=0;
const selected=context.buildExplorerBenchmark(['A','B'],{onlyDateLabel:'June'});
assert.deepEqual([...selected.series.map(serie=>serie.values.map(point=>point.value))],[[20],[2]]);
assert.equal(selected.dates.length,1);
assert.equal(pointCalculations,2,'the institution panel only computes its visible date');

contribution={tableId:'BASE',selections:{},label:'Base'};
pointCalculations=0;
const ratios=context.buildExplorerBenchmark(['A','B'],{onlyDateLabel:'June'});
assert.deepEqual([...ratios.series.map(serie=>serie.values[0].value)],[0.2,0.1]);
assert.equal(pointCalculations,2,'ratio calculation also stays scoped to the visible date');

pointCalculations=0;
assert.equal(context.buildExplorerBenchmark(['A','B'],{onlyDateLabel:'Unavailable'}).series.length,0);
assert.equal(pointCalculations,0);

assert.match(source,/buildExplorerBenchmark\(institutionOptions,\s*\{\s*onlyDateLabel:/);

const dictionary = {
  A: { institutionName: 'Banque Alpha' },
  B: { institutionName: 'Banque Bêta' },
  C: { institutionName: 'Banque Alpha' }
};
const labels = getInstitutionChartLabels([{ jstCode: 'A' }, { jstCode: 'B' }], dictionary);
assert.equal(labels.get('A'), 'Banque Alpha');
assert.equal(labels.get('B'), 'Banque Bêta');
assert.equal(getInstitutionChartLabels([{ jstCode: 'A' }, { jstCode: 'C' }], dictionary).get('A'), 'Banque Alpha (A)');
assert.equal(getInstitutionChartLabels([{ jstCode: 'UNKNOWN' }], dictionary).get('UNKNOWN'), 'UNKNOWN');

const model = buildBenchmarkChartModel([{
  jstCode: 'A', displayLabel: labels.get('A'),
  points: [{ date: new Date(2026, 2, 31), label: 'March', value: 10 }]
}], 'A', '#006799');
assert.equal(model.series[0].name, 'A', 'the curve retains its institution ID for selection');
assert.equal(model.series[0].custom.benchmarkLabel, 'Banque Alpha', 'the curve carries a distinct display label');

let endpointText = '';
let endpointClick = null;
let selectedCode = '';
const rendererItem = () => ({
  attr() { return this; }, css() { return this; }, add() { return this; },
  on(_event, callback) { endpointClick = callback; return this; }
});
const chart = {
  chartWidth: 500, plotLeft: 30, plotTop: 20, plotWidth: 250, plotHeight: 120,
  container: { querySelectorAll: () => [] },
  renderer: {
    path: () => rendererItem(),
    label: (text) => { endpointText = text; return rendererItem(); }
  },
  series: [{
    visible: true, name: 'A', color: '#006799',
    userOptions: { custom: { benchmarkLabel: 'Banque Alpha' } },
    points: [{ plotX: 50, plotY: 50 }]
  }]
};
renderBenchmarkEndpointLabels(chart, 'A', (code) => { selectedCode = code; });
assert.equal(endpointText, 'Banque Alpha');
endpointClick();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(selectedCode, 'A', 'clicking a name label selects its technical institution ID');
console.log('PASS: institution values and ratios use only the selected reference date; the full chart keeps its history.');
