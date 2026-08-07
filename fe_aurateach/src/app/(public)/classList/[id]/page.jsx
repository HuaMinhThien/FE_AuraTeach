// src/app/(public)/classList/[id]/page.jsx
"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ClassDetail.module.css";
import BookingModal from "@/components/users/BookingModal";
import Avatar from "@/components/common/Avatar";

// Import đầy đủ các service
import { authService } from "@/services/authService";
import { courseService } from "@/services/courseService";
import { courseSubscriptionService } from "@/services/courseSubscriptionService";

export default function ClassDetailPage({ params }) {
  const router = useRouter();
  
  const { id } = use(params);
  const courseId = id;

  const [course, setCourse] = useState(null);
  const [tutorInfo, setTutorInfo] = useState(null);
  const [userTutor, setUserTutor] = useState(null);
  const [courseReviews, setCourseReviews] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const [isBooked, setIsBooked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Hàm tải và đồng bộ hóa toàn bộ dữ liệu lớp học từ Server
  const fetchClassData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setPageLoading(true);

      const [courseData, userData] = await Promise.all([
        courseService.getCourseDetail(courseId),
        authService.getCurrentUser().catch(() => null)
      ]);

      const user = userData?.user || userData;
      setCurrentUser(user);

      if (!courseData) {
        setCourse(null);
        return;
      }

      const courseObj = courseData.course || courseData;
      setCourse(courseObj);
      setAllCategories(courseData.categories || courseData.allCategories || []);
      setCourseReviews(courseData.reviews || []);

      const currentTutor = courseData.tutor || courseObj?.tutor || null;
      setTutorInfo(currentTutor);

      const currentUserTutor = courseData.userTutor || currentTutor?.user || null;
      setUserTutor(currentUserTutor);

      const studentId = user?.user_id || user?.id;
      const currentCourseStudents = courseData.students || courseObj?.students || [];

      // 🔥 KIỂM TRA CHUẨN XÁC: 
      // 1. Kiểm tra qua mảng students cũ
      let isAlreadyBooked = studentId && currentCourseStudents.map(String).includes(String(studentId));

      // 2. Kiểm tra sâu hơn: Nếu backend có trả về danh sách subscriptions của user hoặc course
      // (Hoặc bạn có thể gọi thêm service courseSubscriptionService để check nếu cần, 
      // nhưng nếu courseData đã bao gồm danh sách subscriptions active thì check ở đây)
      const subscriptions = courseData.subscriptions || courseObj?.subscriptions || [];
      if (studentId && subscriptions.length > 0) {
        const activeSub = subscriptions.find(sub => 
          String(sub.student_id) === String(studentId) && sub.status === 'active'
        );
        if (activeSub) {
          isAlreadyBooked = true;
        }
      }

      setIsBooked(isAlreadyBooked);

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang chi tiết:", error);
    } finally {
      if (isInitial) setPageLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchClassData(true);
    }
  }, [courseId, fetchClassData]);

  const handleBooking = async () => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập để đăng ký học!");
      router.push('/login');
      return;
    }

    if (currentUser.role !== 'student') {
      alert("Chỉ tài khoản Học viên mới có quyền đăng ký tham gia lớp học này.");
      return;
    }

    const currentStudents = course.students || [];
    if (currentStudents.length >= course.max_students) {
      alert("Lớp học đã đủ số lượng học viên!");
      return;
    }

    const studentId = currentUser.user_id || currentUser.id;
    if (currentStudents.map(String).includes(String(studentId))) {
      alert("Bạn đã đăng ký lớp học này rồi!");
      return;
    }

    setShowBookingModal(true);
  };

  const confirmBooking = async (notes, paymentMethod) => {
    setBookingLoading(true);
    const studentId = currentUser.user_id || currentUser.id;

    try {
      const result = await courseSubscriptionService.createBooking({
        courseId: course.course_id || course.id,
        studentId: studentId,
        notes: notes,
        paymentMethod: paymentMethod
      });

      return {
        success: true,
        data: result.data || result
      };

    } catch (error) {
      console.error("Lỗi liên kết API Booking:", error);
      alert(error.message || "Đã xảy ra sự cố kết nối. Vui lòng thử lại sau.");
      return {
        success: false,
        message: error.message
      };
    } finally {
      setBookingLoading(false);
    }
  };

  // 🔥 Đã cập nhật: Tự động gọi lại fetchClassData(false) để làm mới dữ liệu ngay sau khi thanh toán thành công
  const handleBookingSuccess = async () => {
    setIsBooked(true);
    setShowBookingModal(false);
    
    // 🔥 Cập nhật trực tiếp học viên vào state course hiện tại để khóa nút ngay lập tức
    if (currentUser) {
      const studentId = currentUser.user_id || currentUser.id;
      setCourse(prevCourse => {
        if (!prevCourse) return prevCourse;
        const currentStudents = prevCourse.students || [];
        if (!currentStudents.map(String).includes(String(studentId))) {
          return {
            ...prevCourse,
            students: [...currentStudents, studentId],
            current_students: (prevCourse.current_students || currentStudents.length) + 1
          };
        }
        return prevCourse;
      });
    }

    // Sau đó mới gọi ngầm để đồng bộ dữ liệu chuẩn từ backend
    await fetchClassData(false);
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return course?.category_name || "Chưa phân loại";
    
    const category = allCategories.find(c => 
      String(c.category_id || c.id) === String(categoryId)
    );
    
    if (category) {
      return category.category_name || category.name;
    }
    
    return course?.category_name || course?.category?.category_name || "Chưa phân loại";
  };

  const formatPrice = (priceStr) => {
    if (!priceStr) return '0';
    const cleanStr = typeof priceStr === 'string' ? priceStr : String(priceStr);
    return cleanStr.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Chưa cập nhật";
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (pageLoading) {
    return <div className={styles.container} style={{marginTop: "100px", textAlign: "center"}}>Đang tải thông tin lớp học từ Server...</div>;
  }

  if (!course) {
    return <div className={styles.container} style={{marginTop: "100px", textAlign: "center"}}>Không tìm thấy khóa học</div>;
  }

  const schedulesList = Array.isArray(course?.schedules) ? course.schedules : [];
  const dayOrder = { "Thứ 2": 1, "Thứ 3": 2, "Thứ 4": 3, "Thứ 5": 4, "Thứ 6": 5, "Thứ 7": 6, "Chủ Nhật": 7, "CN": 7 };

  const displayScheduleDays = schedulesList.length > 0 
    ? [...new Set(schedulesList.map(s => s.day_of_week || s.days).filter(Boolean))]
        .sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99))
        .join(", ") 
    : (course.schedule_days || "Chưa cập nhật");

  const sessionsPerWeek = schedulesList.length > 0 
    ? schedulesList.length 
    : (Array.isArray(course.schedule_days) ? course.schedule_days.length : 1);

  const totalWeeks = course?.total_weeks || 12;
  const totalSessions = sessionsPerWeek * totalWeeks;

  const firstSchedule = schedulesList.length > 0 ? schedulesList[0] : {};
  const displayTimeSlot = firstSchedule.time_slot || course.time_slot || "Chưa cập nhật";
  const displayStartDate = firstSchedule.start_time || firstSchedule.start_date || course.start_date;
  const displayEndDate = firstSchedule.end_time || firstSchedule.end_date || course.end_date;
  const roomUrl = firstSchedule.meeting_platform || firstSchedule.room_url || course.permanent_room_url;

  const handleJoinClass = () => {
    if (roomUrl) {
      window.open(roomUrl, '_blank');
    } else {
      alert("Lớp học chưa có link phòng học. Vui lòng liên hệ gia sư để được hỗ trợ.");
    }
  };

  const averageRating = courseReviews.length > 0 
    ? (courseReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / courseReviews.length).toFixed(1)
    : tutorInfo?.rating || 4.8;

  const canViewMeetLink = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'tutor') return true;
    if (currentUser.role === 'student') {
      const studentId = currentUser.user_id || currentUser.id;
      return isBooked || (course?.students && course.students.map(String).includes(String(studentId)));
    }
    return false;
  };

  const hasMeetLink = roomUrl && roomUrl.trim() !== "";
  const showMeetLink = canViewMeetLink() && hasMeetLink;

  const currentStudentsCount = course.students ? course.students.length : (course.current_students || 0);
  const isFull = currentStudentsCount >= course.max_students;

  return (
    <div className={styles.container} style={{marginTop: "80px"}}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/">Trang chủ</Link>
        <span className={styles.separator}>›</span>
        <Link href="/classList">Danh sách lớp học</Link>
        <span className={styles.separator}>›</span>
        <span className={styles.current}>{course.title}</span>
      </nav>

      {/* Thumbnail */}
      <div className={styles.thumbnailWrapper}>
        <img 
          src={course.thumbnail || "/img/default-class-1.jpg"} 
          alt={course.title}
          className={styles.thumbnail}
        />
      </div>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{course.title}</h1>
        <div className={styles.meta}>
          <div className={styles.rating}>
            <span className={styles.star}>⭐</span>
            <span className={styles.ratingValue}>{averageRating}</span>
            <span className={styles.reviews}>({courseReviews.length} đánh giá)</span>
          </div>
          <div className={styles.students}>
            <span>👥 {currentStudentsCount}/{course.max_students} học viên</span>
          </div>
          <div className={styles.tag}>
            <span className={styles.tagBadge}>📚 {getCategoryName(course.category_id)}</span>
          </div>
          <div className={styles.tag}>
            <span className={`${styles.tagBadge} ${course.status === 'active' ? styles.statusActive : styles.statusClosed}`}>
              {course.status === 'active' ? '🟢 Đang mở' : '🔴 Đã đóng'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Left Column */}
        <div className={styles.mainContent}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📖 Giới thiệu chương trình</h2>
            <div className={styles.description}>
              <p>{course.description}</p>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📋 Thông tin chi tiết</h2>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Mã lớp</span>
                <span className={styles.detailValue}>{course.course_id || course.id}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Trình độ</span>
                <span className={styles.detailValue}>{course.level || "Chưa cập nhật"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Danh mục</span>
                <span className={styles.detailValue}>{getCategoryName(course.category_id)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Học phí</span>
                <span className={`${styles.detailValue} ${styles.priceValue}`}>
                  {course.price_per_session ? `${formatPrice(course.price_per_session)}đ/buổi` : 'Liên hệ'}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Số buổi</span>
                <span className={styles.detailValue}>{totalSessions} buổi ({sessionsPerWeek} buổi/tuần x {totalWeeks} tuần)</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Thời gian học</span>
                <span className={styles.detailValue}>{displayTimeSlot}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Lịch học</span>
                <span className={styles.detailValue}>
                  {Array.isArray(displayScheduleDays) ? displayScheduleDays.join(", ") : displayScheduleDays}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Ngày bắt đầu</span>
                <span className={styles.detailValue}>{formatDate(displayStartDate)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Ngày kết thúc</span>
                <span className={styles.detailValue}>{formatDate(displayEndDate)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Sĩ số</span>
                <span className={styles.detailValue}>{currentStudentsCount}/{course.max_students} học viên</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Phòng học</span>
                <span className={styles.detailValue}>
                  {showMeetLink ? (
                    <a href={roomUrl} target="_blank" rel="noopener noreferrer" className={styles.meetLink}>
                      🔗 Google Meet
                    </a>
                  ) : hasMeetLink ? (
                    <span className={styles.meetLocked}>🔒 Chỉ học viên đã đăng ký mới xem được link</span>
                  ) : (
                    "Chưa cập nhật"
                  )}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Trạng thái</span>
                <span className={`${styles.detailValue} ${course.status === 'active' ? styles.statusActive : styles.statusClosed}`}>
                  {course.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                </span>
              </div>
            </div>
          </section>

          {/* Reviews Section */}
          <section className={styles.section}>
            <div className={styles.reviewsHeader}>
              <h2 className={styles.sectionTitle}>⭐ Đánh giá từ học viên</h2>
              <div className={styles.reviewsSummary}>
                <span className={styles.summaryRating}>{averageRating}</span>
                <span className={styles.summaryStars}>⭐⭐⭐⭐⭐</span>
                <span className={styles.summaryCount}>{courseReviews.length} Đánh giá</span>
              </div>
            </div>

            <div className={styles.reviewsList}>
              {courseReviews.length > 0 ? (
                courseReviews.map((review) => (
                  <div key={review.review_id || review.id} className={styles.reviewCard}>
                    <div className={styles.reviewAuthor}>
                      <span className={styles.reviewName}>
                        {review.student_name || review.user?.full_name || "Học viên ẩn danh"}
                      </span>
                      <span className={styles.reviewRating}>
                        {'⭐'.repeat(review.rating || 5)}
                      </span>
                    </div>
                    <p className={styles.reviewContent}>{review.comment}</p>
                  </div>
                ))
              ) : (
                <p className={styles.noReviews}>Chưa có đánh giá nào cho khóa học này.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.priceCard}>
            <div className={styles.priceHeader}>
              <span className={styles.price}>
                {course.price_per_session ? `${formatPrice(course.price_per_session * totalSessions)}đ` : 'Liên hệ'}
              </span>
              {course.price_per_session && <span className={styles.priceUnit}>/trọn gói</span>}
            </div>

            <div className={styles.priceDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>👥</span>
                <span>Sĩ số: {currentStudentsCount}/{course.max_students} học viên</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📅</span>
                <span>{Array.isArray(displayScheduleDays) ? displayScheduleDays.join(", ") : displayScheduleDays}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>⏰</span>
                <span>{displayTimeSlot}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📚</span>
                <span>{totalSessions} buổi học ({sessionsPerWeek} buổi/tuần)</span>
              </div>
            </div>

            {showMeetLink && course.status === 'active' && (
              <button onClick={handleJoinClass} className={styles.joinButton}>
                🎯 Tham gia lớp học
              </button>
            )}

            <button 
              onClick={handleBooking} 
              className={isBooked || isFull || course.status !== 'active' ? styles.bookedButton : styles.bookButton}
              disabled={bookingLoading || isBooked || isFull || course.status !== 'active'}
            >
              {bookingLoading ? "Đang xử lý..." : 
               isBooked ? "✅ Đã đăng ký khóa học" : 
               isFull ? "🔴 Lớp đã đủ học viên" :
               course.status !== 'active' ? "🔴 Lớp đã đóng" : 
               "📝 Đăng ký học ngay"}
            </button>
            <button className={styles.consultButton}>💬 Đặt lịch tư vấn</button>
          </div>

          {/* Tutor Card */}
          <div className={styles.tutorCard}>
            <h3 className={styles.tutorCardTitle}>👨‍🏫 GIA SƯ HƯỚNG DẪN</h3>
            <div className={styles.tutorInfo}>
              <div className={styles.tutorAvatar}>
                <Avatar 
                  src={userTutor?.avatar}
                  alt={userTutor?.full_name || "Tutor"}
                  size={56}
                  fallbackText={userTutor?.full_name?.charAt(0) || 'T'}
                />
              </div>
              <div className={styles.tutorDetails}>
                <h4 className={styles.tutorName}>{userTutor?.full_name || "Đang tải tên..."}</h4>
                <p className={styles.tutorTitle}>{tutorInfo?.expertise || "Gia sư chuyên môn"}</p>
                <p className={styles.tutorDescription}>
                  {tutorInfo?.bio || "Gia sư giàu kinh nghiệm giảng dạy."}
                </p>
                <div className={styles.tutorExtra}>
                  <span>⭐ {tutorInfo?.rating || 5.0}/5</span>
                  <span className={styles.tutorDivider}>•</span>
                  <span>{tutorInfo?.Experience || tutorInfo?.experience || "Chưa cập nhật"}</span>
                </div>
                <Link 
                  href={`/tutorList/${tutorInfo?.tutor_id || tutorInfo?.id}`} 
                  className={styles.tutorProfileLink}
                >
                  Xem hồ sơ chi tiết →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          course={{
            ...course,
            sessionsPerWeek,
            totalSessions
          }}
          tutorName={userTutor?.full_name || "Gia sư"}
          onClose={() => setShowBookingModal(false)}
          onConfirm={confirmBooking}
          onSuccess={handleBookingSuccess}
          loading={bookingLoading}
        />
      )}
    </div>
  );
}