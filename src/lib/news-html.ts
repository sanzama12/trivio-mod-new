import sanitizeHtml from 'sanitize-html';
import { httpsLink } from './news-content';

export const NEWS_FONTS=['Arial','Calibri','Times New Roman','Roboto','Tahoma','Verdana','Georgia'];
export function sanitizeNewsHtml(value:string):string {
  return sanitizeHtml(value,{
    allowedTags:['p','div','br','h1','h2','h3','blockquote','strong','b','em','i','u','s','strike','span','font','a','ul','ol','li','table','thead','tbody','tr','td','th','hr','img','sub','sup'],
    allowedAttributes:{'*':['style'],a:['href','target','rel'],font:['face','size','color'],img:['src','alt','width'],td:['colspan','rowspan'],th:['colspan','rowspan']},
    allowedSchemes:['https','http','mailto'],allowedSchemesByTag:{img:['https']},allowProtocolRelative:false,
    allowedStyles:{'*':{
      'font-family':[/^(?:Arial|Calibri|Times New Roman|Roboto|Tahoma|Verdana|Georgia)$/i,/^["'](?:Arial|Calibri|Times New Roman|Roboto|Tahoma|Verdana|Georgia)["']$/i],
      'font-size':[/^(?:10|11|12|14|16|18|20|24|28|32|36|48|64|72)px$/],
      color:[/^#[0-9a-f]{3,8}$/i,/^rgb\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3}\s*\)$/,/^(?:black|white|red|blue|green)$/],
      'background-color':[/^#[0-9a-f]{3,8}$/i,/^rgb\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3}\s*\)$/],
      'text-align':[/^(left|center|right|justify)$/],'font-weight':[/^(normal|bold|400|600|700)$/],
      'font-style':[/^(normal|italic)$/],'text-decoration':[/^(underline|line-through|underline line-through)$/],
      'line-height':[/^(1|1.25|1.5|1.75|2)$/],'margin-left':[/^(0|20|40|60|80)px$/],
      'border-collapse':[/^collapse$/],width:[/^(25|50|75|100)%$/],border:[/^1px solid #cbd5e1$/],padding:[/^8px$/],
    }},
    transformTags:{
      a:(_tag,attrs)=>({tagName:'a',attribs:{...attrs,target:'_blank',rel:'noopener noreferrer'}}),
      img:(_tag,attrs)=>({tagName:'img',attribs:{src:httpsLink(attrs.src)??'',alt:(attrs.alt??'').slice(0,300),...( /^(25|50|75|100)%$/.test(attrs.width??'')?{width:attrs.width}:{})}}),
      font:(_tag,attrs)=>({tagName:'font',attribs:{...(NEWS_FONTS.includes(attrs.face)?{face:attrs.face}:{}),...(/^[1-7]$/.test(attrs.size??'')?{size:attrs.size}:{}),...(/^#[0-9a-f]{6}$/i.test(attrs.color??'')?{color:attrs.color}:{}),...(attrs.style?{style:attrs.style}:{})}}),
    },
    exclusiveFilter:frame=>frame.tag==='img'&&!frame.attribs.src,
  });
}
export function newsHtmlText(value:string):string {
  return sanitizeHtml(value,{allowedTags:[],allowedAttributes:{}}).replace(/&nbsp;|&#160;/g,' ').replace(/[\u200b-\u200d\ufeff]/g,'').trim();
}
const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function plainNewsToHtml(body:string):string {
  return body.split(/\n\s*\n/).filter(Boolean).map(block=>{
    if(block.startsWith('## '))return `<h2>${escape(block.slice(3))}</h2>`;
    if(block.split('\n').every(line=>line.startsWith('- ')))return `<ul>${block.split('\n').map(line=>`<li>${escape(line.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${escape(block).replace(/\n/g,'<br>')}</p>`;
  }).join('');
}
