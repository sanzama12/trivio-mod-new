import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeNewsHtml,plainNewsToHtml } from '../../src/lib/news-html';
import { validateNews } from '../../src/services/news-validation';

test('rich news preserves fonts, exact sizes, colors, alignment, images and tables',()=>{
  const html='<p style="font-family:Georgia;font-size:24px;text-align:center;color:#ff0000"><strong>Nội dung</strong></p><img src="https://images.example.com/test.jpg" alt="Ảnh minh họa"><table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>';
  const safe=sanitizeNewsHtml(html);
  for(const expected of ['font-family:Georgia','font-size:24px','text-align:center','<strong>','<img','<table>','Ảnh minh họa'])assert.ok(safe.includes(expected),expected);
  assert.equal(sanitizeNewsHtml(safe),safe);
});
test('rich news rejects executable markup and hostile styles including encoded links',()=>{
  const safe=sanitizeNewsHtml('<script>alert(1)</script><svg onload="alert(1)"></svg><img src="https://example.com/a.jpg" onerror="alert(1)"><a href="jav&#x61;script:alert(1)">bad</a><p style="position:fixed;background-image:url(https://evil.example);color:#ff0000">safe</p><iframe src="https://evil.example"></iframe>');
  assert.doesNotMatch(safe,/script|onerror|onload|iframe|<svg|position|background-image/i);
  assert.ok(safe.includes('color:#ff0000'));
});
test('legacy news conversion escapes literal HTML and retains headings and lists',()=>{
  const html=plainNewsToHtml('## Hướng dẫn\n\n- Một\n- Hai\n\n<script>x</script>');
  assert.ok(html.includes('<h2>Hướng dẫn</h2>'));
  assert.ok(html.includes('<ul><li>Một</li><li>Hai</li></ul>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
test('published rich articles require real text, not just formatting or image tags',()=>{
  const data={title:'Bài viết thử nghiệm',slug:'bai-viet-thu-nghiem',categoryCode:'tuyen-sinh',summary:'Tóm tắt đủ dài để thử nghiệm xuất bản.',contentType:'article',status:'published',bodyFormat:'html'};
  assert.throws(()=>validateNews({...data,body:'<p><br></p><p><br></p><p><br></p>'}));
  assert.throws(()=>validateNews({...data,body:'<script>Long malicious script pretending to be article content</script>'}));
  assert.ok(validateNews({...data,body:'<p style="font-size:24px">Nội dung hướng dẫn nguyện vọng đầy đủ.</p>'}).body.includes('24px'));
});
