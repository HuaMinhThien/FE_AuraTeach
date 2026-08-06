// src/utils/roomUtils.js

/**
 * Tạo mã phòng học ngẫu nhiên
 * @returns {string} - Mã phòng 6 ký tự
 */
export function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Tạo link phòng học
 * @param {string} roomId - Mã phòng
 * @returns {string} - URL phòng học
 */
export function getRoomUrl(roomId) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/room/${roomId}`;
}

/**
 * Kiểm tra định dạng roomId hợp lệ
 * @param {string} roomId
 * @returns {boolean}
 */
export function isValidRoomId(roomId) {
  return /^[A-Z0-9]{6}$/.test(roomId);
}

/**
 * Tạo peerId cho tutor (dùng roomId)
 * @param {string} roomId
 * @returns {string}
 */
export function getTutorPeerId(roomId) {
  return `tutor_${roomId}`;
}

/**
 * Tạo peerId cho student
 * @param {string} roomId
 * @param {string} studentId
 * @returns {string}
 */
export function getStudentPeerId(roomId, studentId) {
  return `student_${roomId}_${studentId}`;
}

/**
 * Chuẩn hóa chuỗi thành roomId 6 ký tự (A-Z, 0-9)
 * @param {string} raw
 * @returns {string}
 */
export function normalizeRoomId(raw) {
  const cleaned = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (cleaned.length >= 6) {
    return cleaned.slice(0, 6);
  }

  return cleaned.padEnd(6, "0");
}

/**
 * Tạo roomId ổn định từ thông tin lớp học
 * @param {Object|string} course
 * @returns {string}
 */
export function deriveRoomIdFromCourse(course) {
  if (typeof course === "string") {
    return normalizeRoomId(course || generateRoomId());
  }

  const source =
    course?.room_id ||
    course?.course_id ||
    course?.class_id ||
    course?.id ||
    course?.title ||
    "ROOM";

  const roomId = normalizeRoomId(source);
  return roomId || generateRoomId();
}

/**
 * Trả về path phòng học nội bộ theo lớp
 * @param {Object|string} course
 * @returns {string}
 */
export function getClassroomBasePath(course) {
  const roomId = deriveRoomIdFromCourse(course);
  return `/room/${roomId}`;
}

/**
 * Tạo link vào phòng theo vai trò
 * @param {Object|string} course
 * @param {"student"|"tutor"} role
 * @returns {string}
 */
export function getClassroomRoomPath(course, role = "student") {
  const roomId = deriveRoomIdFromCourse(course);
  const isTutor = role === "tutor";

  const params = new URLSearchParams({ role: isTutor ? "tutor" : "student" });
  if (!isTutor) {
    params.set("tutor", getTutorPeerId(roomId));
  }

  return `/room/${roomId}?${params.toString()}`;
}