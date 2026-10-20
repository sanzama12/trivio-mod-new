import {adminPage} from '@/lib/admin-page';
import {AdminHeader} from '@/components/admin/admin-header';
import {AdminBody} from '@/components/admin/ui';
import {MaterialEditor} from '@/components/admin/material-editor';
import {repositories} from '@database/repositories';
export const metadata={title:'Thêm tài liệu',robots:{index:false,follow:false}};
export default async function CreateMaterial(){await adminPage('/quan-tri/tai-lieu/tao-moi');return <><AdminHeader title="Thêm tài liệu" crumb="Tài liệu › Tạo mới"/><AdminBody><MaterialEditor initial={null} subjects={await repositories.materials.subjects()}/></AdminBody></>;}
