export type MaterialKind='pdf'|'video'|'image';
export type MaterialStatus='draft'|'published'|'archived';
export const MATERIAL_KINDS:Record<MaterialKind,string>={pdf:'PDF',video:'Video',image:'Hình ảnh'};
export interface MaterialInput {title:string;slug:string;description:string;subjectId:string;kind:MaterialKind;mediaUrl:string|null;status:MaterialStatus}
export interface Material extends MaterialInput {id:string;subjectName:string;version:number;publishedAt:string|null;updatedAt:string;fileName:string|null;fileSize:number|null}
export interface MaterialSubject {id:string;name:string;count:number}
export interface MaterialFilter {subject:string;kind:string;status:string;q:string;page:number}
export interface MaterialList {items:Material[];total:number;page:number;pageSize:number}
export class MaterialError extends Error {constructor(message:string,readonly status=400){super(message);}}
