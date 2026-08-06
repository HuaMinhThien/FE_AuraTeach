"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/users/Header.jsx";
import StudentSidebar from "@/components/users/StudentSidebar.jsx";
import BookingDetailModal from "@/components/users/BookingDetailModal.jsx";
import authService from "@/services/authService";
import { getClassroomRoomPath } from "@/utils/roomUtils";
import "../profile/profile.css";
import "./lich-su-book.css";

export default function StudentBookingHistoryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [bookedClasses, setBookedClasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [allTutors, setAllTutors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const API_BASE = "http://localhost:3007";

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const user = await authService.getCurrentUser();
        
        const getCookie = (name) => {
          if (typeof window === "undefined") return null;
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        const role = getCookie("role");

        if (!user || role !== "student") {
          router.push("/login");
          return;
        }
        setCurrentUser(user);
        const studentId = user.user_id || user.id;

        const [coursesRes, tutorsRes, usersRes, bookingsRes] = await Promise.all([
          fetch(`${API_BASE}/courses`),
          fetch(`${API_BASE}/tutors`),
          fetch(`${API_BASE}/users`),
          fetch(`${API_BASE}/bookings?studentId=${studentId}`)
        ]);

        const allCoursesData = await coursesRes.json();
        const tutorsData = await tutorsRes.json();
        const usersData = await usersRes.json();
        const bookingsData = await bookingsRes.json();

        setAllCourses(allCoursesData);
        setAllTutors(tutorsData);
        setAllUsers(usersData);

        const bookingList = bookingsData.data || [];
        setBookings(bookingList);

        const filteredClasses = allCoursesData.filter(course => 
          course.students && course.students.includes(studentId)
        );
        setBookedClasses(filteredClasses);
        
      } catch (error) {
        console.error("Lỗi khi tải lịch sử đăng ký lớp học:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  const getTutorName = (tutorId) => {
    const tutor = allTutors.find(t => t.tutor_id === tutorId);
    if (!tutor) return "Đang cập nhật";
    const user = allUsers.find(u => u.user_id === tutor.user_id);
    return user ? user.full_name : "Gia sư AuraTeach";
  };

  const getTutorInfo = (tutorId) => {
    const tutor = allTutors.find(t => t.tutor_id === tutorId);
    if (!tutor) return null;
    const user = allUsers.find(u => u.user_id === tutor.user_id);
    return {
      ...tutor,
      full_name: user ? user.full_name : "Gia sư AuraTeach"
    };
  };

  const getBookingStatus = (courseId) => {
    const booking = bookings.find(b => b.course_id === courseId);
    if (!booking) {
      return { label: 'Đã xác nhận', className: 'status-confirmed' };
    }
    
    const statusMap = {
      'pending': { label: '⏳ Chờ xác nhận', className: 'status-pending' },
      'confirmed': { label: '✅ Đã xác nhận', className: 'status-confirmed' },
      'completed': { label: '🎓 Đã hoàn thành', className: 'status-completed' },
      'cancelled': { label: '❌ Đã hủy', className: 'status-cancelled' }
    };
    
    return statusMap[booking.status] || { label: booking.status, className: '' };
  };

  const getPaymentStatus = (courseId) => {
    const booking = bookings.find(b => b.course_id === courseId);
    if (!booking) return null;
    
    const statusMap = {
      'unpaid': { label: '⏳ Chưa thanh toán', className: 'payment-unpaid' },
      'paid': { label: '✅ Đã thanh toán', className: 'payment-paid' },
      'refunded': { label: '↩️ Đã hoàn tiền', className: 'payment-refunded' }
    };
    
    return statusMap[booking.payment_status] || null;
  };

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

  const handleJoinClass = (course) => {
    if (course) {
      window.open(getClassroomRoomPath(course, "student"), '_blank');
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
                      {bookedClasses.map((item) => {
                        const status = getBookingStatus(item.course_id);
                        const payment = getPaymentStatus(item.course_id);
                        return (
                          <tr key={item.course_id || item.id}>
                            <td className="text-bold">{item.course_id || "N/A"}</td>
                            <td>
                              <div className="class-title-cell">
                                <span className="class-name-text">{item.title}</span>
                                <span className="class-flow-badge">{item.level || "Tiêu chuẩn"}</span>
                              </div>
                            </td>
                            <td className="tutor-name-cell">👨‍🏫 {getTutorName(item.tutor_id)}</td>
                            <td className="price-cell">{formatPrice(item.price_per_session)}</td>
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
                                onClick={() => handleViewDetail(item.course_id || item.id)}
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
          tutorName={selectedTutor?.full_name || getTutorName(selectedCourse.tutor_id)}
          tutorInfo={selectedTutor}
          onClose={handleCloseModal}
          onJoinClass={handleJoinClass}
        />
      )}
    </>
  );
}