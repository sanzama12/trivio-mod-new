import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container-page py-10" role="status" aria-busy="true" aria-live="polite">
      <p className="mb-6 text-sm text-slate-600">Đang tải nội dung…</p>
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="mt-4 h-5 w-96 max-w-full" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((id) => <Skeleton key={id} className="h-60 rounded-2xl" />)}
      </div>
    </div>
  );
}
