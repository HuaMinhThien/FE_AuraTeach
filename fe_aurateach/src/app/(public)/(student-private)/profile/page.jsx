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

  const API_BASE = "http://localhost:3007";

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

        // Lấy thông tin student
        const studentRes = await fetch(`${API_BASE}/students?user_id=${currentUser.user_id}`);
        const students = await studentRes.json();
        if (students.length > 0) {
          setStudentInfo(students[0]);
        }

      } catch (error) {
        console.error("Lỗi tải thông tin profile:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

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
              <h2>Thông tin cá nhân</h2>
              <p>Quản lý thông tin tài khoản của bạn</p>
            </div>

            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar-wrapper">
                  <Avatar 
                    src={user.avatar}
                    alt={user.full_name}
                    size={100}
                    fallbackText={user.full_name?.charAt(0) || "U"}
                  />
                </div>
                <div className="profile-name-section">
                  <h3>{user.full_name}</h3>
                  <span className="profile-role-badge">🎓 Học viên</span>
                </div>
              </div>

              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
                <div className="profile-info-item">
                  <label>Số điện thoại</label>
                  <p>{user.phone || "Chưa cập nhật"}</p>
                </div>
                <div className="profile-info-item">
                  <label>Lớp</label>
                  <p>{studentInfo?.grade || "Chưa cập nhật"}</p>
                </div>
                <div className="profile-info-item">
                  <label>Trường</label>
                  <p>{studentInfo?.school_name || "Chưa cập nhật"}</p>
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}