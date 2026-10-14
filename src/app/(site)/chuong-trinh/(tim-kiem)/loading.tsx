import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-live="polite">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-5 h-8 w-96 max-w-full" />
      <p className="mt-3 text-sm font-medium text-primary-600">Đang tải kết quả…</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <Skeleton className="h-[520px] rounded-2xl" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex gap-4">
                <Skeleton className="size-12 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
                <Skeleton className="hidden h-24 w-40 sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
