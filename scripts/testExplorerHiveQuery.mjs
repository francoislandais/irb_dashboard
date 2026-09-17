import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {buildExplorerQueryFromPoints as build} from '../app/src/data/explorerHiveQuery.js';
import {buildDataIndexes} from '../app/src/data/dataIndex.js';
const columns=['table_id','jst_code','x_axis_rc_code','y_axis_rc_code','z_axis_rc_code','ref_2025_03_31','ref_2025_06_30'];
const rows=[];
for(const jst of ['A','B']) for(const x of ['10','20']) for(const y of ['10','20']) for(const z of ['', 'EUR']) rows.push(['F_01.01',jst,x,y,z,'1','2']);
rows.push(['KRI','A','','LIQ52','','3','4'],['KRI','A',"","K'2",'','5','6']);
const state={columns,rows,selectedJst:'A'};
const p=(x,y,date='2025-03-31')=>({tableId:'F_01.01',selectedXCode:x,selectedYCode:y,selectedZCode:'__ALL__',referenceDateIso:date});
const k=id=>({tableId:'KRI',selectedYCode:id,referenceDateIso:'2025-03-31'});
// Execute generated SQL against a small independent SQL engine using the
// same source schemas; only the Hive-specific regexp expression is adapted.
function execute(sql) {
 const portable=sql.replace(/regexp_replace\(table_id, '[^']*', ''\)/g,'table_id');
 const result=spawnSync('python3',['-c',`
import sqlite3,json,sys
v=json.load(sys.stdin); c=sqlite3.connect(':memory:')
c.execute("ATTACH DATABASE ':memory:' AS crp_agora")
c.execute('CREATE TABLE crp_agora.agora_its_bft_current (table_id,jst_code,x_axis_rc_code,y_axis_rc_code,z_axis_rc_code,reference_period,value_decimal,is_group_head,is_highest_cons)')
c.execute('CREATE TABLE crp_agora.agora_dm_imas_kris_raw (jst_code,kri_data_point_id,reference_period,value_decimal,is_group_head,is_highest_cons)')
for r in v['rows']:
 for i,d in enumerate(['2025-03-31','2025-06-30']):
  if r[0]=='KRI': c.execute('INSERT INTO crp_agora.agora_dm_imas_kris_raw VALUES (?,?,?,?,?,?)',(r[1],r[3],d,r[5+i],'Y','Y'))
  else: c.execute('INSERT INTO crp_agora.agora_its_bft_current VALUES (?,?,?,?,?,?,?,?,?)',(*r[:5],d,r[5+i],'Y','Y'))
print(json.dumps(c.execute(v['sql']).fetchall()))
`],{input:JSON.stringify({sql:portable,rows}),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr+'\n'+sql);
 return JSON.parse(result.stdout);
}
for(const indexed of [false,true]) {
 const s={...state,...(indexed?{dataIndexes:buildDataIndexes(columns,rows)}:{})};
 const diagonal=[p('0010','0010'),p('0020','0020')];
 assert.equal(execute(build(s,diagonal)).length,2);
 const rectangle=[p('10','10'),p('10','20'),p('20','10'),p('20','20')];
 const sql=build(s,rectangle);
 assert.match(sql,/x_axis_rc_code IN/);assert.match(sql,/y_axis_rc_code IN/);
 assert.equal(execute(sql).length,4);
 assert.equal(execute(build(s,[...rectangle,...rectangle])).length,4);
 assert.equal(execute(build(s,[p('10','10'),p('10','10','2025-06-30')])).length,2);
 assert.equal(execute(build(s,diagonal,{includeDateFilter:false})).length,4);
 const kri=build(s,[k('LIQ52'),k("K'2")]);
 assert.match(kri,/agora_dm_imas_kris_raw/);assert.doesNotMatch(kri,/agora_its_bft_current/);
 assert.match(kri,/kri_data_point_id IN/);assert.equal(execute(kri).length,2);
 assert.equal(execute(build(s,[...diagonal,k('LIQ52')])).length,3);
 assert.equal(execute(build(s,[{...p('10','10'),jstCode:'B'}]))[0][1],'B');
 assert.equal(build(s,[]),null);
 assert.ok(sql.split('\n').every(line=>line.length<110));
}
// Real UI helpers: union all selected ranges, deduplicate overlapping cells,
// show immediately, and retain points for reopening through Query.
const source=readFileSync(new URL('../app/src/ui/explorerView.js',import.meta.url),'utf8');
const a={classList:{contains:()=>false},closest:()=>({}),point:p('10','10')};
const b={...a,point:p('20','20')};
let openings=0;
const sandbox={getActiveExplorerCellRanges:()=>[{cells:[a,b]},{cells:[a]}],getExplorerCellQueryPoint:(row,cell)=>cell.point,
 elements:{explorerQueryButton:{}},showExplorerQueryDialog:()=>openings++,buildExplorerQueryFromPoints:build,getLatestState:()=>state};
const ctx=vm.createContext(sandbox);
vm.runInContext('let explorerQueryPoints=[];'+source.slice(source.indexOf('function getExplorerQuerySelectionPoints('),source.indexOf('function clearExplorerContributionBase(')),ctx);
vm.runInContext('setExplorerQueryPoints(getExplorerQuerySelectionPoints(null,null))',ctx);
assert.equal(vm.runInContext('explorerQueryPoints.length',ctx),2);assert.equal(openings,1);
vm.runInContext('openExplorerQuery()',ctx);assert.equal(openings,2);
assert.equal(sandbox.elements.explorerQueryButton.disabled,false);
console.log('PASS: exact SQL results, KRI source, ITS/KRI union, factorization, dates, blank currency, JST, escaping, indexed/fallback data, range inclusion and immediate dialog.');
