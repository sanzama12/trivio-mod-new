import Link from "next/link";
import { LuUnlink } from "react-icons/lu";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";

export default function ShareNotFound() {
  return <div className="container-page py-16"><title>Link không còn hiệu lực · Trovio</title><Card><EmptyState icon={<LuUnlink />} headingAs="h1" title="Link không còn hiệu lực" description="Link chia sẻ đã hết hạn, đã bị thu hồi hoặc không đúng. Hãy nhờ người gửi tạo link mới."><Link href="/" className={buttonClass()}>Về trang chủ Trovio</Link></EmptyState></Card></div>;
}
