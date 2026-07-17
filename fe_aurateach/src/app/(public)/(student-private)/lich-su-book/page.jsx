"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import BookingDetailModal from "@/components/users/BookingDetailModal.jsx";
import authService from "@/services/authService";
import courseSubscriptionService from "@/services/courseSubscriptionService"; // Đã sửa import
import "../profile/profile.css";
import "./lich-su-book.css";

export default function StudentBookingHistoryPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [bookedClasses, setBookedClasses] = useState([]);
  // Giữ lại các state cần thiết để tránh lỗi render
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [allTutors, setAllTutors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const user = await authService.getCurrentUser();
        
        console.log("Dữ liệu user lấy từ authService:", user);
        
        const userId = user?.id || user?.user_id; 
        
        if (!userId) {
            console.error("Không tìm thấy ID người dùng!");
            return;
        }

        // Gọi API lấy lịch sử
        const historyData = await courseSubscriptionService.getStudentHistory(userId);
        console.log("Dữ liệu history từ API:", historyData);

        // Đảm bảo historyData là mảng hợp lệ
        if (Array.isArray(historyData)) {
            const validData = historyData.filter(sub => sub && sub.course !== null);
            setBookings(validData);
            // Lưu trực tiếp các item dạng kết hợp để dễ hiển thị
            setBookedClasses(validData); 
        }

      } catch (error) {
        console.error("Lỗi khi tải lịch sử:", error);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, []);

  const formatPrice = (price) => {
    if (!price) return "Liên hệ";
    const cleanStr = typeof price === 'string' ? price : String(price);
    return cleanStr.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  const handleViewDetail = (courseId) => {
    const course = allCourses.find(c => c.course_id === courseId || c.id === courseId);
    if (course) {
      setSelectedCourse(course);
      const tutorInfo = getTutorInfo(course.tutor_id);
      setSelectedTutor(tutorInfo);
      setShowDetailModal(true);
    }
  };

  const handleJoinClass = (meetUrl) => {
    if (meetUrl) {
      window.open(meetUrl, '_blank');
    }
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedCourse(null);
    setSelectedTutor(null);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="profile-loading" style={{ marginTop: "100px", textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p>Đang tải lịch sử lớp học...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="profile-page" style={{ marginTop: "80px" }}>
        <div className="profile-container">
          
          <StudentSidebar />

          <div className="profile-content">
            <div className="profile-header">
              <h2>Lịch sử đăng ký lớp học</h2>
              <p>Danh sách các lớp học bạn đã đăng ký tham gia trên hệ thống AuraTeach.</p>
            </div>

            <div className="booking-history-container">
              {bookedClasses.length === 0 ? (
                <div className="empty-booking">
                  <span className="empty-icon">📂</span>
                  <p>Bạn chưa đăng ký tham gia lớp học nào.</p>
                  <Link href="/classList" className="find-class-btn">
                    Tìm kiếm lớp học ngay
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="booking-table">
                    <thead>
                      <tr>
                        <th>Mã lớp</th>
                        <th>Tên lớp học</th>
                        <th>Gia sư giảng dạy</th>
                        <th>Học phí / Giờ</th>
                        <th>Trạng thái</th>
                        <th>Thanh toán</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookedClasses.map((course, index) => (
                        <tr key={course.course_id || `booking-${index}`}>
                          <td>{course.course_id}</td>
                          <td>{course.title}</td>
                          <td className="tutor-name-cell">👨‍🏫 {course.tutor_display_name || course.tutor_id || "Gia sư AuraTeach"}</td>
                          <td className="price-cell">{formatPrice(course.hourly_rate)}</td>
                          
                          {/* Cột Trạng thái đăng ký / khóa học */}
                          <td>
                            <span className="status-badge">
                              {course.subscription_status}
                            </span>
                          </td>

                          {/* Cột Trạng thái thanh toán (Thêm mới) */}
                          <td>
                            <span className={`status-badge ${course.payment_status_class || 'payment-unpaid'}`}>
                              {course.payment_status_label || '⏳ Chưa thanh toán'}
                            </span>
                          </td>

                          {/* Cột Hành động */}
                          <td>
                            <button 
                              className="view-detail-btn"
                              onClick={() => handleViewDetail(course.course_id)}
                            >
                              Chi tiết ➜
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {showDetailModal && selectedCourse && (
        <BookingDetailModal
          course={selectedCourse}
          tutorName={selectedTutor?.full_name || getTutorName(selectedCourse.tutor_id)}
          tutorInfo={selectedTutor}
          onClose={handleCloseModal}
          onJoinClass={handleJoinClass}
        />
      )}
    </>
  );
}