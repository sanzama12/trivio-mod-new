import { query } from "@database/client";

export interface DonationRecord {
  id: string;
  donorName: string;
  donorEmail: string | null;
  amount: number;
  message: string | null;
  orderInfo: string;
  vnpTxnRef: string;
  vnpTransactionNo: string | null;
  vnpBankCode: string | null;
  vnpCardType: string | null;
  vnpPayDate: string | null;
  vnpResponseCode: string | null;
  status: "pending" | "success" | "failed" | "cancelled";
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
}

export interface DonationStats {
  totalRevenue: number;
  thisMonthRevenue: number;
  todayRevenue: number;
  totalCount: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  avgAmount: number;
  maxAmount: number;
}

const cols = `
  id,
  donor_name AS "donorName",
  donor_email AS "donorEmail",
  amount::float8 AS amount,
  message,
  order_info AS "orderInfo",
  vnp_txn_ref AS "vnpTxnRef",
  vnp_transaction_no AS "vnpTransactionNo",
  vnp_bank_code AS "vnpBankCode",
  vnp_card_type AS "vnpCardType",
  vnp_pay_date::text AS "vnpPayDate",
  vnp_response_code AS "vnpResponseCode",
  status,
  ip_address AS "ipAddress",
  created_at::text AS "createdAt",
  updated_at::text AS "updatedAt",
  paid_at::text AS "paidAt"
`;

export const postgresDonationsRepository = {
  async create(data: {
    donorName: string;
    donorEmail?: string | null;
    amount: number;
    message?: string | null;
    orderInfo: string;
    vnpTxnRef: string;
    ipAddress?: string | null;
  }): Promise<DonationRecord> {
    const rows = await query<DonationRecord>(
      `INSERT INTO trovio.donations (
        donor_name, donor_email, amount, message, order_info, vnp_txn_ref, ip_address, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING ${cols}`,
      [
        data.donorName,
        data.donorEmail ?? null,
        data.amount,
        data.message ?? null,
        data.orderInfo,
        data.vnpTxnRef,
        data.ipAddress ?? null,
      ]
    );
    return rows[0];
  },

  async getByTxnRef(vnpTxnRef: string): Promise<DonationRecord | null> {
    const rows = await query<DonationRecord>(
      `SELECT ${cols} FROM trovio.donations WHERE vnp_txn_ref = $1 LIMIT 1`,
      [vnpTxnRef]
    );
    return rows[0] ?? null;
  },

  async getById(id: string): Promise<DonationRecord | null> {
    const rows = await query<DonationRecord>(
      `SELECT ${cols} FROM trovio.donations WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async updatePaymentResult(
    vnpTxnRef: string,
    result: {
      status: "success" | "failed" | "cancelled";
      transactionNo?: string | null;
      bankCode?: string | null;
      cardType?: string | null;
      payDate?: string | null;
      responseCode?: string | null;
    }
  ): Promise<DonationRecord | null> {
    const rows = await query<DonationRecord>(
      `UPDATE trovio.donations
       SET status = $1,
           vnp_transaction_no = COALESCE($2, vnp_transaction_no),
           vnp_bank_code = COALESCE($3, vnp_bank_code),
           vnp_card_type = COALESCE($4, vnp_card_type),
           -- vnp_PayDate là giờ Việt Nam (GMT+7), không phụ thuộc múi giờ máy chủ.
           vnp_pay_date = CASE WHEN $5::text IS NOT NULL
             THEN (TO_TIMESTAMP($5::text, 'YYYYMMDDHH24MISS')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
             ELSE vnp_pay_date END,
           vnp_response_code = COALESCE($6, vnp_response_code),
           paid_at = CASE WHEN $1 = 'success' THEN COALESCE(paid_at, now()) ELSE paid_at END
       WHERE vnp_txn_ref = $7 AND status = 'pending'
       RETURNING ${cols}`,
      [
        result.status,
        result.transactionNo ?? null,
        result.bankCode ?? null,
        result.cardType ?? null,
        result.payDate ?? null,
        result.responseCode ?? null,
        vnpTxnRef,
      ]
    );
    return rows[0] ?? null;
  },

  async getStats(): Promise<DonationStats> {
    const [row] = await query<{
      totalRevenue: number;
      thisMonthRevenue: number;
      todayRevenue: number;
      totalCount: number;
      successCount: number;
      pendingCount: number;
      failedCount: number;
      avgAmount: number;
      maxAmount: number;
    }>(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0)::float8 AS "totalRevenue",
        COALESCE(SUM(CASE WHEN status = 'success' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now()) THEN amount ELSE 0 END), 0)::float8 AS "thisMonthRevenue",
        COALESCE(SUM(CASE WHEN status = 'success' AND DATE_TRUNC('day', created_at) = DATE_TRUNC('day', now()) THEN amount ELSE 0 END), 0)::float8 AS "todayRevenue",
        COUNT(*)::int AS "totalCount",
        COUNT(CASE WHEN status = 'success' THEN 1 END)::int AS "successCount",
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS "pendingCount",
        COUNT(CASE WHEN status IN ('failed', 'cancelled') THEN 1 END)::int AS "failedCount",
        COALESCE(AVG(CASE WHEN status = 'success' THEN amount END), 0)::float8 AS "avgAmount",
        COALESCE(MAX(CASE WHEN status = 'success' THEN amount END), 0)::float8 AS "maxAmount"
      FROM trovio.donations
    `);

    return (
      row ?? {
        totalRevenue: 0,
        thisMonthRevenue: 0,
        todayRevenue: 0,
        totalCount: 0,
        successCount: 0,
        pendingCount: 0,
        failedCount: 0,
        avgAmount: 0,
        maxAmount: 0,
      }
    );
  },

  async list(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: DonationRecord[]; total: number }> {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["1=1"];
    const queryParams: unknown[] = [];

    if (params?.status && params.status !== "all") {
      queryParams.push(params.status);
      conditions.push(`status = $${queryParams.length}`);
    }

    if (params?.search && params.search.trim()) {
      queryParams.push(`%${params.search.trim().toLowerCase()}%`);
      const idx = queryParams.length;
      conditions.push(`(
        LOWER(donor_name) LIKE $${idx} OR
        LOWER(COALESCE(donor_email, '')) LIKE $${idx} OR
        LOWER(vnp_txn_ref) LIKE $${idx} OR
        LOWER(COALESCE(vnp_transaction_no, '')) LIKE $${idx}
      )`);
    }

    const whereClause = conditions.join(" AND ");

    const [countRow] = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM trovio.donations WHERE ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const items = await query<DonationRecord>(
      `SELECT ${cols}
       FROM trovio.donations
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      items,
      total: countRow?.total ?? 0,
    };
  },

  async getRecentSuccess(
    limit = 8
  ): Promise<Array<Pick<DonationRecord, "id" | "donorName" | "amount" | "message" | "paidAt">>> {
    return query<Pick<DonationRecord, "id" | "donorName" | "amount" | "message" | "paidAt">>(
      `SELECT id, donor_name AS "donorName", amount::float8 AS amount, message, paid_at::text AS "paidAt"
       FROM trovio.donations
       WHERE status = 'success'
       ORDER BY paid_at DESC NULLS LAST, created_at DESC
       LIMIT $1`,
      [Math.min(limit, 50)]
    );
  },
};

