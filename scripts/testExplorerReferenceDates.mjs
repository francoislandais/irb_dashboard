import assert from 'node:assert/strict';
import {buildDataIndexes} from '../app/src/data/dataIndex.js';
import {getReferenceColumns} from '../app/src/data/core/referenceColumns.js';
import {getExplorerTemplateReferenceDates as dates} from '../app/src/data/explorerReferenceDates.js';
const columns=['table_id','jst_code','x_axis_rc_code','y_axis_rc_code','z_axis_rc_code','ref_2026_01_31','ref_2026_02_28','ref_2026_03_31'];
const rows=[['FIRST','A','','','','1','',''],['LAST','A','','','','',0,' '],['LAST','B','','','','text',null,'3']];
for(const indexed of [false,true]) {
 const state={columns,rows:rows.map(row=>[...row]),selectedJst:'A'};
 if(indexed) state.dataIndexes=buildDataIndexes(columns,state.rows);
 for(const table of ['FIRST','LAST','MISSING']) {
  const expected=getReferenceColumns(columns).filter(ref=>state.rows.some(row=>row[0]===table&&String(row[ref.index]??'').trim()!==''));
  assert.deepEqual(dates(state,table),expected);
  assert.equal(dates({...state,selectedJst:'B'},table),dates(state,table));
 }
 const replacement={...state,rows:[['LAST','A','','','','','','']]};
 replacement.dataIndexes=indexed?buildDataIndexes(columns,replacement.rows):undefined;
 assert.deepEqual(dates(replacement,'LAST'),[]);
 const reordered={...state,columns:[...columns.slice(0,5),columns[7],columns[6],columns[5]]};
 assert.notEqual(dates(reordered,'LAST'),dates(state,'LAST'));
}
// Count row reads, rather than relying on noisy timing. Neither an indexed
// first lookup nor repeated clicks may read preceding templates' rows.
let foreignReads=0, ownReads=0;
const trackedRows=Array.from({length:10000},()=>new Proxy(['FIRST','A','','','','1','2','3'],{get(target,key){foreignReads++;return target[key];}}));
trackedRows.push(new Proxy(['LAST','A','','','','1','2','3'],{get(target,key){ownReads++;return target[key];}}));
const state={columns,rows:trackedRows};state.dataIndexes=buildDataIndexes(columns,trackedRows);
foreignReads=0;ownReads=0;
assert.equal(dates(state,'LAST').length,3);assert.equal(foreignReads,0);
const initial=ownReads;
for(let i=0;i<1000;i++) dates({...state,selectedJst:'A'},'LAST');
assert.equal(ownReads,initial);
console.log('PASS: unchanged dates, all JSTs, zero/blank handling, dataset/schema cache renewal, no preceding-row reads, no cell reads on 1,000 cached calls.');
