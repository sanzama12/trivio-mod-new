import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newsSlug,newsVideo,httpsLink } from '../../src/lib/news-content';
import { validateNews,newsFilter } from '../../src/services/news-validation';
import { newsService } from '../../src/services/news.service';
import { NewsError } from '../../src/domain/news';

const draft={title:'Hướng dẫn nguyện vọng',slug:'huong-dan-nguyen-vong',summary:'',body:'',categoryCode:'huong-dan-nguyen-vong',contentType:'article',status:'draft'};
test('news: draft can be incomplete but published articles need summary and body',()=>{
  assert.equal(validateNews(draft).status,'draft');
  assert.throws(()=>validateNews({...draft,status:'published'}),NewsError);
  assert.equal(validateNews({...draft,status:'published',summary:'Hướng dẫn các bước chuẩn bị nguyện vọng.',body:'Đọc kỹ thông tin chương trình trước khi lập danh sách.'}).status,'published');
  assert.throws(()=>validateNews({...draft,season:2026.5}),NewsError);
  assert.throws(()=>validateNews({...draft,status:'scheduled'}),NewsError);
});
test('news: video embeds use exact provider hosts and canonical IDs only',()=>{
  assert.equal(newsVideo('https://youtu.be/dQw4w9WgXcQ?t=3')?.src,'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(newsVideo('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.kind,'embed');
  assert.equal(newsVideo('https://vimeo.com/12345')?.src,'https://player.vimeo.com/video/12345');
  assert.equal(newsVideo('https://media.example.com/guide.mp4?token=abc')?.kind,'file');
  for(const url of ['javascript:alert(1)','http://youtu.be/dQw4w9WgXcQ','https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ','https://www.youtube.com/embed/%22onload=evil','https://localhost/a.mp4','https://127.0.0.1/a.mp4']) assert.equal(newsVideo(url),null);
  assert.equal(httpsLink('https://user:password@example.com/image.png'),null);
});
test('news: published video requires a playable link and article cannot retain video data',()=>{
  const raw={...draft,contentType:'video',status:'published',summary:'Video hướng dẫn các bước lập nguyện vọng.'};
  assert.throws(()=>validateNews(raw),NewsError);
  assert.equal(validateNews({...raw,videoUrl:'https://youtu.be/dQw4w9WgXcQ'}).videoUrl,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(validateNews({...draft,videoUrl:'https://youtu.be/dQw4w9WgXcQ'}).videoUrl,null);
});
test('news: slug and paging normalize Vietnamese input and bound query size',()=>{
  assert.equal(newsSlug('Hướng dẫn ĐĂNG KÝ nguyện vọng!'),'huong-dan-dang-ky-nguyen-vong');
  assert.equal(newsFilter({page:'NaN',status:'secret',type:'hack'}).page,1);
  assert.equal(newsFilter({page:'999999999',q:'a'.repeat(300)}).page,10000);
  assert.equal(newsFilter({q:'a'.repeat(300)}).q.length,100);
});
test('news: non-admin cannot write even when bypassing the route',async()=>{
  await assert.rejects(()=>newsService.save({id:'someone',admin:false},{data:draft}),(e:unknown)=>e instanceof NewsError&&e.status===403);
});
