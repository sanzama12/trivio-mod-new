import { normalizeVi } from './text';

export function newsSlug(title:string):string {
  return normalizeVi(title).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,180).replace(/-$/,'');
}
export function httpsLink(value:unknown):string|null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url=new URL(value.trim());
    if(url.protocol!=='https:' || url.username || url.password || !url.hostname.includes('.') || url.hostname.endsWith('.local') || /^[\d.[\]:]+$/.test(url.hostname)) return null;
    return url.href.length<=2000 ? url.href : null;
  } catch { return null; }
}
export function newsVideo(value:unknown):{kind:'embed'|'file';src:string;url:string}|null {
  const safe=httpsLink(value);
  if(!safe) return null;
  const url=new URL(safe);
  const host=url.hostname.toLowerCase();
  if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)) {
    const id=host==='youtu.be' ? url.pathname.slice(1) : url.pathname==='/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1];
    if(!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return {kind:'embed',src:`https://www.youtube-nocookie.com/embed/${id}`,url:`https://www.youtube.com/watch?v=${id}`};
  }
  if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)) {
    const id=url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
    if(!id) return null;
    return {kind:'embed',src:`https://player.vimeo.com/video/${id}`,url:`https://vimeo.com/${id}`};
  }
  if(/\.(mp4|webm)$/i.test(url.pathname)) return {kind:'file',src:safe,url:safe};
  return null;
}
