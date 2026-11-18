"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DonationPayment } from "@/domain/donation";

const DonationSuccess = dynamic(() => import("./donation-success").then((module) => module.DonationSuccess), { ssr: false });

export function DonationResultCelebration({ payment, confirmedAt }: {
  payment: Pick<DonationPayment, "txnRef" | "amount" | "method">;
  confirmedAt: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="mt-5 text-sm font-semibold text-teal-800 underline underline-offset-4">Xem xác nhận</button>
    {open && <DonationSuccess payment={payment} confirmedAt={confirmedAt} onClose={() => setOpen(false)} onAgain={() => router.push("/ung-ho")} />}
  </>;
}
