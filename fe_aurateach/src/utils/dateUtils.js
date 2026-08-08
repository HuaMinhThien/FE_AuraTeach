// src/utils/dateUtils.js

/**
 * Tính số ngày chênh lệch giữa 2 ngày
 */
export function daysDiff(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * Tính số ngày từ hiện tại đến một ngày trong tương lai
 */
export function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * Kiểm tra xem ngày đã qua chưa
 */
export function isDatePassed(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  return target < now;
}

/**
 * Lấy ngày hiện tại (không giờ phút)
 */
export function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Kiểm tra xem ngày có cách hiện tại ít nhất X ngày không
 */
export function isAtLeastDaysBefore(dateStr, days) {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = daysDiff(now, target);
  return diff >= days;
}

/**
 * Định dạng ngày hiển thị
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'Chưa cập nhật';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Định dạng ngày giờ hiển thị
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return 'Chưa cập nhật';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Parse time string "HH:MM" thành số phút từ 00:00
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Kiểm tra 2 khoảng thời gian có overlap không
 */
export function isTimeOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return Math.max(s1, s2) < Math.min(e1, e2);
}

/**
 * Kiểm tra 2 mảng ngày trong tuần có trùng nhau không
 */
export function hasCommonDay(days1, days2) {
  if (!days1 || !days2) return false;
  return days1.some(day => days2.includes(day));
}

/**
 * Tạo mã ID ngẫu nhiên
 */
export function generateId(prefix = '') {
  const random = Math.random().toString(36).substr(2, 9);
  const timestamp = Date.now();
  return `${prefix}${timestamp}_${random}`;
}