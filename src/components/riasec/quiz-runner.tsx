import Link from "next/link";
export function QuizRunner() {
  return <p className="text-sm text-slate-500">Bài trắc nghiệm đã ngừng. Xem <Link className="font-semibold text-primary-600 hover:underline" href="/chuong-trinh">chương trình đào tạo</Link> hoặc <Link className="font-semibold text-primary-600 hover:underline" href="/nganh">ngành học</Link>.</p>;
}
