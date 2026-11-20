import "server-only";

export interface BankTransfer {
  accountNumber: string;
  amount: number;
  description: string;
  transactionId: string;
}

export function parseBankHistory(value: unknown): BankTransfer[] | null {
  if (!value || typeof value !== "object") return null;
  const data = value as { status?: unknown; TranList?: unknown };
  if (data.status !== "success" || !Array.isArray(data.TranList)) return null;
  return data.TranList.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const credit = String(row.creditAmount ?? "");
    const debit = String(row.debitAmount ?? "");
    const accountNumber = String(row.accountNo ?? "").replace(/\s/g, "");
    const transactionId = String(row.tranId || row.refNo || "");
    if (!/^\d+$/.test(credit) || !/^\d+$/.test(debit) || Number(debit) !== 0 ||
        !Number.isSafeInteger(Number(credit)) || Number(credit) <= 0 ||
        row.currency !== "VND" || !/^\d{6,19}$/.test(accountNumber) ||
        !/^[A-Za-z0-9_-]{4,80}$/.test(transactionId)) return [];
    return [{
      accountNumber,
      amount: Number(credit),
      description: `${String(row.description ?? "")} ${String(row.addDescription ?? "")}`.toUpperCase(),
      transactionId: `DVC_${transactionId}`,
    }];
  });
}

export function matchingBankReference(transfer: BankTransfer, expected: { accountNumber: string; amount: number; txnRef: string }): string | null {
  const account = expected.accountNumber.replace(/\s/g, "");
  const ref = expected.txnRef.toUpperCase();
  if (!/^(?:TQ[A-F0-9]{12}(?:[A-F0-9]{4})?|TROVIOQR[A-F0-9]{32})$/.test(ref) ||
      transfer.accountNumber !== account || transfer.amount !== expected.amount) return null;
  if (new RegExp(`(^|[^A-Z0-9])${ref}(?=$|[^A-Z0-9])`).test(transfer.description)) return ref;
  // Older QR notes included a name and some banks cut the final reference character.
  if (/^TQ[A-F0-9]{16}$/.test(ref)) {
    const prefix = ref.slice(0, -1);
    if (new RegExp(`(^|[^A-Z0-9])${prefix}(?=$|[^A-Z0-9])`).test(transfer.description)) return prefix;
  }
  return null;
}

export const matchesBankTransfer = (transfer: BankTransfer, expected: { accountNumber: string; amount: number; txnRef: string }): boolean =>
  matchingBankReference(transfer, expected) !== null;

let cachedRequest: Promise<BankTransfer[] | null> | null = null;
let cachedToken: string | null = null;
let requestedAt = 0;
let requestInFlight = false;

function bankHistoryToken(): string | null {
  const token = process.env.BANK_HISTORY_API_TOKEN?.trim() ?? "";
  return /^[A-Za-z0-9_-]{16,128}$/.test(token) ? token : null;
}

export function isBankHistoryConfigured(): boolean {
  return bankHistoryToken() !== null;
}

export async function fetchBankHistory(fetchImpl: typeof fetch = fetch): Promise<BankTransfer[] | null> {
  const token = bankHistoryToken();
  if (!token) return null;
  if (fetchImpl === fetch && cachedToken !== token) {
    cachedToken = token;
    cachedRequest = null;
    requestedAt = 0;
    requestInFlight = false;
  }
  if (fetchImpl === fetch && cachedRequest && (requestInFlight || Date.now() - requestedAt < 10_000)) return cachedRequest;
  const request = (async () => {
    try {
      const response = await fetchImpl(`https://dichvucheap.com/historyapi/${encodeURIComponent(token)}`, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        console.warn("[bank-history] HTTP error:", response.status);
        return null;
      }
      const text = await response.text();
      if (!text || !text.trim()) {
        console.warn("[bank-history] dichvucheap trả về nội dung rỗng (cần kiểm tra MB Bank session trên dichvucheap.com).");
        return null;
      }
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        console.warn("[bank-history] dichvucheap trả về dữ liệu không phải JSON.");
        return null;
      }
      // dichvucheap rate-limit (10s cooldown): {"status": 99, "msg": "Vui lòng chờ 10 giây để tiếp tục!"}
      if (raw && typeof raw === "object" && (raw as Record<string, unknown>).status === 99) {
        console.warn("[bank-history] dichvucheap status 99:", JSON.stringify(raw));
        return null;
      }
      return parseBankHistory(raw);
    } catch (error) {
      console.warn("[bank-history] Request failed:", error instanceof Error ? error.name : "UnknownError");
      return null;
    }
  })();
  if (fetchImpl === fetch) {
    cachedRequest = request;
    requestedAt = Date.now();
    requestInFlight = true;
    void request.finally(() => {
      if (cachedRequest === request) requestInFlight = false;
    });
  }
  return request;
}
