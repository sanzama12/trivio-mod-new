import {notFound} from 'next/navigation';
import {adminPage} from '@/lib/admin-page';
import {AdminHeader} from '@/components/admin/admin-header';
import {AdminBody} from '@/components/admin/ui';
import {MaterialEditor} from '@/components/admin/material-editor';
import {repositories} from '@database/repositories';
export const metadata={title:'Chỉnh sửa tài liệu',robots:{index:false,follow:false}};
export default async function EditMaterial({params}:{params:Promise<{id:string}>}){const {id}=await params;await adminPage(`/quan-tri/tai-lieu/${id}`);const [item,subjects]=await Promise.all([repositories.materials.byId(id),repositories.materials.subjects()]);if(!item)notFound();return <><AdminHeader title="Chỉnh sửa tài liệu" crumb="Tài liệu › Chỉnh sửa"/><AdminBody><MaterialEditor key={item.id} initial={item} subjects={subjects}/></AdminBody></>;}
