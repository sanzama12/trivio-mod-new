import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/misc";

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: { id: string; title: string; body: ReactNode }[] }) {
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: title }]} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Mục lục" className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:sticky lg:top-24">
          <p className="mb-3 text-sm font-bold">Mục lục</p>
          <ol className="space-y-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-slate-600 hover:text-primary-700">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:p-10">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Cập nhật lần cuối: {updated}</p>
          <div className="mt-8 space-y-8">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <h2 className="text-lg font-bold">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-slate-600">{s.body}</div>
              </section>
            ))}
          </div>
          <a href="#noi-dung" className="mt-10 inline-block text-sm font-semibold text-primary-600 hover:underline">
            ↑ Về đầu trang
          </a>
        </article>
      </div>
    </div>
  );
}
