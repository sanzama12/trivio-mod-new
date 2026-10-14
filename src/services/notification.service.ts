/**
 * SERVICE LAYER — thông báo trong web (chuông trên thanh menu) + email kèm theo.
 * Email đi qua `mailer.ts` (bản demo in ra terminal; production nối dịch vụ email).
 */
import { randomUUID } from "node:crypto";
import type { AppNotification, NotificationKind } from "../domain/types";
import { repositories } from "../repositories";
import { sendMail } from "./mailer";

export interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  /** Gửi thêm email tới địa chỉ của tài khoản (chỉ tài khoản đã xác thực). */
  email?: boolean;
}

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const notificationService = {
  async notify(input: NotifyInput): Promise<AppNotification | null> {
    const user = await repositories.users.findById(input.userId);
    if (!user) return null;
    const n: AppNotification = {
      id: randomUUID(),
      userId: user.id,
      kind: input.kind,
      title: input.title.slice(0, 140),
      body: input.body.slice(0, 600),
      href: input.href && input.href.startsWith("/") && !input.href.startsWith("//") ? input.href : null,
      createdAt: new Date().toISOString(),
      read: false,
    };
    await repositories.notifications.add(n);
    if (input.email && user.verified) {
      await sendMail({
        to: user.email,
        subject: `Trovio – ${n.title}`,
        text: `${n.body}${n.href ? `\n\nXem chi tiết: ${appUrl()}${n.href}` : ""}\n\n— Trovio`,
      }).catch(() => undefined);
    }
    return n;
  },

  async list(userId: string, limit = 20) {
    const items = await repositories.notifications.listByUser(userId, limit);
    return { items, unread: items.filter((n) => !n.read).length };
  },

  markRead(userId: string, ids?: string[]) {
    return repositories.notifications.markRead(userId, ids);
  },
};
