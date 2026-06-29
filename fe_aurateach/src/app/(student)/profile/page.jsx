"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/users/Header";
import Footer from "@/components/users/Footer";
import "./profile.css";

export default function StudentProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "booking", label: "Đặt lịch", icon: "📅" },
    { id: "my-classes", label: "Lớp học của tôi", icon: "📚" },
    { id: "classList", label: "Danh sách lớp", icon: "🔍" },
    { id: "tutorList", label: "Gia sư", icon: "👨‍🏫" },
    { id: "report", label: "Báo cáo", icon: "⚠️" },
    { id: "info", label: "Thông tin cá nhân", icon: "👤" },
  ];

  useEffect(() => {
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_info='));

    const role = document.cookie
      .split('; ')
      .find(row => row.startsWith('role='))?.split('=')[1];

    if (!userCookie || role !== "student") {
      router.push("/login");
      return;
    }

    try {
      const userInfo = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
      setUser(userInfo);
    } catch (e) {
      console.error("Parse user error", e);
    }
  }, [router]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent user={user} />;
      case "booking":
        return <BookingContent />;
      case "my-classes":
        return <MyClassesContent />;
      case "classList":
        return <ClassListContent />;
      case "tutorList":
        return <TutorListContent />;
      case "report":
        return <ReportContent />;
      case "info":
        return <PersonalInfo user={user} />;
      default:
        return <DashboardContent user={user} />;
    }
  };

  return (
    <>
      <Header />
      <div className="profile-page">
        <div className="profile-container">
          {/* Sidebar */}
          <div className="profile-sidebar">
            <h2>QUẢN LÝ HỌC TẬP</h2>
            <nav className="sidebar-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`sidebar-link ${activeTab === tab.id ? "active" : ""}`}
                >
                  <span className="sidebar-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
              <button 
                onClick={() => {
                  document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  router.push("/");
                }} 
                className="sidebar-link logout"
              >
                🚪 Đăng xuất
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="profile-content">
            <div className="profile-header">
              <h2>{tabs.find(t => t.id === activeTab)?.label}</h2>
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

// ==================== CÁC COMPONENT CON ====================

function DashboardContent({ user }) {
  return (
    <div>
      <h3>Xin chào, {user?.name}!</h3>
      <p>Chào mừng bạn đến với Dashboard học viên.</p>
      {/* Thêm thống kê sau */}
    </div>
  );
}

function BookingContent() {
  return <div><h3>Đặt lịch học</h3><p>Chức năng đặt lịch với gia sư...</p></div>;
}

function MyClassesContent() {
  return <div><h3>Lớp học của tôi</h3><p>Danh sách lớp đang học...</p></div>;
}

function ClassListContent() {
  return <div><h3>Danh sách tất cả lớp học</h3><p>Tìm kiếm và lọc lớp...</p></div>;
}

function TutorListContent() {
  return <div><h3>Danh sách gia sư</h3><p>Khám phá gia sư phù hợp...</p></div>;
}

function ReportContent() {
  return <div><h3>Báo cáo gia sư</h3><p>Gửi phản hồi / báo cáo...</p></div>;
}

function PersonalInfo({ user }) {
  return (
    <div className="profile-info-grid">
      <h3>Thông tin cá nhân</h3>
      <p><strong>Họ tên:</strong> {user?.name}</p>
      <p><strong>Email:</strong> {user?.email}</p>
      {/* Thêm form chỉnh sửa sau */}
    </div>
  );
}