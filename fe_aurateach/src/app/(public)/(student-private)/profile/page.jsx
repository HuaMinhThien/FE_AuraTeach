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
    grade: "",
    school_name: "",
    avatar: "",
    birth_date: "",
  });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Lấy thông tin student từ studentService
  const fetchStudentInfo = async (userId) => {
    try {
      const response = await studentService.getStudents({ user_id: userId });
      const students = Array.isArray(response) ? response : (response?.data || []);
      
      if (students.length > 0) {
        setStudentInfo(students[0]);
        setFormData(prev => ({
          ...prev,
          grade: students[0].grade || "",
          school_name: students[0].school_name || "",
        }));
      }
    } catch (error) {
      console.error("Lỗi tải thông tin student:", error);
    }
  };

  // Lấy thông tin user mới nhất từ authService / API
  const fetchUserData = async (userId) => {
    try {
      const currentUser = await authService.getCurrentUser();
      const userData = currentUser?.user || currentUser;
      
      if (userData) {
        setUser(userData);
        setFormData(prev => ({
          ...prev,
          full_name: userData.full_name || userData.name || "",
          phone: userData.phone || "",
          avatar: userData.avatar || "",
          birth_date: userData.birth_date ? userData.birth_date.split('T')[0] : "",
        }));
        return userData;
      }
      return null;
    } catch (error) {
      console.error("Lỗi fetch user data:", error);
      return null;
    }
  };

  // Khởi tạo trang
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        const userData = currentUser?.user || currentUser;

        if (!userData) {
          router.push("/login");
          return;
        }

        setUser(userData);
        setFormData({
          full_name: userData.full_name || userData.name || "",
          phone: userData.phone || "",
          avatar: userData.avatar || "",
          birth_date: userData.birth_date ? userData.birth_date.split('T')[0] : "",
          grade: "",
          school_name: "",
        });

        const userId = userData.user_id || userData.id;
        if (userId && userId !== 'undefined') {
          await fetchStudentInfo(userId);
          await fetchUserData(userId);
        }

      } catch (error) {
        console.error("Lỗi tải thông tin profile:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  // Xử lý upload avatar qua Base64
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
      birth_date: user?.birth_date ? user?.birth_date.split('T')[0] : "",
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

      if (formData.phone && !/^\d{10}$/.test(formData.phone.trim())) {
        setError("Số điện thoại phải có 10 chữ số");
        setIsSaving(false);
        return;
      }

      const userIdToUpdate = user.user_id || user.id;

      const updateData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar || user?.avatar || "/img/default-avatar.svg",
        birth_date: formData.birth_date || "",
        grade: formData.grade.trim(),
        school_name: formData.school_name.trim(),
      };

      // Đồng bộ gọi qua authService hoặc studentService tùy theo cấu trúc Backend của bạn
      const result = await authService.updateProfile(userIdToUpdate, updateData);

      if (result) {
        setSuccess("Cập nhật thông tin thành công!");
        const updatedUser = result.user || result.data || result;
        setUser(updatedUser);
        
        if (userIdToUpdate) {
          await fetchStudentInfo(userIdToUpdate);
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
                  <span className="profile-role-badge">🎓 Học viên</span>
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