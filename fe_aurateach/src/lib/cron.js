// src/lib/cron.js
import cron from 'node-cron';
import { checkClasses } from '@/services/classSuggestionService';

// Chạy lúc 23:59 mỗi ngày
cron.schedule('59 23 * * *', async () => {
  console.log('🔄 [Cron] Đang kiểm tra các lớp học...');
  try {
    const results = await checkClasses();
    console.log('📊 [Cron] Kết quả:');
    console.log(`   ✅ Đã active: ${results.activated.length} lớp`);
    console.log(`   ❌ Đã hủy: ${results.cancelled.length} lớp`);
    if (results.errors.length > 0) {
      console.error(`   ⚠️ Lỗi: ${results.errors.length}`);
    }
  } catch (error) {
    console.error('❌ [Cron] Lỗi:', error);
  }
});

console.log('⏰ [Cron] Scheduled daily class check at 23:59');

// Cho phép chạy thủ công khi dev
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 [Cron] Development mode - Manual trigger available via /api/cron/check-classes');
}