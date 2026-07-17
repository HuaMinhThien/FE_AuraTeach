import apiClient from "./apiClient";

const studentService = {
  // 1. GET: Lấy danh sách học viên kết hợp thông tin chi tiết
  getStudents: async () => {
    try {
      // Gọi đồng thời 2 endpoint từ Laravel (tùy chỉnh lại route cho khớp với BE của bạn)
      const [usersRes, studentsRes] = await Promise.all([
        apiClient.get("/users"),
        apiClient.get("/students")
      ]);

      // Xử lý bóc tách mảng an toàn (phòng hờ Laravel trả về bọc trong object { data: [...] } hoặc trả thẳng mảng)
      const users = Array.isArray(usersRes) ? usersRes : (usersRes.data || []);
      const students = Array.isArray(studentsRes) ? studentsRes : (studentsRes.data || []);

      // Lọc role student và gộp thông tin từ bảng students vào
      const studentList = users
        .filter(u => u.role === 'student')
        .map(user => {
          const detail = students.find(s => s.user_id === user.user_id) || {};
          return { ...user, ...detail };
        });

      return { success: true, data: studentList };
    } catch (error) {
      throw new Error(error.message || "Không thể tải danh sách học viên");
    }
  },

  // 2. PATCH/PUT: Khóa hoặc Mở khóa tài khoản học viên
  updateStatus: async (userId, status) => {
    try {
      // Đối với Laravel, thường chúng ta sẽ update trực tiếp qua ID chính của bảng users (ví dụ: /users/{userId})
      // apiClient của bạn đã có sẵn phương thức patch
      const response = await apiClient.patch(`/users/${userId}`, { status });

      return {
        success: true,
        message: response.message || `Đã cập nhật trạng thái học viên thành: ${status === 'active' ? 'Hoạt động' : 'Bị khóa'}`
      };
    } catch (error) {
      throw new Error(error.message || "Cập nhật trạng thái thất bại ở Backend");
    }
  }
};

export default studentService;