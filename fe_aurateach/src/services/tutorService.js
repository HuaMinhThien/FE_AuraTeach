import apiClient from "./apiClient";

const tutorService = {
  getProfileByUserId: async (currentUserId) => {
    const [users, tutors] = await Promise.all([
      apiClient.get("/users"),
      apiClient.get("/tutors"),
    ]);

    const userObj = Array.isArray(users) ? users.find((u) => u.user_id === currentUserId || u.id === currentUserId) : null;
    const tutorObj = Array.isArray(tutors) ? tutors.find((t) => t.user_id === currentUserId) : null;

    if (!userObj || !tutorObj) {
      throw new Error("Không tìm thấy dữ liệu gia sư.");
    }

    return { ...userObj, ...tutorObj };
  },

  getTutorDetails: async (userId) => {
    return await apiClient.get(`/tutors?user_id=${userId}`);
  },

  updateTutorProfile: async (userId, tutorData) => {
    return await apiClient.patch(`/tutors/${userId}`, tutorData);
  },

  getTutorsWithDetails: async () => {
    const [usersRes, tutorsRes] = await Promise.all([
      apiClient.get("/users"),
      apiClient.get("/tutors"),
    ]);

    const users = Array.isArray(usersRes) ? usersRes : (usersRes.data || []);
    const tutors = Array.isArray(tutorsRes) ? tutorsRes : (tutorsRes.data || []);

    const tutorList = users
      .filter((u) => u.role === 'tutor')
      .map((user) => {
        const detail = tutors.find((t) => t.user_id === user.user_id) || {};
        return { ...user, ...detail };
      });

    return { success: true, data: tutorList };
  },

  updateStatusOrVerification: async ({ userId, tutorId, status, verificationStatus }) => {
    const requests = [];

    // Trường hợp 1: Cập nhật Khóa/Mở khóa (bảng users)
    if (userId && status !== undefined) {
      requests.push(apiClient.patch(`/users/${userId}`, { status }));
    }

    // Trường hợp 2: Duyệt hồ sơ Gia sư (bảng tutors)
    if (tutorId && verificationStatus !== undefined) {
      requests.push(apiClient.patch(`/tutors/${tutorId}`, { verification_status: verificationStatus }));
    }

    if (requests.length > 0) {
      await Promise.all(requests);
    }

    return { success: true, message: "Cập nhật dữ liệu gia sư lên Backend thành công!" };
  },

};



export default tutorService;