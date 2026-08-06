// src/services/video/VideoProvider.js

/**
 * VideoProvider - Abstract class định nghĩa interface chung cho các video service
 * Tất cả các provider (PeerJS, Daily, Jitsi, Twilio) đều phải implement các phương thức này
 */
export class VideoProvider {
  constructor() {
    if (this.constructor === VideoProvider) {
      throw new Error('VideoProvider is an abstract class');
    }
  }

  // ========== PHƯƠNG THỨC BẮT BUỘC ==========

  /**
   * Khởi tạo peer connection
   * @param {Object} options - { peerId, roomId, userName, userRole }
   */
  async initialize(options) {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Tạo phòng học mới (cho Tutor)
   * @param {Object} options - { roomId, userName }
   * @returns {Promise<Object>} - { roomId, peerId }
   */
  async createRoom(options) {
    throw new Error('Method createRoom() must be implemented');
  }

  /**
   * Tham gia phòng học (cho Student)
   * @param {Object} options - { roomId, userName, tutorPeerId }
   * @returns {Promise<Object>} - { roomId, peerId }
   */
  async joinRoom(options) {
    throw new Error('Method joinRoom() must be implemented');
  }

  /**
   * Rời khỏi phòng học
   */
  async leaveRoom() {
    throw new Error('Method leaveRoom() must be implemented');
  }

  /**
   * Bật/Tắt microphone
   */
  toggleMic() {
    throw new Error('Method toggleMic() must be implemented');
  }

  /**
   * Bật/Tắt camera
   */
  toggleCamera() {
    throw new Error('Method toggleCamera() must be implemented');
  }

  /**
   * Chia sẻ màn hình
   */
  async shareScreen() {
    throw new Error('Method shareScreen() must be implemented');
  }

  /**
   * Dừng chia sẻ màn hình
   */
  async stopScreenShare() {
    throw new Error('Method stopScreenShare() must be implemented');
  }

  /**
   * Gửi tin nhắn chat
   * @param {string} message - Nội dung tin nhắn
   * @param {Object} sender - { id, name, role }
   */
  sendMessage(message, sender) {
    throw new Error('Method sendMessage() must be implemented');
  }

  /**
   * Đăng ký callback khi nhận tin nhắn
   * @param {Function} callback
   */
  onMessage(callback) {
    throw new Error('Method onMessage() must be implemented');
  }

  /**
   * Đăng ký callback khi có người tham gia
   * @param {Function} callback
   */
  onParticipantJoined(callback) {
    throw new Error('Method onParticipantJoined() must be implemented');
  }

  /**
   * Đăng ký callback khi có người rời đi
   * @param {Function} callback
   */
  onParticipantLeft(callback) {
    throw new Error('Method onParticipantLeft() must be implemented');
  }

  /**
   * Hủy kết nối và dọn dẹp
   */
  destroy() {
    throw new Error('Method destroy() must be implemented');
  }

  // ========== GETTERS ==========

  /**
   * Lấy danh sách participants
   * @returns {Array}
   */
  getParticipants() {
    throw new Error('Method getParticipants() must be implemented');
  }

  /**
   * Kiểm tra đã kết nối chưa
   * @returns {boolean}
   */
  isConnected() {
    throw new Error('Method isConnected() must be implemented');
  }

  /**
   * Lấy peerId của mình
   * @returns {string}
   */
  getMyPeerId() {
    throw new Error('Method getMyPeerId() must be implemented');
  }

  /**
   * Lấy trạng thái mic
   * @returns {boolean}
   */
  isMicOn() {
    throw new Error('Method isMicOn() must be implemented');
  }

  /**
   * Lấy trạng thái camera
   * @returns {boolean}
   */
  isCameraOn() {
    throw new Error('Method isCameraOn() must be implemented');
  }
}