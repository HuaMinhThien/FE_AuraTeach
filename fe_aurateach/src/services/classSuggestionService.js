// src/services/classSuggestionService.js
// Gọi trực tiếp Laravel backend qua apiClient

import apiClient from './apiClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const CATEGORY_KEYWORDS = {
  'cat-02': ['toán', 'toan'],
  'cat-03': ['ngữ văn', 'ngu van', 'văn', 'van'],
  'cat-04': ['lý', 'ly', 'vật lý', 'vat ly'],
  'cat-05': ['hóa', 'hoa', 'hóa học', 'hoa hoc'],
  'cat-06': ['sinh', 'sinh học', 'sinh hoc'],
  'cat-07': ['sử', 'su', 'lịch sử', 'lich su'],
  'cat-08': ['địa', 'dia', 'địa lý', 'dia ly'],
  'cat-09': ['anh', 'tiếng anh', 'tieng anh', 'ngoại ngữ', 'ngoai ngu'],
  'cat-10': ['tin học', 'tin hoc', 'lập trình', 'lap trinh', 'cntt'],
  'cat-11': ['năng khiếu', 'nang khieu', 'âm nhạc', 'am nhac', 'mỹ thuật', 'my thuat'],
};

function tutorMatchesSubject(tutor, categoryId) {
  if (!categoryId || categoryId === 'cap1_homework') return true;
  const tutorSubjects  = tutor.subjects || [];
  const tutorExpertise = (tutor.expertise || '').toLowerCase();
  if (tutorSubjects.includes(categoryId)) return true;
  const keywords = CATEGORY_KEYWORDS[categoryId] || [];
  return keywords.some(kw => tutorExpertise.includes(kw));
}

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * Lấy danh sách Tutor phù hợp cho một lớp học
 * Laravel: POST /api/admin/courses/eligible-tutors
 */
export async function getEligibleTutors(course) {
  try {
    const data = await apiClient.post('/admin/courses/eligible-tutors', { course });
    return data.data ?? data ?? [];
  } catch (error) {
    console.error('❌ getEligibleTutors error:', error);
    return [];
  }
}

/**
 * Gửi đề xuất lớp học cho danh sách tutor
 * Laravel: POST /api/admin/courses/send-suggestions
 */
export async function sendSuggestions(courseId, tutorIds) {
  try {
    const data = await apiClient.post('/admin/courses/send-suggestions', { courseId, tutorIds });
    return data ?? { success: true, sentTo: tutorIds.length };
  } catch (error) {
    console.error('❌ sendSuggestions error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tutor nhận lớp học
 * Laravel: POST /api/admin/courses/accept-class
 */
export async function acceptClass(courseId, tutorId) {
  try {
    const data = await apiClient.post('/admin/courses/accept-class', { courseId, tutorId });
    return data ?? { success: true };
  } catch (error) {
    console.error('❌ acceptClass error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tutor hủy lớp sau khi nhận
 * Laravel: POST /api/admin/courses/tutor-cancel
 */
export async function tutorCancelClass(courseId, tutorId) {
  try {
    const data = await apiClient.post('/admin/courses/tutor-cancel', { courseId, tutorId });
    return data ?? { success: true };
  } catch (error) {
    console.error('❌ tutorCancelClass error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách đề xuất lớp học cho một tutor
 * Laravel: GET /api/tutors/{tutorId}/suggestions
 */
export async function getTutorSuggestions(tutorId) {
  try {
    const data = await apiClient.get(`/tutors/${tutorId}/suggestions`);
    return data.data ?? data ?? [];
  } catch (error) {
    console.error('❌ getTutorSuggestions error:', error);
    return [];
  }
}

/**
 * Kiểm tra và xử lý các lớp học (cron job)
 * Laravel: POST /api/admin/courses/check-classes  (hoặc GET nếu BE dùng GET)
 */
export async function checkClasses() {
  try {
    const data = await apiClient.post('/admin/courses/check-classes', {});
    return data ?? { activated: [], cancelled: [], errors: [] };
  } catch (error) {
    console.error('❌ checkClasses error:', error);
    return { activated: [], cancelled: [], errors: [error.message] };
  }
}

/**
 * Hoàn tiền cho học sinh của một lớp học
 * Laravel: POST /api/admin/courses/{courseId}/refund
 */
export async function refundStudents(courseId) {
  try {
    const data = await apiClient.post(`/admin/courses/${courseId}/refund`, {});
    return data ?? { success: true };
  } catch (error) {
    console.error('❌ refundStudents error:', error);
    return { success: false, error: error.message };
  }
}
