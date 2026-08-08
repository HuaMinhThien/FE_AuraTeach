"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import Avatar from "@/components/common/Avatar.jsx";
import authService from "@/services/authService";
import "./profile.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
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
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_BASE = "http://localhost:3007";

  // Lấy thông tin user từ API để có dữ liệu mới nhất
  const fetchUserData = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/users?user_id=${userId}`);
      const users = await res.json();
      if (users.length > 0) {
        const userData = users[0];
        setUser(userData);
        setFormData({
          full_name: userData.full_name || userData.name || "",
          phone: userData.phone || "",
          avatar: userData.avatar || "",
          birth_date: userData.birth_date || "",
        });
        return userData;
      }
      return null;
    } catch (error) {
      console.error("Lỗi fetch user data:", error);
      return null;
    }
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        
        const getCookie = (name) => {
          if (typeof window === "undefined") return null;
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        const role = getCookie("role");

        if (!currentUser || role !== "student") {
          router.push("/login");
          return;
        }

        // Lấy dữ liệu mới nhất từ API
        const userId = currentUser.user_id || currentUser.id;
        const freshUser = await fetchUserData(userId);
        
        if (!freshUser) {
          // Fallback: dùng dữ liệu từ cookie
          setUser(currentUser);
          setFormData({
            full_name: currentUser.full_name || currentUser.name || "",
            phone: currentUser.phone || "",
            avatar: currentUser.avatar || "",
            birth_date: currentUser.birth_date || "",
          });
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

  // Xử lý upload avatar
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

  // Hủy chỉnh sửa
  const handleCancel = () => {
    setIsEditing(false);
    setError("");
    setSuccess("");
    setFormData({
      full_name: user?.full_name || user?.name || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
      birth_date: user?.birth_date || "",
    });
  };

  // Lưu thay đổi
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

      const updateData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar || user?.avatar || "/img/default-avatar.svg",
        birth_date: formData.birth_date || "",
      };

      const result = await authService.updateProfile(user.user_id || user.id, updateData);

      if (result.success) {
        setSuccess("Cập nhật thông tin thành công!");
        
        // Cập nhật lại dữ liệu từ API
        const updatedUser = await fetchUserData(user.user_id || user.id);
        
        if (updatedUser) {
          // Cập nhật cookie
          const userInfo = {
            id: updatedUser.user_id || updatedUser.id,
            user_id: updatedUser.user_id || updatedUser.id,
            full_name: updatedUser.full_name,
            name: updatedUser.full_name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar,
            phone: updatedUser.phone,
            birth_date: updatedUser.birth_date,
          };
          document.cookie = `user_info=${encodeURIComponent(
            JSON.stringify(userInfo)
          )}; path=/; max-age=${30 * 24 * 60 * 60}`;
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

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}

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