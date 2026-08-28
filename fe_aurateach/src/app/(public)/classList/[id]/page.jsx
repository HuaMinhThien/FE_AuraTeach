// src/app/(public)/classList/[id]/page.jsx
"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./ClassDetail.module.css";
import authService from "@/services/authService";
import BookingModal from "@/components/users/BookingModal";
import Avatar from "@/components/common/Avatar";
import { getClassroomRoomPath } from "@/utils/roomUtils";

export default function ClassDetailPage({ params }) {
  const router = useRouter();
  
  const { id } = use(params);
  const courseId = id;

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]); // Các mã lớp (section) của course này
  const [tutorInfo, setTutorInfo] = useState(null);
  const [userTutor, setUserTutor] = useState(null);
  const [courseReviews, setCourseReviews] = useState([]);
  const [allUsers, setAllUsers] = useState([]); 
  const [allStudents, setAllStudents] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const [isBooked, setIsBooked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const API_BASE = "http://localhost:3007";

  useEffect(() => {
    let isMounted = true;

    const fetchClassData = async () => {
      try {
        setPageLoading(true);

        const courseRes = await fetch(`${API_BASE}/courses?course_id=${courseId}`);
        const coursesData = await courseRes.json();
        
        if (!isMounted) return;

        if (!coursesData || coursesData.length === 0) {
          setCourse(null);
          setPageLoading(false);
          return;
        }
const currentCourse = coursesData[0];

        // ✅ Lớp do Admin tạo (pending_tutor) vẫn cho phép xem chi tiết,
        // nhưng nút đăng ký chỉ khả dụng khi lớp ở trạng thái active.
        //
        // ✅ Lớp riêng tư do student tạo (createSchedule) chỉ hiển thị cho:
        //   - Đúng học viên tạo ra lớp đó
        //   - Gia sư được giao dạy lớp đó
        //   - Admin
        const userNow = await authService.getCurrentUser();
        const isPrivateStudentClass = currentCourse.created_by && currentCourse.created_by.startsWith('student');
        if (isPrivateStudentClass) {
          const ownerId = currentCourse.created_by.replace('student_', '');
          const studentId = userNow?.user_id || userNow?.id;
          const isOwner = studentId && studentId === ownerId;
          const isAssignedTutor = userNow?.role === 'tutor' && currentCourse.tutor_id;
          const isAdmin = userNow?.role === 'admin';
          if (!isOwner && !isAdmin && !(isAssignedTutor)) {
            setCourse(null);
            setPageLoading(false);
            return;
          }
        }

        setCourse(currentCourse);

        // ✅ Tìm các mã lớp (section) cùng khóa học (parent_course_id)
        if (currentCourse.parent_course_id) {
          const sectionsRes = await fetch(`${API_BASE}/courses?parent_course_id=${currentCourse.parent_course_id}`);
          const sectionsData = await sectionsRes.json();
          // Lấy thông tin tutor cho từng section
          const tutorsRes = await fetch(`${API_BASE}/tutors`);
          const tutorsAll = await tutorsRes.json();
          const usersRes = await fetch(`${API_BASE}/users`);
          const usersAll = await usersRes.json();

          const sectionsWithTutor = sectionsData.map(sec => {
            const t = tutorsAll.find(tu => tu.tutor_id === sec.tutor_id);
            const u = t ? usersAll.find(us => us.user_id === t.user_id) : null;
            return {
              ...sec,
              tutor_name: u ? u.full_name : (sec.tutor_id ? 'Đang tải...' : 'Chưa có gia sư'),
              tutor_avatar: u ? u.avatar : null
            };
          });
          setSections(sectionsWithTutor);
        } else {
          setSections([{
            ...currentCourse,
            tutor_name: 'Đang tải...',
            tutor_avatar: null
          }]);
        }

        const categoriesRes = await fetch(`${API_BASE}/categories`);
        const categoriesData = await categoriesRes.json();
        if (isMounted) setAllCategories(categoriesData);

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

        const reviewsRes = await fetch(`${API_BASE}/reviews?course_id=${courseId}`);
        const reviewsData = await reviewsRes.json();
        if (isMounted) setCourseReviews(reviewsData);

        const [usersRes, studentsRes] = await Promise.all([
          fetch(`${API_BASE}/users`),
          fetch(`${API_BASE}/students`)
        ]);
        
        if (isMounted) {
          setAllUsers(await usersRes.json());
          setAllStudents(await studentsRes.json());

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

    // ✅ Yêu cầu lớp phải đã có tutor nhận mới được đăng ký/thanh toán.
    if (!course.tutor_id) {
      alert("⏳ Lớp này đang chờ gia sư nhận dạy. Bạn chưa thể đăng ký lúc này.");
      return;
    }

const currentStudents = course.students || [];
    if (currentStudents.length >= course.max_students) {
      alert("Lớp học đã đủ số lượng học viên!");
      return;
    }

    const studentId = currentUser.user_id || currentUser.id;
    if (currentStudents.includes(studentId)) {
      alert("Bạn đã đăng ký lớp học này rồi!");
      return;
    }

    setShowBookingModal(true);
  };

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
        // ✅ Trả về data để tiếp tục xử lý thanh toán
        return {
          success: true,
          data: result.data
        };
      } else {
        // ✅ Hiển thị lỗi chi tiết
        alert(result.message || "Đăng ký thất bại, vui lòng thử lại.");
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      console.error("Lỗi liên kết API Booking:", error);
      alert("Đã xảy ra sự cố kết nối. Vui lòng thử lại sau.");
      return {
        success: false,
        message: error.message
      };
    } finally {
      setBookingLoading(false);
    }
  };

  // ✅ Xử lý khi booking thành công (sau khi thanh toán)
  const handleBookingSuccess = () => {
    setIsBooked(true);
    setCourse(prev => ({
      ...prev,
      students: [...(prev.students || []), currentUser.user_id || currentUser.id]
    }));
    setShowBookingModal(false);
  };

  const handleJoinClass = () => {
    if (course) {
      const roomPath = getClassroomRoomPath(course, currentUser?.role === "tutor" ? "tutor" : "student");
      window.open(roomPath, '_blank');
    } else {
      alert("Lớp học chưa có link phòng học. Vui lòng liên hệ gia sư để được hỗ trợ.");
    }
  };

  const getCategoryName = (categoryId) => {
    const category = allCategories.find(c => c.category_id === categoryId);
    return category ? category.category_name : "Chưa phân loại";
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

  const averageRating = courseReviews.length > 0 
    ? (courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length).toFixed(1)
    : tutorInfo?.rating || 4.8;

  // Kiểm tra quyền vào phòng học
  const canViewMeetLink = () => {
    if (!currentUser) return false;
    
    if (currentUser.role === 'tutor') return true;
    
    if (currentUser.role === 'student') {
      const studentId = currentUser.user_id || currentUser.id;
      return isBooked || (course?.students && course.students.includes(studentId));
    }
    
    return false;
  };

  // AuraTeach luôn có room nội bộ dựa trên course
  const hasMeetLink = !!course;
  const showMeetLink = canViewMeetLink() && hasMeetLink;
  const roomPath = course ? getClassroomRoomPath(course, currentUser?.role === "tutor" ? "tutor" : "student") : "";

  if (pageLoading) {
    return <div className={styles.container} style={{marginTop: "100px", textAlign: "center"}}>Đang tải thông tin lớp học từ Server...</div>;
  }

  if (!course) {
    return <div className={styles.container} style={{marginTop: "100px", textAlign: "center"}}>Không tìm thấy khóa học</div>;
  }

  const currentStudentsCount = course.students ? course.students.length : 0;
  const isFull = currentStudentsCount >= course.max_students;

  // ✅ Lớp được coi là "Đang mở" khi thuộc một trong các trạng thái hoạt động:
  //   - active: đủ điều kiện, học viên có thể đăng ký
  //   - pending_student: đã có tutor nhận, chờ học viên đăng ký
  //   - pending_tutor: do Admin tạo, đang chờ Tutor nhận
  // Chỉ các trạng thái cancelled / completed / closed mới thực sự là "Đã đóng".
  const isClassOpen = ['active', 'pending_student', 'pending_tutor'].includes(course.status);

// ✅ Lớp "có thể đăng ký" (canBook) phải ĐÃ CÓ TUTOR NHẬN DẠY.
  // Luồng: Admin tạo lớp (pending_tutor, chưa có tutor) → Tutor nhận lớp
  // (pending_student có tutor_id) → Học sinh mới có thể đăng ký.
  // Lớp chưa có tutor nhận (pending_tutor) sẽ không đăng ký được.
  const canBook = course.tutor_id && ['active', 'pending_student'].includes(course.status);

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
            <img src="/img/icons/star.png" alt="star" className={styles.starIcon} />
            <span className={styles.ratingValue}>{averageRating}</span>
            <span className={styles.reviews}>({courseReviews.length} đánh giá)</span>
          </div>
          <div className={styles.students}>
            <span><img src="/img/icons/group.png" alt="học viên" className={styles.studentsIcon} /> {currentStudentsCount}/{course.max_students} học viên</span>
          </div>
          <div className={styles.tag}>
            <span className={styles.tagBadge}>📚 {getCategoryName(course.category_id)}</span>
          </div>
<div className={styles.tag}>
            <span className={`${styles.tagBadge} ${isClassOpen ? styles.statusActive : styles.statusClosed}`}>
              {isClassOpen ? '🟢 Đang mở' : '🔴 Đã đóng'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Left Column */}
        <div className={styles.mainContent}>
          {/* Introduction Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>📖 Giới thiệu chương trình</h2>
            <div className={styles.description}>
              <p>{course.description}</p>
            </div>
          </section>

          {/* ✅ LIST CÁC MÃ LỚP (SECTIONS) */}
          {sections.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>📋 Danh sách các mã lớp đang mở</h2>
              <div className={styles.sectionsList}>
                {sections.map((sec) => {
                  const secStudentsCount = sec.students ? sec.students.length : 0;
                  const isSecFull = secStudentsCount >= sec.max_students;
                  const isCurrentSec = sec.course_id === course.course_id;

                  return (
                    <div 
                      key={sec.course_id} 
                      className={`${styles.sectionItem} ${isCurrentSec ? styles.activeSection : ''}`}
                    >
                      <div className={styles.sectionInfo}>
                        <div className={styles.sectionMain}>
                          <span className={styles.sectionCode}>MÃ LỚP: {sec.course_id.split('_').pop().toUpperCase()}</span>
                          <span className={styles.sectionTutor}> GV: {sec.tutor_name}</span>
                        </div>
                        <div className={styles.sectionStats}>
                          <span className={`${styles.sectionSlots} ${isSecFull ? styles.slotsFull : ''}`}>
                            👥 Còn {sec.max_students - secStudentsCount}/{sec.max_students} chỗ
                          </span>
                        </div>
                      </div>
                      
                      {!isCurrentSec ? (
                        <button 
                          className={styles.viewSecBtn}
                          onClick={() => router.push(`/classList/${sec.course_id}`)}
                        >
                          Xem lớp này
                        </button>
                      ) : (
                        <span className={styles.currentLabel}>Đang xem</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Course Details Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}> Thông tin chi tiết</h2>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Mã lớp</span>
                <span className={styles.detailValue}>{course.course_id}</span>
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
                  {course.price_per_session ? `${formatPrice(course.price_per_session)}đ/Buổi` : 'Liên hệ'}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Số buổi</span>
                <span className={styles.detailValue}>{course.total_weeks || 0} buổi</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Thời gian học</span>
                <span className={styles.detailValue}>{course.time_slot || "Chưa cập nhật"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Lịch học</span>
                <span className={styles.detailValue}>{course.schedule_days?.join(", ") || "Chưa cập nhật"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Ngày bắt đầu</span>
                <span className={styles.detailValue}>{formatDate(course.start_date)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Ngày kết thúc</span>
                <span className={styles.detailValue}>{formatDate(course.end_date)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Sĩ số</span>
                <span className={styles.detailValue}>{currentStudentsCount}/{course.max_students} học viên</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Phòng học</span>
                <span className={styles.detailValue}>
                  {showMeetLink ? (
                    <a 
                      href={roomPath}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.meetLink}
                    >
                       Phòng học AuraTeach
                    </a>
                  ) : hasMeetLink ? (
                    <span className={styles.meetLocked}> Chỉ học viên đã đăng ký mới vào được phòng học</span>
                  ) : (
                    "Chưa cập nhật"
                  )}
                </span>
              </div>
<div className={styles.detailItem}>
                <span className={styles.detailLabel}>Trạng thái</span>
                <span className={`${styles.detailValue} ${isClassOpen ? styles.statusActive : styles.statusClosed}`}>
                  {isClassOpen ? 'Đang mở' : 'Đã đóng'}
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
                {course.price_per_session ? `${formatPrice(course.price_per_session)}đ` : 'Liên hệ'}
              </span>
              {course.price_per_session && (
                <span className={styles.priceUnit}>/Buổi</span>
              )}
            </div>

            <div className={styles.priceDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>👥</span>
                <span>Sĩ số: {currentStudentsCount}/{course.max_students} học viên</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📅</span>
                <span>{course.schedule_days?.join(", ")}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>⏰</span>
                <span>{course.time_slot}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📚</span>
                <span>{course.total_weeks || 0} buổi học</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>🔗</span>
                <span>
                  {showMeetLink ? (
                    <a 
                      href={roomPath}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.meetLink}
                    >
                      Phòng học AuraTeach
                    </a>
                  ) : hasMeetLink ? (
                    <span className={styles.meetLocked}>🔒 Chỉ học viên đã đăng ký</span>
                  ) : (
                    "Chưa có link"
                  )}
                </span>
              </div>
            </div>

            {/* Nút tham gia lớp học - chỉ hiển thị khi đã đăng ký và có link meet */}
            {showMeetLink && course.status === 'active' && (
              <button 
                onClick={handleJoinClass} 
                className={styles.joinButton}
              >
                🎯 Tham gia lớp học
              </button>
            )}

{/* Nút đăng ký */}
            <button 
              onClick={handleBooking} 
              className={isBooked || isFull || !isClassOpen || !canBook ? styles.bookedButton : styles.bookButton}
              disabled={bookingLoading || isBooked || isFull || !isClassOpen || !canBook}
            >
{bookingLoading ? "Đang xử lý..." : 
               isBooked ? "✅ Bạn đã đăng ký" : 
               isFull ? "🔴 Lớp đã đủ học viên" :
               !isClassOpen ? "🔴 Lớp đã đóng" :
               !canBook ? "⏳ Đang chờ gia sư nhận lớp" : 
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
                <p className={styles.tutorTitle}>{tutorInfo?.qualification}</p>
                <p className={styles.tutorDescription}>
                  {tutorInfo?.bio || "Gia sư giàu kinh nghiệm."}
                </p>
                <div className={styles.tutorExtra}>
                  <span>⭐ {tutorInfo?.rating || 0}/5</span>
                  <span className={styles.tutorDivider}>•</span>
                  <span>{tutorInfo?.Experience || "Chưa cập nhật"}</span>
                </div>
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
          onSuccess={handleBookingSuccess}
          loading={bookingLoading}
        />
      )}
    </div>
  );
}