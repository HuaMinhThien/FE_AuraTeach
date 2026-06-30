"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./ClassDetail.module.css";
import authService from "../../../../services/authService";
import BookingModal from "@/components/users/BookingModal";
import Avatar from "@/components/common/Avatar";

export default function ClassDetailPage({ params }) {
  const router = useRouter();
  
  // ✅ Unwrap params bằng React.use() theo chuẩn Next.js App Router
  const { id } = use(params);
  const courseId = id;

  // --- Các State quản lý dữ liệu lấy từ API ---
  const [course, setCourse] = useState(null);
  const [tutorInfo, setTutorInfo] = useState(null);
  const [userTutor, setUserTutor] = useState(null);
  const [courseReviews, setCourseReviews] = useState([]);
  const [allUsers, setAllUsers] = useState([]); 
  const [allStudents, setAllStudents] = useState([]);

  // --- Các State quản lý trạng thái UI ---
  const [isBooked, setIsBooked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const API_BASE = "http://localhost:3007";

  // 📥 Fetch toàn bộ dữ liệu của lớp học từ API
  useEffect(() => {
    let isMounted = true; 

    const fetchClassData = async () => {
      try {
        setPageLoading(true);

        // 1. Lấy chi tiết Khóa học từ API
        const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
        const coursesData = await courseRes.json();
        
        if (!isMounted) return;

        if (!coursesData || coursesData.length === 0) {
          setCourse(null);
          setPageLoading(false);
          return;
        }
        const currentCourse = coursesData[0];
        setCourse(currentCourse);

        // 2. Lấy thông tin Gia sư dạy lớp này và thông tin User tương ứng
        if (currentCourse.tutor_id) {
          const tutorRes = await fetch(`${API_BASE}/tutors?tutor_id=${currentCourse.tutor_id}`);
          const tutorsData = await tutorRes.json();
          
          if (tutorsData.length > 0 && isMounted) {
            const currentTutor = tutorsData[0];
            setTutorInfo(currentTutor);

            const userTutorRes = await fetch(`${API_BASE}/users?user_id=${currentTutor.user_id}`);
            const usersTutorData = await userTutorRes.json();
            if (usersTutorData.length > 0 && isMounted) {
              setUserTutor(usersTutorData[0]);
            }
          }
        }

        // 3. Lấy danh sách đánh giá (Reviews) của khóa học này
        const reviewsRes = await fetch(`${API_BASE}/reviews?course_id=${courseId}`);
        const reviewsData = await reviewsRes.json();
        if (isMounted) setCourseReviews(reviewsData);

        // 4. Tải danh mục users và students bổ trợ để hiển thị tên người đánh giá
        const [usersRes, studentsRes] = await Promise.all([
          fetch(`${API_BASE}/users`),
          fetch(`${API_BASE}/students`)
        ]);
        
        if (isMounted) {
          setAllUsers(await usersRes.json());
          setAllStudents(await studentsRes.json());

          // 5. Kiểm tra trạng thái Đăng nhập 
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
          
          const studentId = user?.user_id || user?.id;
          if (studentId && currentCourse.students?.includes(studentId)) {
            setIsBooked(true);
          }
        }

      } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Fetch API:", error);
      } finally {
        if (isMounted) setPageLoading(false);
      }
    };

    if (courseId) {
      fetchClassData();
    }

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // 🚀 Mở Modal xác nhận booking
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

    // Kiểm tra lớp đã đủ học viên chưa
    const currentStudents = course.students || [];
    if (currentStudents.length >= course.max_students) {
      alert("Lớp học đã đủ số lượng học viên!");
      return;
    }

    // Kiểm tra đã đăng ký chưa
    const studentId = currentUser.user_id || currentUser.id;
    if (currentStudents.includes(studentId)) {
      alert("Bạn đã đăng ký lớp học này rồi!");
      return;
    }

    // Hiển thị modal xác nhận
    setShowBookingModal(true);
  };

  // ✅ Xác nhận booking từ Modal
  const confirmBooking = async (notes, paymentMethod) => {
    setBookingLoading(true);
    const studentId = currentUser.user_id || currentUser.id;

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.course_id,
          studentId: studentId,
          tutorId: course.tutor_id,
          notes: notes,
          paymentMethod: paymentMethod
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsBooked(true);
        setCourse(prev => ({
          ...prev,
          students: [...(prev.students || []), studentId]
        }));
        setShowBookingModal(false);
        
        const paymentMsg = paymentMethod === 'wallet' 
          ? 'Thanh toán qua ví AuraTeach thành công!' 
          : 'Vui lòng hoàn tất chuyển khoản theo hướng dẫn trong email.';
        
        alert(`${result.message || "Đăng ký khóa học thành công!"}\n${paymentMsg}`);
        router.push('/lich-su-book');
      } else {
        alert(result.message || "Đăng ký thất bại, vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi liên kết API Booking:", error);
      alert("Đã xảy ra sự cố kết nối. Vui lòng thử lại sau.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (pageLoading) {
    return <div className={styles.container} style={{marginTop: "100px", textAlign: "center"}}>Đang tải thông tin lớp học từ Server...</div>;
  }

  if (!course) {
    return <div className={styles.container} style={{marginTop: "100px", textAlign: "center"}}>Không tìm thấy khóa học</div>;
  }

  const formatPrice = (priceStr) => {
    if (!priceStr) return '0';
    const cleanStr = typeof priceStr === 'string' ? priceStr : String(priceStr);
    return cleanStr.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const averageRating = courseReviews.length > 0 
    ? (courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length).toFixed(1)
    : tutorInfo?.rating || 4.8;

  return (
    <div className={styles.container} style={{marginTop: "80px"}}>

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
            <span>{course.students ? course.students.length : course.current_students || 0}/{course.max_students} học viên</span>
          </div>
          <div className={styles.tag}>
            <span className={styles.tagBadge}>✓ {course.flow || "Khóa học tiêu chuẩn"}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Left Column */}
        <div className={styles.mainContent}>
          {/* Introduction Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Giới thiệu chương trình hỗ trợ</h2>
            <div className={styles.description}>
              <p>{course.description}</p>
            </div>
          </section>

          {/* Reviews Section */}
          <section className={styles.section}>
            <div className={styles.reviewsHeader}>
              <h2 className={styles.sectionTitle}>Đánh giá từ phụ huynh & Học sinh</h2>
              <div className={styles.reviewsSummary}>
                <span className={styles.summaryRating}>{averageRating}</span>
                <span className={styles.summaryStars}>⭐⭐⭐⭐⭐</span>
                <span className={styles.summaryCount}>{courseReviews.length} Đánh giá</span>
              </div>
            </div>

            <div className={styles.reviewsList}>
              {courseReviews.length > 0 ? (
                courseReviews.map((review) => {
                  const student = allStudents.find(s => s.student_id === review.student_id);
                  const studentUser = allUsers.find(u => u.user_id === student?.user_id);
                  
                  return (
                    <div key={review.review_id} className={styles.reviewCard}>
                      <div className={styles.reviewAuthor}>
                        <span className={styles.reviewName}>
                          {studentUser?.full_name || "Học viên ẩn danh"}
                        </span>
                        <span className={styles.reviewRating}>
                          {'⭐'.repeat(review.rating)}
                        </span>
                      </div>
                      <p className={styles.reviewContent}>{review.comment}</p>
                    </div>
                  );
                })
              ) : (
                <p>Chưa có đánh giá nào cho khóa học này.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.priceCard}>
            <div className={styles.priceHeader}>
              <span className={styles.price}>
                {course.price_per_session || course.hourly_rate ? `${formatPrice(course.price_per_session || course.hourly_rate)}đ` : 'Liên hệ'}
              </span>
              {(course.price_per_session || course.hourly_rate) && (
                <span className={styles.priceUnit}>/giờ</span>
              )}
            </div>

            <div className={styles.priceDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>👥</span>
                <span>Sĩ số: {course.students ? course.students.length : course.current_students || 0}/{course.max_students} học viên</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>💻</span>
                <span>Nền tảng: {course.meeting_platform || "Google Meet"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>🔗</span>
                <span>Phòng học cố định</span>
              </div>
            </div>

            <button 
              onClick={handleBooking} 
              className={isBooked ? styles.bookedButton : styles.bookButton}
              disabled={bookingLoading || isBooked}
              style={isBooked ? { backgroundColor: '#6c757d', cursor: 'not-allowed' } : {}}
            >
              {bookingLoading ? "Đang xử lý..." : isBooked ? "Bạn đã đăng ký lớp này" : "Đăng ký học ngay"}
            </button>
            <button className={styles.consultButton}>Đặt lịch tư vấn miễn phí</button>
          </div>

          {/* Tutor Card */}
          <div className={styles.tutorCard}>
            <h3 className={styles.tutorCardTitle}>GIA SƯ HƯỚNG DẪN</h3>
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
                <p className={styles.tutorTitle}>{tutorInfo?.qualification}</p>
                <p className={styles.tutorDescription}>
                  {tutorInfo?.bio || "Gia sư giàu kinh nghiệm."}
                </p>
                <Link 
                  href={`/tutorList/${tutorInfo?.tutor_id}`} 
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
          course={course}
          tutorName={userTutor?.full_name || "Gia sư"}
          onClose={() => setShowBookingModal(false)}
          onConfirm={confirmBooking}
          loading={bookingLoading}
        />
      )}
    </div>
  );
}