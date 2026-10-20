/** Kiểm tra phụ thuộc hạ tầng; Controller không truy vấn SQL trực tiếp. */
import { query } from '@database/client';

export const systemService = {
  async checkDatabase() {
    await query('SELECT 1 AS ready');
  },
};
