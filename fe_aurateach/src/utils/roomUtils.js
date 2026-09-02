// src/utils/roomUtils.js
// Tiện ích hỗ trợ Google Meet link — không còn phòng học nội bộ (đã xóa)

/**
 * Kiểm tra định dạng Google Meet link hợp lệ
 * @param {string} url
 * @returns {boolean}
 */
export function isValidGoogleMeetLink(url) {
  if (!url || typeof url !== "string") return false;
  const regex = /^(https?:\/\/)?meet\.google\.com\/[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}(\?.*)?$/i;
  return regex.test(url.trim());
}

/**
 * Lấy Google Meet link từ object course / class_request
 * Ưu tiên: meet_link → permanent_room_url → google_meet_link → meeting_url → null
 * @param {Object} course
 * @returns {string|null}
 */
export function getMeetLink(course) {
  if (!course) return null;
  const raw =
    course.meet_link ||
    course.permanent_room_url ||
    course.google_meet_link ||
    course.meeting_url ||
    course.link ||
    null;

  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed !== "" ? trimmed : null;
}

/**
 * Mở Google Meet link trong tab mới
 * @param {Object|string} courseOrUrl - Object course hoặc trực tiếp URL
 */
export function openMeetLink(courseOrUrl) {
  const url =
    typeof courseOrUrl === "string"
      ? courseOrUrl
      : getMeetLink(courseOrUrl);

  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    alert("Lớp học này chưa có link Google Meet!");
  }
}
