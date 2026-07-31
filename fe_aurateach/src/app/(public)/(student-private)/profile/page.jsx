'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import Avatar from "@/components/common/Avatar.jsx";
import { authService } from "@/services/authService";
import { studentService } from "@/services/studentService";
import "./profile.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    grade: "",
    school_name: "",
    avatar: "",
    birth_date: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Hàm lấy thông tin học sinh từ API dựa vào user_id
  const fetchStudentInfo = async (userId) => {
    try {
      console.log("👉 Đang gọi API lấy student với user_id:", userId);
      const response = await studentService.getStudents({ user_id: userId });
      console.log("📦 Dữ liệu học sinh trả về từ API:", response);
      
      const students = Array.isArray(response) ? response : (response?.data || []);
      
      if (students.length > 0) {
        setStudentInfo(students[0]);
        setFormData(prev => ({
          ...prev,
          grade: students[0].grade || "",
          school_name: students[0].school_name || "",
        }));
      } else {
        console.warn("⚠️ Không tìm thấy bản ghi student nào khớp với user_id này!");
      }
    } catch (error) {
      console.error("❌ Lỗi tải thông tin student:", error);
    }
  };

  // Khởi tạo dữ liệu trang một lần duy nhất
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        console.log("👤 Thông tin user hiện tại từ authService:", currentUser);

        // Kiểm tra cookie role dự phòng
        const getCookie = (name) => {
          if (typeof window === "undefined") return null;
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        const role = getCookie("role");

        if (!currentUser || (role && role !== "student" && !currentUser.user)) {
          // Cho phép qua nếu có cấu trúc user hợp lệ
        }

        // 1. Trích xuất chuẩn xác object user bên trong (hỗ trợ cả dạng bọc { user: {...} } lẫn object phẳng)
        const userData = currentUser?.user || currentUser;

        if (!userData) {
          console.warn("⚠️ Không có dữ liệu user, chuyển hướng về login");
          router.push("/login");
          return;
        }

        setUser(userData);

        // 2. Đổ dữ liệu ban đầu vào form
        setFormData({
          full_name: userData.full_name || "",
          phone: userData.phone || "",
          avatar: userData.avatar || "",
          birth_date: userData.birth_date || "",
          grade: "",
          school_name: "",
        });

        // 3. Trích xuất user_id an toàn
        const currentUserId = userData.user_id || userData.id;
        console.log("🔑 ID được trích xuất để gọi API student:", currentUserId);

        if (currentUserId && currentUserId !== 'undefined') {
          await fetchStudentInfo(currentUserId);
        } else {
          console.error("🚨 Không tìm thấy ID hợp lệ trong object user!");
        }

      } catch (error) {
        console.error("❌ Lỗi tải thông tin profile:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  // Xử lý thay đổi input trên form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError("");
    setSuccess("");
    setFormData({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
      birth_date: user?.birth_date || "",
      grade: studentInfo?.grade || "",
      school_name: studentInfo?.school_name || "",
    });
  };

  const handleSave = async () => {
    try {
      setError("");
      setSuccess("");
      setIsSaving(true);

      if (!formData.full_name.trim()) {
        setError("Họ và tên không được để trống");
        setIsSaving(false);
        return;
      }

      if (!formData.phone.trim()) {
        setError("Số điện thoại không được để trống");
        setIsSaving(false);
        return;
      }

      const userIdToUpdate = user.user_id || user.id;

      // Gom tất cả dữ liệu (User + Student) vào chung một object gửi lên Backend
      const updateData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar.trim() || "/img/default-avatar.svg",
        birth_date: formData.birth_date || "",
        grade: formData.grade ? formData.grade.trim() : "",          // 👈 Gửi kèm grade
        school_name: formData.school_name ? formData.school_name.trim() : "", // 👈 Gửi kèm school_name
      };

      const result = await studentService.updateProfile(userIdToUpdate, updateData);

      if (result.success || result) {
        setSuccess("Cập nhật thông tin thành công!");
        const updatedUser = result.user || result.data || result;
        
        setUser(updatedUser);
        
        if (userIdToUpdate) {
          await fetchStudentInfo(userIdToUpdate); // Tải lại thông tin student mới nhất
        }

        setTimeout(() => {
          setIsEditing(false);
          setSuccess("");
        }, 1500);
      }
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      setError(error.message || "Có lỗi xảy ra khi cập nhật thông tin");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="profile-loading" style={{ marginTop: "100px", textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin...</p>
        </div>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header />
      <div className="profile-page" style={{ marginTop: "80px" }}>
        <div className="profile-container">
          <StudentSidebar />

          <div className="profile-content">
            <div className="profile-header">
              <div className="profile-header-left">
                <h2>Thông tin cá nhân</h2>
                <p>Quản lý thông tin tài khoản của bạn</p>
              </div>
              {!isEditing && (
                <button className="btn-edit" onClick={handleEdit}>
                  Chỉnh sửa
                </button>
              )}
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar-wrapper">
                  <Avatar 
                    src={formData.avatar || user.avatar}
                    alt={formData.full_name || user.full_name}
                    size={100}
                    fallbackText={formData.full_name?.charAt(0) || user.full_name?.charAt(0) || "U"}
                  />
                </div>
                <div className="profile-name-section">
                  {isEditing ? (
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="input-name-edit"
                      placeholder="Họ và tên"
                    />
                  ) : (
                    <h3>{user.full_name}</h3>
                  )}
                  <span className="profile-role-badge">🎓 Học viên</span>
                </div>
              </div>

              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <label>Email</label>
                  <p className="info-disabled">{user.email}</p>
                </div>

                <div className="profile-info-item">
                  <label>Số điện thoại</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="input-edit"
                      placeholder="Nhập số điện thoại"
                    />
                  ) : (
                    <p>{user.phone || "Chưa cập nhật"}</p>
                  )}
                </div>

                <div className="profile-info-item">
                  <label>Lớp</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="input-edit"
                      placeholder="VD: Lớp 10, Lớp 12"
                    />
                  ) : (
                    <p>{studentInfo?.grade || "Chưa cập nhật"}</p>
                  )}
                </div>

                <div className="profile-info-item">
                  <label>Trường</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="school_name"
                      value={formData.school_name}
                      onChange={handleInputChange}
                      className="input-edit"
                      placeholder="Tên trường"
                    />
                  ) : (
                    <p>{studentInfo?.school_name || "Chưa cập nhật"}</p>
                  )}
                </div>

                <div className="profile-info-item">
                  <label>Ngày sinh</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className="input-edit"
                    />
                  ) : (
                    <p>{user.birth_date ? new Date(user.birth_date).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</p>
                  )}
                </div>

                <div className="profile-info-item">
                  <label>Ngày tạo</label>
                  <p>{user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</p>
                </div>

                <div className="profile-info-item">
                  <label>Trạng thái</label>
                  <p>
                    <span className={user.status === "active" ? "status-active" : "status-inactive"}>
                      {user.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </p>
                </div>
              </div>

              {isEditing && (
                <div className="profile-actions">
                  <button 
                    className="btn-save" 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button 
                    className="btn-cancel" 
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}