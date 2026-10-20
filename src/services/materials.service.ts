import {repositories} from '@database/repositories';
import {MaterialError} from '@/domain/materials';
import {validateMaterial,validatePdf} from './material-validation';
export const materialsService={
  async save(actor:{id:string;admin:boolean},raw:Record<string,unknown>,upload?:{bytes:Uint8Array;name:string}){
    if(!actor.admin)throw new MaterialError('Bạn không có quyền quản lý tài liệu.',403);
    if(!raw.data||typeof raw.data!=='object'||Array.isArray(raw.data))throw new MaterialError('Dữ liệu không hợp lệ.');
    const input=validateMaterial(raw.data as Record<string,unknown>);
    if(!(await repositories.materials.subjects()).some(s=>s.id===input.subjectId))throw new MaterialError('Môn học không tồn tại.');
    if(raw.id!==undefined&&(typeof raw.id!=='string'||!/^material-[a-f0-9-]{36}$/.test(raw.id)))throw new MaterialError('ID tài liệu không hợp lệ.');
    if(raw.id&&(!Number.isInteger(raw.version)||Number(raw.version)<1))throw new MaterialError('Thiếu phiên bản tài liệu.',409);
    const file=upload?validatePdf(upload.bytes,upload.name):undefined;
    try{return await repositories.materials.save(input,actor.id,raw.id as string|undefined,raw.version as number|undefined,file);}
    catch(e){if((e as {code?:string}).code==='23505')throw new MaterialError('Đường dẫn tài liệu đã được dùng.',409);throw e;}
  },
};
