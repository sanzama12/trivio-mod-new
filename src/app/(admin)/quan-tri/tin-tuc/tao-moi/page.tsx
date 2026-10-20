import { adminPage } from '@/lib/admin-page';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminBody } from '@/components/admin/ui';
import { NewsEditor } from '@/components/admin/news-editor';
import { repositories } from '@database/repositories';
export const metadata={title:'Tạo tin tức / video',robots:{index:false,follow:false}};
export default async function CreateNews() {
  await adminPage('/quan-tri/tin-tuc/tao-moi');
  return <><AdminHeader title="Tạo bài viết / video" crumb="Tin tức › Tạo mới"/><AdminBody><NewsEditor initial={null} categories={await repositories.news.categories()}/></AdminBody></>;
}
