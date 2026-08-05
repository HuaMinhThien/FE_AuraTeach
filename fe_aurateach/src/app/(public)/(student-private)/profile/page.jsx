'use client';

import { useState, useEffect, useRef } from "react";
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    avatar: "",
    birth_date: "",
    grade: "",
    school_name: "",
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
      return students[0] || null;
    } catch (error) {
      console.error("❌ Lỗi tải thông tin student:", error);
      return null;
    }
  };

  // Khởi tạo dữ liệu trang một lần duy nhất
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        console.log("👤 Thông tin user hiện tại từ authService:", currentUser);

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

        // Trích xuất chuẩn xác object user bên trong
        const userData = currentUser?.user || currentUser;

        if (!userData) {
          console.warn("⚠️ Không có dữ liệu user, chuyển hướng về login");
          router.push("/login");
          return;
        }

        setUser(userData);

        // Đổ dữ liệu ban đầu vào form
        setFormData(prev => ({
          ...prev,
          full_name: userData.full_name || userData.name || "",
          phone: userData.phone || "",
          avatar: userData.avatar || "",
          birth_date: userData.birth_date || "",
        }));

        // Trích xuất user_id an toàn
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

  // Xử lý upload avatar qua FileReader (chuyển đổi sang Base64)
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Vui lòng chọn file ảnh (JPG, PNG, GIF)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Kích thước ảnh không được vượt quá 2MB");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData(prev => ({
          ...prev,
          avatar: base64String,
        }));
        setIsUploading(false);
        setSuccess("Đã tải ảnh lên thành công! Nhấn 'Lưu thay đổi' để cập nhật.");
      };
      reader.onerror = () => {
        setError("Lỗi khi đọc file ảnh");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Lỗi upload avatar:", error);
      setError("Lỗi khi tải ảnh lên");
      setIsUploading(false);
    }
  };

  // Bật chế độ chỉnh sửa
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
      full_name: user?.full_name || user?.name || "",
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

      if (formData.phone && !/^\d{10}$/.test(formData.phone.trim())) {
        setError("Số điện thoại phải có đúng 10 chữ số");
        setIsSaving(false);
        return;
      }

      const userIdToUpdate = user.user_id || user.id;

      // Gom toàn bộ thông tin User & Student vào chung một payload cập nhật
      const updateData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar || user?.avatar || "/img/default-avatar.svg",
        birth_date: formData.birth_date || "",
        grade: formData.grade ? formData.grade.trim() : "",
        school_name: formData.school_name ? formData.school_name.trim() : "",
      };

      const result = await studentService.updateProfile(userIdToUpdate, updateData);

      if (result.success || result) {
        setSuccess("Cập nhật thông tin thành công!");
        const updatedUser = result.user || result.data || result;
        
        setUser(updatedUser);
        
        if (userIdToUpdate) {
          await fetchStudentInfo(userIdToUpdate); // Tải lại thông tin student mới nhất
        }

        // Cập nhật lại cookie user_info nếu có
        const userInfo = {
          id: userIdToUpdate,
          user_id: userIdToUpdate,
          full_name: updatedUser.full_name || formData.full_name,
          name: updatedUser.full_name || formData.full_name,
          email: user.email,
          role: user.role || "student",
          avatar: updateData.avatar,
          phone: updateData.phone,
          birth_date: updateData.birth_date,
        };
        document.cookie = `user_info=${encodeURIComponent(
          JSON.stringify(userInfo)
        )}; path=/; max-age=${30 * 24 * 60 * 60}`;

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
      <div className="profile-page">
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
                  {isEditing ? (
                    <div className="avatar-upload-wrapper">
                      <Avatar 
                        src={formData.avatar || user.avatar}
                        alt={formData.full_name || user.full_name}
                        size={100}
                        fallbackText={formData.full_name?.charAt(0) || user.full_name?.charAt(0) || "U"}
                      />
                      <button 
                        className="avatar-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="Đổi ảnh đại diện"
                      >
                        📷
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        style={{ display: "none" }}
                      />
                    </div>
                  ) : (
                    <Avatar 
                      src={user.avatar}
                      alt={user.full_name || user.name}
                      size={100}
                      fallbackText={user.full_name?.charAt(0) || user.name?.charAt(0) || "U"}
                    />
                  )}
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
                    <h3>{user.full_name || user.name}</h3>
                  )}
                  <span className="profile-role-badge">Học viên</span>
                  {isEditing && (
                    <p className="avatar-hint">Click vào icon camera để đổi ảnh đại diện</p>
                  )}
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
                      placeholder="Nhập số điện thoại (10 số)"
                    />
                  ) : (
                    <p>{user.phone || "Chưa cập nhật"}</p>
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
                    disabled={isSaving || isUploading}
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