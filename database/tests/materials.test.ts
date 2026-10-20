import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateMaterial,validatePdf,materialFilter,MAX_PDF_BYTES} from '../../src/services/material-validation';
import {materialsService} from '../../src/services/materials.service';
import {MaterialError} from '../../src/domain/materials';
const base={title:'Tài liệu ôn tập môn Toán',slug:'tai-lieu-toan',description:'',subjectId:'toan',kind:'pdf',status:'draft'};
test('materials: subject and media type are required; PDF has no external URL',()=>{
  assert.equal(validateMaterial({...base,mediaUrl:'https://example.com/a.pdf'}).mediaUrl,null);
  assert.throws(()=>validateMaterial({...base,subjectId:''}),MaterialError);
  assert.throws(()=>validateMaterial({...base,kind:'html'}),MaterialError);
  assert.throws(()=>validateMaterial({...base,kind:'image',status:'published',mediaUrl:'javascript:alert(1)'}),MaterialError);
  assert.equal(validateMaterial({...base,kind:'video',status:'published',mediaUrl:'https://youtu.be/dQw4w9WgXcQ'}).mediaUrl,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});
test('materials: PDF signature, EOF, size and download filename validation',()=>{
  const bytes=new TextEncoder().encode('%PDF-1.7\nTest PDF\n%%EOF\n');
  assert.equal(validatePdf(bytes,'../Đề ôn tập.pdf').filename,'Đề ôn tập.pdf');
  assert.throws(()=>validatePdf(new TextEncoder().encode('<html>not PDF</html>'),'fake.pdf'),MaterialError);
  assert.throws(()=>validatePdf(new TextEncoder().encode('%PDF-1.7 missing end'),'broken.pdf'),MaterialError);
  assert.throws(()=>validatePdf(new Uint8Array(MAX_PDF_BYTES+1),'big.pdf'),(e:unknown)=>e instanceof MaterialError&&e.status===413);
});
test('materials: filters bound pagination and reject unknown kinds',()=>{
  assert.equal(materialFilter({page:'-5'}).page,1);
  assert.equal(materialFilter({page:'999999'}).page,10000);
  assert.equal(materialFilter({kind:'script'}).kind,'');
});
test('materials: non-admin writes denied before database access',async()=>{
  await assert.rejects(()=>materialsService.save({id:'user',admin:false},{data:base}),(e:unknown)=>e instanceof MaterialError&&e.status===403);
});
