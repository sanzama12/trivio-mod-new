/** Kiểm tra phụ thuộc hạ tầng; Controller không truy vấn SQL trực tiếp. */
import { pingDb, getPoolMetrics } from "@database/client";

export const systemService = {
  async checkDatabase() {
    return pingDb();
  },
  getPoolMetrics() {
    return getPoolMetrics();
  },
};
