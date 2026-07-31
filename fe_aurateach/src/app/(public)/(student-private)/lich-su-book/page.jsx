"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import BookingDetailModal from "@/components/users/BookingDetailModal.jsx";
import { authService } from "@/services/authService";
import { courseService } from "@/services/courseService";
import "../profile/profile.css";
import "./lich-su-book.css";

export default function StudentBookingHistoryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [bookedClasses, setBookedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        console.log("📌 [1] Bắt đầu khởi tạo trang, đang gọi authService.getCurrentUser()...");
        const rawUserResponse = await authService.getCurrentUser();
        console.log("🔍 [DEBUG USER RESPONSE]:", rawUserResponse);
        
        // Bóc tách chuẩn xác vào object user bên trong response
        const baseData = rawUserResponse?.data || rawUserResponse;
        const user = baseData?.user || baseData; 

        if (!user) {
          console.warn("⚠️ [DEBUG] Không tìm thấy thông tin user từ authService!");
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        
        // Lấy chính xác user_id (ví dụ: 'u-YdQ8WuFQ') để truyền vào API khóa học
        const userId = user?.user_id || user?.id || user?.sub;
        console.log("📌 [2] ID người dùng xác định được (user_id):", userId);

        if (!userId) {
          console.error("❌ [DEBUG] Không thể tìm thấy user_id trong object user:", user);
          setLoading(false);
          return;
        }

        // Gọi API lấy danh sách lớp đã đăng ký bằng user_id
        console.log(`📌 [3] Đang gọi courseService.getSubscribedCourses(${userId})...`);
        const response = await courseService.getSubscribedCourses(userId);
        
        console.log("📥 [DEBUG RAW API RESPONSE]:", response);

        // Chuẩn hóa mảng dữ liệu trả về từ API
        let listClasses = [];
        if (Array.isArray(response)) {
          listClasses = response;
        } else if (response && Array.isArray(response.data)) {
          listClasses = response.data;
        } else if (response && typeof response === 'object') {
          listClasses = response.courses || response.result || [];
        }

        console.log("🎯 [DEBUG FINAL LIST CLASSES]:", listClasses);
        setBookedClasses(listClasses);

      } catch (error) {
        console.error("❌ [DEBUG LỖI TẠI INITPAGE]:", error);
      } finally {
        setLoading(false);
        console.log("🏁 [Hoàn tất] Quá trình tải trang kết thúc.");
      }
    };

    initPage();
  }, [router]);

  const getTutorName = (item) => {
    const name = item?.tutor?.user?.full_name || item?.tutor_name || item?.tutorName;
    console.log(`🔍 [DEBUG TUTOR NAME cho khóa ${item?.course_id || item?.id}]:`, name, item);
    return name || "Gia sư AuraTeach";
  };

  const getTutorInfo = (item) => {
    if (!item?.tutor) return null;
    return {
      ...item.tutor,
      full_name: item?.tutor?.user?.full_name || "Gia sư AuraTeach"
    };
  };

  const getBookingStatus = (statusKey) => {
    console.log("🔍 [DEBUG BOOKING STATUS KEY]:", statusKey);
    const statusMap = {
      'pending': { label: '⏳ Chờ xác nhận', className: 'status-pending' },
      'confirmed': { label: '✅ Đã xác nhận', className: 'status-confirmed' },
      'completed': { label: '🎓 Đã hoàn thành', className: 'status-completed' },
      'cancelled': { label: '❌ Đã hủy', className: 'status-cancelled' }
    };
    return statusMap[statusKey] || { label: statusKey || 'Đã xác nhận', className: 'status-confirmed' };
  };

  const getPaymentStatus = (paymentKey) => {
    console.log("🔍 [DEBUG PAYMENT STATUS KEY]:", paymentKey);
    const statusMap = {
      'unpaid': { label: '⏳ Chưa thanh toán', className: 'payment-unpaid' },
      'paid': { label: '✅ Đã thanh toán', className: 'payment-paid' },
      'refunded': { label: '↩️ Đã hoàn tiền', className: 'payment-refunded' }
    };
    return statusMap[paymentKey] || null;
  };

  const formatPrice = (price) => {
    if (!price) return "Liên hệ";
    const cleanStr = typeof price === 'string' ? price : String(price);
    return cleanStr.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  const handleViewDetail = (item) => {
    setSelectedCourse(item);
    setSelectedTutor(getTutorInfo(item));
    setShowDetailModal(true);
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
                      {bookedClasses.map((item, index) => {
                        const courseId = item.course_id || item.id;
                        const status = getBookingStatus(item.booking_status);
                        const payment = getPaymentStatus(item.payment_status);
                        
                        return (
                          <tr key={courseId || index}>
                            <td className="text-bold">{courseId || "N/A"}</td>
                            <td>
                              <div className="class-title-cell">
                                <span className="class-name-text">{item.title}</span>
                                <span className="class-flow-badge">{item.level || "Tiêu chuẩn"}</span>
                              </div>
                            </td>
                            <td className="tutor-name-cell">👨‍🏫 {getTutorName(item)}</td>
                            <td className="price-cell">{formatPrice(item.hourly_rate || item.price)}</td>
                            <td>
                              <span className={`status-badge ${status.className}`}>
                                {status.label}
                              </span>
                            </td>
                            <td>
                              {payment ? (
                                <span className={`payment-badge ${payment.className}`}>
                                  {payment.label}
                                </span>
                              ) : (
                                <span className="payment-badge payment-na">N/A</span>
                              )}
                            </td>
                            <td>
                              <button 
                                className="view-detail-btn"
                                onClick={() => handleViewDetail(item)}
                              >
                                Chi tiết ➜
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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
          tutorName={selectedTutor?.full_name || getTutorName(selectedCourse)}
          tutorInfo={selectedTutor}
          onClose={handleCloseModal}
          onJoinClass={handleJoinClass}
        />
      )}
    </>
  );
}