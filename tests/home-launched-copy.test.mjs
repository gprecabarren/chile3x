import assert from 'node:assert/strict';
import test from 'node:test';
import {defaultHomeTexts, parseHomeTexts} from '../lib/home-content-policy.ts';

test('an explicitly blank coverage note survives administrative validation, persistence and later reads',()=>{
 for(const layout of ['classic','compact']){
  const oldStored={...defaultHomeTexts(layout),coverageNote:'Nota publicada personalizada',feature2Text:'Descripción personalizada de la cobertura',regionsAccent:'Mi cobertura disponible.'};
  const saved=parseHomeTexts(JSON.stringify({...oldStored,coverageNote:'   '}),layout,true);
  const persisted=JSON.stringify(saved);
  assert.equal(JSON.parse(persisted).coverageNote,'');
  const publicCopy=parseHomeTexts(persisted,layout);
  assert.equal(publicCopy.coverageNote,'');
  assert.equal(publicCopy.feature2Text,oldStored.feature2Text);
  assert.equal(publicCopy.regionsAccent,oldStored.regionsAccent);
  assert.equal(parseHomeTexts(JSON.stringify(oldStored),layout).coverageNote,oldStored.coverageNote);
 }
});
