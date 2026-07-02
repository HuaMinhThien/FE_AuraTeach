"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import Avatar from "@/components/common/Avatar.jsx";
import authService from "@/services/authService";
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

  // Lấy thông tin student
  const fetchStudentInfo = async (userId) => {
    try {
      const studentRes = await fetch(`http://localhost:8000/api/students?user_id=${userId}`);
      const students = await studentRes.json();
      
      console.log("Dữ liệu API trả về:", students); // THÊM DÒNG NÀY ĐỂ CHECK F12

      // Kiểm tra xem có tìm thấy student nào khớp với userId không
      const myStudent = Array.isArray(students) 
        ? students.find(s => String(s.user_id) === String(userId)) 
        : (students.user_id === userId ? students : null);

      if (myStudent) {
        setStudentInfo(myStudent);
        setFormData(prev => ({
          ...prev,
          grade: myStudent.grade || "",
          school_name: myStudent.school_name || "",
        }));
      } else {
        console.warn("Không tìm thấy thông tin student cho user này");
      }
    } catch (error) {
      console.error("Lỗi tải thông tin student:", error);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        
        // Kiểm tra cookie dự phòng
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

        setUser(currentUser);
        setFormData({
          full_name: currentUser.full_name || "",
          phone: currentUser.phone || "",
          avatar: currentUser.avatar || "",
          birth_date: currentUser.birth_date || "",
          grade: "",
          school_name: "",
        });

        // Lấy thông tin student
        await fetchStudentInfo(currentUser.user_id);

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
    // Xóa thông báo lỗi khi user bắt đầu nhập
    if (error) setError("");
    if (success) setSuccess("");
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
    // Reset form về dữ liệu cũ
    setFormData({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
      birth_date: user?.birth_date || "",
      grade: studentInfo?.grade || "",
      school_name: studentInfo?.school_name || "",
    });
  };

  // Lưu thay đổi
  const handleSave = async () => {
      try {
          setError("");
          setSuccess("");
          setIsSaving(true);

          console.log("Dữ liệu gửi lên:", { formData, studentId: studentInfo?.student_id });

          // 1. Validate
          if (!formData.full_name.trim()) throw new Error("Họ và tên không được để trống");
          if (!formData.phone.trim()) throw new Error("Số điện thoại không được để trống");

          // 2. Cập nhật User
          const userUpdateData = {
              full_name: formData.full_name.trim(),
              phone: formData.phone.trim(),
              avatar: formData.avatar.trim() || "/img/default-avatar.svg",
              birth_date: formData.birth_date || "",
          };
          const uid = user?.user_id || user?.id; // Kiểm tra xem ID nằm ở user_id hay id
          if (!uid) {
            console.error("User object hiện tại:", user);
            throw new Error("Không xác định được ID người dùng (user_id hoặc id bị trống)");
          }
          const userResult = await authService.updateProfile(uid, userUpdateData);
          console.log("Dữ liệu user hiện tại:", user);
          // 3. Cập nhật Student
          const studentUpdateData = {
              grade: formData.grade.trim(),
              school_name: formData.school_name.trim(),
          };

          const studentRes = await fetch(`http://localhost:8000/api/students/${studentInfo.student_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(studentUpdateData)
          });

          const studentData = await studentRes.json();
          console.log("Kết quả update Student:", studentData);

          if (userResult.success && studentRes.ok) {
              setSuccess("✅ Cập nhật thành công!");
              setUser(userResult.user);
              await fetchStudentInfo(user.user_id);
              setTimeout(() => { setIsEditing(false); setSuccess(""); }, 1500);
          } else {
              throw new Error(studentData.message || "Lỗi khi lưu thông tin học viên");
          }
      } catch (error) {
          console.error("Lỗi chi tiết:", error);
          setError(error.message);
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
          
          {/* Student Sidebar */}
          <StudentSidebar />

          {/* Profile Content */}
          <div className="profile-content">
            <div className="profile-header">
              <div className="profile-header-left">
                <h2>Thông tin cá nhân</h2>
                <p>Quản lý thông tin tài khoản của bạn</p>
              </div>
              {!isEditing && (
                <button className="btn-edit" onClick={handleEdit}>
                  ✏️ Chỉnh sửa
                </button>
              )}
            </div>

            {/* Thông báo */}
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
                      {user.status === "active" ? "✅ Hoạt động" : "⛔ Đã khóa"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action buttons khi đang chỉnh sửa */}
              {isEditing && (
                <div className="profile-actions">
                  <button 
                    className="btn-save" 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "🔄 Đang lưu..." : "💾 Lưu thay đổi"}
                  </button>
                  <button 
                    className="btn-cancel" 
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    ❌ Hủy
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