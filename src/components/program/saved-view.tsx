"use client";

import Link from "next/link";
import { useState } from "react";
import { LuArrowDown, LuArrowUp, LuBookmark, LuCloud, LuCloudOff, LuImage, LuListChecks, LuLock, LuPrinter, LuShare2, LuTrash2, LuTriangleAlert, LuWallet, LuX } from "react-icons/lu";
import { ADMISSION_METHODS, cutoffFor, fitForProfile, formatMethodScore, profileMethod } from "@/services/scoring.service";
import type { StrategyItem } from "@/services/wishlist-strategy";
import type { ProgramView } from "@/services/program.service";
import { formatTuition } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useLoginGate } from "@/components/auth/login-gate";
import { StrategyPanel } from "@/components/wishlist/strategy-panel";
import { WhatIfSimulator } from "@/components/wishlist/what-if";
import { ShareDialog } from "@/components/wishlist/share-dialog";
import { ShareCardDialog } from "@/components/share-card/share-card-dialog";
import { ParentComments } from "@/components/wishlist/parent-comments";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FitBadge } from "./fit-badge";
import { CompareButton } from "./program-actions";
import { SchoolCode } from "./program-card";
import { useProgramViews } from "./use-program-views";

export function SavedView() {
  const store = useTrovio();
  const toast = useToast();
  const { requireLogin } = useLoginGate();
  const [tab, setTab] = useState<"saved" | "wish">("saved");
  const [banner, setBanner] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const allIds = Array.from(new Set([...store.saved, ...store.wishlist.map((w) => w.id)]));
  const views = useProgramViews(allIds, store.hydrated);
  const byId = new Map((views ?? []).map((v) => [v.program.id, v]));
  const method = profileMethod(store.profile);
  const fitOf = (v: ProgramView) => (store.profile ? fitForProfile(store.profile, v.program).fit : null);
  /** Điểm chuẩn hiển thị theo phương thức của hồ sơ điểm (mặc định điểm thi THPT). */
  const cutoffText = (v: ProgramView) => {
    const c = cutoffFor(v.program, method);
    if (c) return `${formatMethodScore(c.score, method)}${method !== "thpt" ? ` ${ADMISSION_METHODS[method].short}` : ""}${c.estimated ? " (ước tính)" : ""}`;
    return method === "thpt" ? "Chưa có dữ liệu chính thức" : `Không xét ${ADMISSION_METHODS[method].short}`;
  };
  const toStrategy = (v: ProgramView): StrategyItem => ({ id: v.program.id, label: `${v.program.name} – ${v.school.shortName}`, program: v.program });

  const savedViews = store.saved.map((id) => byId.get(id)).filter((v): v is ProgramView => !!v);
  const wishViews = store.wishlist.map((w) => ({ w, v: byId.get(w.id) })).filter((x): x is { w: (typeof store.wishlist)[number]; v: ProgramView } => !!x.v);

  const plainText = `Nguyện vọng dự kiến của tôi (Trovio):\n${wishViews.map(({ v }, i) => `NV${i + 1}: ${v.program.name} – ${v.school.name}`).join("\n") || "Danh sách trống"}`;

  const exportPdf = () =>
    requireLogin({ title: "Đăng nhập để xuất PDF", reason: "Xuất danh sách nguyện vọng ra PDF là tính năng dành cho tài khoản." }, () => window.print());
  const shareList = () =>
    requireLogin({ title: "Đăng nhập để chia sẻ", reason: "Chia sẻ danh sách nguyện vọng với gia đình, thầy cô là tính năng dành cho tài khoản." }, () => setShareOpen(true));

  const loading = !store.hydrated || (allIds.length > 0 && views === null);

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Lựa chọn của tôi</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý các chương trình đã lưu và lập danh sách nguyện vọng dự kiến.</p>
          {store.hydrated && <SyncHint />}
        </div>
        <div className="flex flex-wrap gap-2" data-print-hide>
          <Link href="/chi-phi" className={buttonClass({ variant: "ghost", size: "sm" })}>
            <LuWallet className="size-4" aria-hidden /> Tính tổng chi phí
          </Link>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <LuPrinter className="size-4" aria-hidden /> Xuất PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={shareList}>
            <LuShare2 className="size-4" aria-hidden /> Chia sẻ với phụ huynh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCardOpen(true)} disabled={wishViews.length === 0} title={wishViews.length === 0 ? "Thêm nguyện vọng trước khi tạo thẻ" : undefined}>
            <LuImage className="size-4" aria-hidden /> Tạo thẻ chia sẻ
          </Button>
        </div>
      </div>

      <div role="tablist" className="mt-6 flex gap-6 border-b border-slate-200" data-print-hide>
        {(
          [
            ["saved", `Đã lưu (${store.hydrated ? store.saved.length : 0})`],
            ["wish", `Nguyện vọng dự kiến (${store.hydrated ? store.wishlist.length : 0})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("-mb-px border-b-2 py-3 text-sm", tab === k ? "border-primary-600 font-semibold text-primary-700" : "border-transparent text-slate-500 hover:text-slate-800")}
          >
            {label}
          </button>
        ))}
      </div>

      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} plainText={plainText} />}
      {cardOpen && (
        <ShareCardDialog
          initial="wishlist"
          onClose={() => setCardOpen(false)}
          data={{
            name: store.user?.name ? store.user.name.trim().split(/\s+/).pop() ?? null : null,
            riasec: store.quiz ? { code: [...store.quiz.result.code], percents: store.quiz.result.percents, topMajors: [] } : null,
            wishlist: {
              method: store.profile ? ADMISSION_METHODS[method].short : null,
              score: store.profile ? `${formatMethodScore(store.profile.admission.total, method)} điểm` : null,
              items: wishViews.map(({ v }, i) => {
                const fit = fitOf(v);
                return { nv: i + 1, program: v.program.name, school: v.school.name, fit: fit ? { label: fit.label, tone: fit.level } : null };
              }),
            },
          }}
        />
      )}

      {!store.profile && store.hydrated && allIds.length > 0 && (
        <p className="mt-4 text-sm text-slate-500" data-print-hide>
          <Link href="/diem-cua-toi" className="font-semibold text-primary-600 hover:underline">
            Nhập điểm của bạn
          </Link>{" "}
          để xem mức An toàn / Vừa sức / Thử sức cho từng lựa chọn.
        </p>
      )}

      <div className="mt-6">
        {!loading && store.profile && (tab === "saved" ? savedViews.length > 0 : !!store.user && wishViews.length > 0) && (
          <WhatIfSimulator items={(tab === "saved" ? savedViews : wishViews.map((x) => x.v)).map(toStrategy)} profile={store.profile} />
        )}
        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        ) : tab === "saved" ? (
          savedViews.length === 0 ? (
            <Card>
              <EmptyState
                icon={<LuBookmark />}
                title="Chưa có chương trình nào được lưu"
                description="Khi tìm thấy chương trình phù hợp, bấm nút ♡ để lưu vào đây và bắt đầu lập kế hoạch tuyển sinh."
              >
                <Link href="/chuong-trinh" className={buttonClass()}>
                  Tìm chương trình →
                </Link>
                <Link href="/trac-nghiem" className={buttonClass({ variant: "outline" })}>
                  Làm trắc nghiệm sở thích
                </Link>
              </EmptyState>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {savedViews.map((v) => {
                const inWish = store.inWishlist(v.program.id);
                return (
                  <Card key={v.program.id} className="flex flex-col p-5">
                    <div className="flex gap-3">
                      <SchoolCode code={v.school.code} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/chuong-trinh/${v.program.slug}`} className="font-bold text-slate-900 hover:text-primary-700">
                          {v.program.name}
                        </Link>
                        <p className="truncate text-[13px] text-primary-600">{v.school.name}</p>
                      </div>
                      <FitBadge fit={fitOf(v)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                      <span className="rounded-md bg-primary-50 px-2 py-1 font-semibold text-primary-700">
                        {cutoffText(v)}{cutoffFor(v.program, method) ? " điểm" : ""}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{formatTuition(v.program.tuitionMin, v.program.tuitionMax)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4" data-print-hide>
                      <Button
                        size="sm"
                        variant={inWish ? "secondary" : "primary"}
                        onClick={() => {
                          if (inWish) return setTab("wish");
                          requireLogin(
                            {
                              title: "Đăng nhập để lập nguyện vọng",
                              reason: "Nguyện vọng dự kiến được lưu theo tài khoản để bạn sắp xếp, ghi chú và xem lại trên mọi thiết bị.",
                              intent: { kind: "wishlist", id: v.program.id },
                            },
                            () => {
                              store.addWishlist(v.program.id);
                              toast("Đã thêm vào nguyện vọng dự kiến", "success");
                            },
                          );
                        }}
                      >
                        <LuListChecks className="size-4" aria-hidden /> {inWish ? "Xem trong nguyện vọng" : "Thêm nguyện vọng"}
                      </Button>
                      <CompareButton id={v.program.id} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          store.toggleSaved(v.program.id);
                          toast("Đã bỏ lưu", "info");
                        }}
                      >
                        <LuTrash2 className="size-4" aria-hidden /> Bỏ lưu
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <>
            {banner && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
                <LuTriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p className="flex-1">
                  Đây là danh sách <strong>kế hoạch cá nhân</strong>, không phải đăng ký tuyển sinh chính thức. Hãy đăng ký nguyện vọng trên Cổng tuyển sinh của Bộ GD&ĐT.
                </p>
                <button type="button" onClick={() => setBanner(false)} className="rounded p-1 hover:bg-accent-100" aria-label="Ẩn thông báo" data-print-hide>
                  <LuX className="size-4" />
                </button>
              </div>
            )}
            {!store.user ? (
              <Card>
                <EmptyState
                  icon={<LuLock />}
                  title="Đăng nhập để lập nguyện vọng dự kiến"
                  description="Sắp xếp thứ tự nguyện vọng, thêm ghi chú, xuất PDF và chia sẻ — lưu theo tài khoản nên dùng được trên mọi thiết bị. Chương trình bạn đã lưu trên máy này sẽ được giữ nguyên."
                >
                  <Button onClick={() => requireLogin({ title: "Đăng nhập để lập nguyện vọng", reason: "Đăng nhập bằng Google hoặc email chỉ mất vài giây." })}>
                    Đăng nhập / Đăng ký
                  </Button>
                </EmptyState>
              </Card>
            ) : wishViews.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<LuListChecks />}
                  title="Chưa có nguyện vọng dự kiến"
                  description="Thêm chương trình từ danh sách đã lưu hoặc từ trang chi tiết, sau đó sắp xếp thứ tự ưu tiên."
                >
                  <Button variant="outline" onClick={() => setTab("saved")}>
                    Chọn từ danh sách đã lưu
                  </Button>
                </EmptyState>
              </Card>
            ) : (
              <>
              <StrategyPanel items={wishViews.map(({ v }) => toStrategy(v))} profile={store.profile} onReorder={store.reorderWishlist} />
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Thứ tự</th>
                      <th scope="col" className="px-4 py-3">Chương trình</th>
                      <th scope="col" className="px-4 py-3 text-right">Điểm chuẩn{method !== "thpt" ? ` (${ADMISSION_METHODS[method].short})` : ""}</th>
                      <th scope="col" className="px-4 py-3">Học phí</th>
                      <th scope="col" className="px-4 py-3">Mức an toàn</th>
                      <th scope="col" className="px-4 py-3">Ghi chú</th>
                      <th scope="col" className="px-4 py-3 text-right" data-print-hide>
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wishViews.map(({ w, v }, i) => (
                      <tr key={w.id}>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-primary-600 px-2 py-1 text-xs font-bold text-white">NV{i + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/chuong-trinh/${v.program.slug}`} className="font-semibold text-slate-900 hover:text-primary-700">
                            {v.program.name}
                          </Link>
                          <span className="block text-xs text-slate-500">{v.school.shortName}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary-700">{cutoffFor(v.program, method) ? cutoffText(v) : <span className="text-xs font-normal text-slate-500">{cutoffText(v)}</span>}</td>
                        <td className="px-4 py-3 text-slate-700">{formatTuition(v.program.tuitionMin, v.program.tuitionMax)}</td>
                        <td className="px-4 py-3">
                          <FitBadge fit={fitOf(v)} />
                          {!fitOf(v) && <span className="text-xs text-slate-500">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <label className="sr-only" htmlFor={`note-${w.id}`}>
                            Ghi chú cho NV{i + 1}
                          </label>
                          <input
                            id={`note-${w.id}`}
                            value={w.note}
                            onChange={(e) => store.setWishlistNote(w.id, e.target.value)}
                            placeholder="Thêm ghi chú…"
                            className="h-9 w-full min-w-40 rounded-lg border border-transparent bg-slate-50 px-2.5 text-[13px] hover:border-slate-200 focus:border-primary-600 focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3" data-print-hide>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                disabled={i === 0}
                                onClick={() => store.moveWishlist(w.id, -1)}
                                className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                aria-label={`Đưa NV${i + 1} lên`}
                              >
                                <LuArrowUp className="size-4" />
                              </button>
                              <button
                                type="button"
                                disabled={i === wishViews.length - 1}
                                onClick={() => store.moveWishlist(w.id, 1)}
                                className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                aria-label={`Đưa NV${i + 1} xuống`}
                              >
                                <LuArrowDown className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmId(w.id)}
                                className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-700"
                                aria-label={`Xoá NV${i + 1}`}
                              >
                                <LuTrash2 className="size-4" />
                              </button>
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ConfirmDialog
                  open={!!confirmId}
                  title="Xác nhận xoá"
                  confirmLabel="Xoá"
                  onCancel={() => setConfirmId(null)}
                  onConfirm={() => {
                    const id = confirmId!;
                    const prevOrder = store.wishlist.map((x) => x.id);
                    const note = store.wishlist.find((x) => x.id === id)?.note ?? "";
                    store.removeWishlist(id);
                    setConfirmId(null);
                    toast("Đã xoá khỏi danh sách nguyện vọng", "info", {
                      action: {
                        label: "Hoàn tác",
                        onClick: () => {
                          store.addWishlist(id);
                          if (note) store.setWishlistNote(id, note);
                          store.reorderWishlist(prevOrder);
                        },
                      },
                    });
                  }}
                >
                  Bạn có chắc chắn muốn xoá chương trình này khỏi danh sách nguyện vọng đã lưu? Thứ tự các nguyện vọng còn lại sẽ dồn lên.
                </ConfirmDialog>
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm" data-print-hide>
                  <span className="font-semibold text-slate-700">Tổng: {wishViews.length} nguyện vọng</span>
                  <button type="button" onClick={() => setTab("saved")} className="font-semibold text-primary-600 hover:underline">
                    + Thêm từ danh sách đã lưu
                  </button>
                </div>
              </Card>
              </>
            )}
            {store.user && <ParentComments programName={(id) => byId.get(id)?.program.name ?? null} />}
          </>
        )}
      </div>
    </div>
  );
}

/** Trạng thái lưu trữ: chỉ trên trình duyệt (khách) hay đã đồng bộ tài khoản. */
function SyncHint() {
  const { user, sync } = useTrovio();
  const { requireLogin } = useLoginGate();
  if (!user) {
    return (
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-slate-500" data-print-hide>
        <LuCloudOff className="size-4" aria-hidden /> Đang lưu trên trình duyệt này.
        <button
          type="button"
          onClick={() => requireLogin({ title: "Đồng bộ danh sách", reason: "Đăng nhập để lưu danh sách vào tài khoản và dùng trên mọi thiết bị." })}
          className="font-semibold text-primary-600 hover:underline"
        >
          Đăng nhập để đồng bộ
        </button>
      </p>
    );
  }
  return (
    <p className={cn("mt-2 flex items-center gap-1.5 text-[13px]", sync === "error" ? "text-danger-700" : "text-slate-500")} data-print-hide>
      <LuCloud className="size-4" aria-hidden />
      {sync === "syncing" ? "Đang đồng bộ…" : sync === "error" ? "Chưa đồng bộ được với tài khoản — tải lại trang để thử lại." : "Đã đồng bộ với tài khoản"}
    </p>
  );
}
