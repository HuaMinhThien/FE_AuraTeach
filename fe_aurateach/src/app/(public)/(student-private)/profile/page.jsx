"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Headers from "@/components/users/Headers";
import "./profile.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Lấy cookie
  const getCookie = (name) => {
    if (typeof window === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    // Kiểm tra đăng nhập
    const userCookie = getCookie("user_info");
    const role = getCookie("role");

    if (!userCookie || role !== "student") {
      router.push("/login");
      return;
    }

    try {
      const userInfo = JSON.parse(decodeURIComponent(userCookie));
      setUser(userInfo);
      fetchUserData(userInfo.id);
    } catch (error) {
      console.error("Error parsing user info:", error);
      router.push("/login");
    }
  }, [router]);

  // Fetch dữ liệu user từ API
  const fetchUserData = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error("Không thể lấy thông tin người dùng");
      }
      const data = await response.json();
      setUserData(data.user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Không thể tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format role
  const formatRole = (role) => {
    const roleMap = {
      student: "Học viên",
      tutor: "Gia sư",
      admin: "Quản trị viên",
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <>
        <Headers />
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin...</p>
        </div>
      </>
    );
  }

  if (error || !userData) {
    return (
      <>
        <Headers />
        <div className="profile-error">
          <p>{error || "Không tìm thấy thông tin người dùng"}</p>
          <button onClick={() => router.push("/")}>Quay về trang chủ</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Headers />
      <div className="profile-page">
        <div className="profile-container">
          {/* Sidebar - Quản lý tài khoản */}
          <div className="profile-sidebar">
            <div className="sidebar-title">
              <h2>QUẢN LÝ TÀI KHOẢN</h2>
            </div>
            <nav className="sidebar-nav">
              <Link href="/profile" className="sidebar-link active">
                <span className="sidebar-icon">👤</span>
                Thông tin cá nhân
              </Link>
              <Link href="/lich-su-book" className="sidebar-link">
                <span className="sidebar-icon">📚</span>
                Lịch sử đăng ký lớp học
              </Link>
              <Link href="/lich-su-giao-dich" className="sidebar-link">
                <span className="sidebar-icon">💰</span>
                Lịch sử giao dịch
              </Link>
              <Link href="/messenger" className="sidebar-link">
                <span className="sidebar-icon">💬</span>
                Messenger
              </Link>
              <button onClick={() => {
                document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                router.push("/login");
              }} className="sidebar-link logout">
                <span className="sidebar-icon">🚪</span>
                Đăng xuất
              </button>
            </nav>
          </div>

          {/* Main Content - Thông tin cá nhân */}
          <div className="profile-content">
            <div className="profile-header">
              <h2>Thông tin cá nhân</h2>
              <p>Cập nhật thông tin tài khoản của bạn tại đây để nhận được hỗ trợ tốt nhất.</p>
            </div>

            <div className="profile-info-grid">
              {/* Avatar */}
              <div className="profile-avatar-section">
                <div className="profile-avatar">
                  <Image
                    src={userData.avatar || "/img/default-avatar.png"}
                    alt="Avatar"
                    width={120}
                    height={120}
                    className="avatar-image"
                  />
                </div>
                <div className="profile-status">
                  <span className={`status-badge ${userData.status === "active" ? "active" : "inactive"}`}>
                    {userData.status === "active" ? "✅ Hoạt động" : "❌ Không hoạt động"}
                  </span>
                </div>
              </div>

              {/* Thông tin chi tiết */}
              <div className="profile-details">
                <div className="detail-item">
                  <label>Họ và tên</label>
                  <div className="detail-value">{userData.full_name || "Chưa cập nhật"}</div>
                </div>

                <div className="detail-item">
                  <label>Số điện thoại</label>
                  <div className="detail-value">{userData.phone || "Chưa cập nhật"}</div>
                </div>

                <div className="detail-item">
                  <label>Ngày sinh</label>
                  <div className="detail-value">{formatDate(userData.birth_date) || "Chưa cập nhật"}</div>
                </div>

                <div className="detail-item">
                  <label>Email</label>
                  <div className="detail-value">{userData.email || "Chưa cập nhật"}</div>
                </div>

                <div className="detail-item">
                  <label>VAI TRÒ</label>
                  <div className="detail-value role-badge">{formatRole(userData.role)}</div>
                </div>

                <div className="detail-item">
                  <label>THAM GIA TỪ</label>
                  <div className="detail-value">{formatDate(userData.created_at)}</div>
                </div>

                <div className="detail-item">
                  <label>Lần cuối thay đổi thông tin</label>
                  <div className="detail-value">{formatDate(userData.updated_at) || "Chưa cập nhật"}</div>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button className="edit-profile-btn">
                ✏️ Sửa thông tin
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}