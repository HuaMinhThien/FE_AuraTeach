import apiClient from "./apiClient";

const adminService = {
  // Hàm duyệt hồ sơ gia sư/giảng viên
  approveTutor: async (userId, tutorId) => {
    try {
      // Dùng trực tiếp biến `tutorId` được truyền vào hàm
      const response = await apiClient.post("/admin/approve", { tutor_id: tutorId });

      return {
        success: true,
        message: response.message || "Duyệt hồ sơ giảng viên thành công",
        data: response.data || { tutorId, status: "approved" }
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || "Lỗi khi gửi yêu cầu duyệt hồ sơ");
    }
  },

  deleteTutorProfile: async (userId, tutorId) => {
    try {
      // Gọi DELETE request lên endpoint Laravel tương ứng (ví dụ truyền data hoặc param tuỳ backend cấu hình)
      const response = await apiClient.delete(`/admin/${tutorId}`, {
        data: { userId } // Nếu cần truyền kèm userId lên body của DELETE request
      });

      return {
        success: true,
        message: response.message || "Đã xóa hồ sơ giảng viên và tài khoản liên quan",
        data: response.data || { tutorId, userId }
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || "Lỗi khi xóa hồ sơ giảng viên");
    }
  },

  getPendingTutors: async () => {
    try {
      const [tutorsRes, usersRes] = await Promise.all([
        apiClient.get("/tutors"),
        apiClient.get("/users"),
      ]);

      const tutors = Array.isArray(tutorsRes) ? tutorsRes : (tutorsRes.data || []);
      const users = Array.isArray(usersRes) ? usersRes : (usersRes.data || []);

      const pendingTutors = tutors
        // Sửa từ verification_status thành status cho khớp với database
        .filter(t => t.status === "pending" || t.verification_status === "pending") 
        .map(tutor => {
          const user = users.find(u => u.user_id === tutor.user_id) || {};
          return {
            ...user,
            ...tutor,
            tutor_id: tutor.tutor_id,
            user_id: tutor.user_id,
          };
        });

      return {
        success: true,
        data: pendingTutors,
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || "Không thể tải danh sách gia sư chờ duyệt");
    }
  },

  rejectTutor: async (userId, tutorId, reason) => {
    try {
      if (!reason || !reason.trim()) {
        throw new Error("Vui lòng nhập lý do từ chối");
      }

      // Gọi API POST hoặc PATCH tùy theo cấu hình route trong Laravel của bạn
      const response = await apiClient.post("/admin/reject", {
        userId,
        tutorId,
        reason: reason.trim()
      });

      return {
        success: true,
        message: response.message || "Đã từ chối hồ sơ giảng viên",
        data: response.data || { tutorId, status: "rejected", reason: reason.trim() }
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || "Lỗi khi từ chối hồ sơ");
    }
  }
};

export default adminService;