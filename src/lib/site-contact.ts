export const siteContact: { email: string; phone: string | null; demo: boolean } = {
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@trovio.vn",
  phone: null,
  demo: !process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim(),
};
