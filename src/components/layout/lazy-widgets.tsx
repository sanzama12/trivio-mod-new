"use client";

/**
 * Tải SAU các tiện ích nặng không cần cho lần hiển thị đầu (trợ lý chat, hướng dẫn 6 bước, thanh cookie, cảnh báo phiên):
 * tách khỏi gói JS chung → trang hiện nhanh hơn, chuyển tab nhẹ hơn.
 */
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ChatWidget = dynamic(() => import("@/components/chat/chat-widget").then((m) => m.ChatWidget), { ssr: false });
const GuidedTour = dynamic(() => import("@/components/tour/guided-tour").then((m) => m.GuidedTour), { ssr: false });
const CookieBanner = dynamic(() => import("./cookie-banner").then((m) => m.CookieBanner), { ssr: false });
const SessionWatch = dynamic(() => import("./session-watch").then((m) => m.SessionWatch), { ssr: false });

export function LazyWidgets() {
  return (
    <>
      <ChatWidget />
      <CookieBanner />
      <SessionWatch />
      <Suspense fallback={null}>
        <GuidedTour />
      </Suspense>
    </>
  );
}
