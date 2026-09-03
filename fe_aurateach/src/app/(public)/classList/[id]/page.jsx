// src/app/(public)/classList/[id]/page.jsx
"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ClassDetail.module.css";
import BookingModal from "@/components/users/BookingModal";
import Avatar from "@/components/common/Avatar";

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
      
      const subscriptions = 
        courseData.subscriptions || 
        courseObj?.subscriptions || 
        courseData.course_subscriptions ||
        courseObj?.course_subscriptions ||
        courseData.enrollments || 
        courseObj?.enrollments || 
        courseData.students ||
        courseObj?.students ||
        [];

      let isAlreadyBooked = false;

      // 💡 Bước A: Kiểm tra nhanh trong localStorage trước để tránh độ trễ API/Database
      if (studentId && courseId) {
        const localChecked = localStorage.getItem(`booked_${studentId}_${courseId}`);
        if (localChecked === 'true') {
          isAlreadyBooked = true;
        }
      }

      // Bước B: Nếu localStorage chưa có, tiến hành check sâu từ dữ liệu API trả về
      if (!isAlreadyBooked && studentId) {
        const stringUserId = String(studentId); // u-d4W7Kon9

        // 1. Kiểm tra trong danh sách subscriptions dựa vào cấu trúc dữ liệu thực tế vừa log
        const hasValidSubscription = subscriptions.some(sub => {
          if (!sub) return false;

          // Lấy user_id từ bên trong sub.student.user (nếu có) hoặc sub.student_id
          const subUserId = String(sub.student?.user?.user_id || sub.user_id || '');
          const subStatus = String(sub.status || '').toLowerCase();
          
          const validStatuses = ['paid', 'active', 'approved', 'success', 'completed', 'confirmed'];
          
          // Khớp nếu user_id của bản ghi trùng với user_id đang đăng nhập
          const isMatched = (subUserId === stringUserId);
          const isValidStatus = validStatuses.includes(subStatus);

          // Quan trọng: Status hợp lệ VÀ KHÔNG PHẢI cancelled
          return isMatched && isValidStatus && subStatus !== 'cancelled';
        });

        // 2. Kiểm tra trong mảng courseObj.students (nếu các phần tử cũng có dạng chứa student/user)
        const courseStudents = Array.isArray(courseObj.students) ? courseObj.students : [];
        const isInCourseStudents = courseStudents.some(stu => {
          if (!stu) return false;
          const sUserId = String(stu.user?.user_id || stu.user_id || '');
          return sUserId === stringUserId;
        });

        isAlreadyBooked = isInCourseStudents || hasValidSubscription;
        
        // Nếu API xác nhận đã đăng ký, đồng bộ ngược lại vào localStorage để cache
        if (isAlreadyBooked) {
          localStorage.setItem(`booked_${studentId}_${courseId}`, 'true');
        }
      }

      setIsBooked(isAlreadyBooked);

    } catch (error) {
      // Xử lý lỗi ngầm không làm gián đoạn trải nghiệm người dùng
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

    if (isBooked) {
      alert("Bạn đã đăng ký lớp học này rồi!");
      return;
    }

    const currentStudentsCount = course.current_students !== undefined 
      ? course.current_students 
      : (Array.isArray(course.students) ? course.students.length : 0);

    if (currentStudentsCount >= course.max_students) {
      alert("Lớp học đã đủ số lượng học viên!");
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

      const responseData = result.data || result;
      
      // 🔥 Ép buộc khóa nút và lưu cache ngay lập tức khi gửi request thành công
      // Trả về kết quả để BookingModal xử lý — KHÔNG set isBooked ở đây
      // isBooked chỉ được set true sau khi payment hoàn tất (handleBookingSuccess)
      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Đã xảy ra sự cố kết nối. Vui lòng thử lại sau."
      };
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBookingSuccess = async () => {
    setIsBooked(true);
    setShowBookingModal(false);
    
    // Lưu cache vào localStorage theo ID khóa học và ID user
    const studentId = currentUser?.user_id || currentUser?.id;
    if (courseId && studentId) {
      localStorage.setItem(`booked_${studentId}_${courseId}`, 'true');
    }

    if (course) {
      setCourse(prev => ({
        ...prev,
        current_students: (prev.current_students !== undefined ? prev.current_students : (prev.students?.length || 0)) + 1
      }));
    }
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

  // --- Logic tính toán học phí chênh lệch chu kỳ mùng 5 hằng tháng ---
  const calculateProratedFirstBill = (courseObj, pricePerSession) => {
    const courseStartDate = courseObj.start_date;
    const courseEndDate = courseObj.end_date;

    if (!courseStartDate || !courseEndDate || !pricePerSession) {
      return { 
        totalSessions: 0, totalCoursePrice: 0, calculatedMonths: 1, 
        firstMonthAmount: 0, firstMonthSessions: 0, nextBillingDateText: "05/09/2026",
        isCombined: false, joinDateText: "" 
      };
    }

    const dayMapping = {
      "Chủ Nhật": 0, "CN": 0, "Sunday": 0, "0": 0,
      "Thứ 2": 1, "Monday": 1, "1": 1,
      "Thứ 3": 2, "Tuesday": 2, "2": 2,
      "Thứ 4": 3, "Wednesday": 3, "3": 3,
      "Thứ 5": 4, "Thursday": 4, "4": 4,
      "Thứ 6": 5, "Friday": 5, "5": 5,
      "Thứ 7": 6, "Saturday": 6, "6": 6
    };

    let activeDaysOfWeek = [];
    const schedules = Array.isArray(courseObj.schedules) ? courseObj.schedules : [];
    if (schedules.length > 0) {
      schedules.forEach(s => {
        const val = s.day_of_week ?? s.days ?? s;
        if (dayMapping[val] !== undefined) activeDaysOfWeek.push(dayMapping[val]);
      });
    } else if (courseObj.schedule_days) {
      const daysArr = Array.isArray(courseObj.schedule_days) ? courseObj.schedule_days : String(courseObj.schedule_days).split(',').map(d => d.trim());
      daysArr.forEach(d => {
        if (dayMapping[d] !== undefined) activeDaysOfWeek.push(dayMapping[d]);
      });
    }
    activeDaysOfWeek = [...new Set(activeDaysOfWeek)];

    const parseLocalDate = (dateStr) => {
      if (!dateStr) return null;
      const cleanDateStr = String(dateStr).split('T')[0];
      const [year, month, day] = cleanDateStr.split('-').map(Number);
      if (!year || !month || !day) return new Date(dateStr);
      return new Date(year, month - 1, day, 0, 0, 0);
    };

    let start = parseLocalDate(courseStartDate);
    let end = parseLocalDate(courseEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || activeDaysOfWeek.length === 0) {
      return { totalSessions: 0, totalCoursePrice: 0, calculatedMonths: 1, firstMonthAmount: 0, firstMonthSessions: 0 };
    }

    const countSessionsInRange = (fromDate, toDate) => {
      let count = 0;
      let curr = new Date(fromDate);
      let limit = new Date(toDate);
      while (curr <= limit) {
        if (activeDaysOfWeek.includes(curr.getDay())) {
          count++;
        }
        curr.setDate(curr.getDate() + 1);
      }
      return count;
    };

    let totalSessions = countSessionsInRange(start, end);
    if (totalSessions > 36) {
      totalSessions = 36;
    }
    
    const totalCoursePrice = totalSessions * pricePerSession;

    let joinDate = new Date(start);
    let d = joinDate.getDate();
    let m = joinDate.getMonth();
    let y = joinDate.getFullYear();

    let nextBillingDate;
    let isCombined = false;

    if (d >= 1 && d <= 4) {
      nextBillingDate = new Date(y, m + 1, 5);
      isCombined = true;
    } else {
      nextBillingDate = new Date(y, m + 1, 5);
    }

    if (nextBillingDate > end) {
      nextBillingDate = new Date(end);
    }

    let firstPeriodSessions = countSessionsInRange(joinDate, nextBillingDate);
    if (firstPeriodSessions > totalSessions) firstPeriodSessions = totalSessions;
    
    let firstMonthAmount = firstPeriodSessions * pricePerSession;
    let calculatedMonths = Math.max(1, Math.round(totalSessions / 8)); 

    return {
      totalSessions,
      totalCoursePrice,
      calculatedMonths,
      firstMonthAmount,
      firstMonthSessions: firstPeriodSessions,
      nextBillingDateText: nextBillingDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      isCombined,
      joinDateText: joinDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
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

  const firstSchedule = schedulesList.length > 0 ? schedulesList[0] : {};
  const displayTimeSlot = firstSchedule.time_slot || course.time_slot || "Chưa cập nhật";
  const displayStartDate = firstSchedule.start_time || firstSchedule.start_date || course.start_date;
  const displayEndDate = firstSchedule.end_time || firstSchedule.end_date || course.end_date;
  const roomUrl = firstSchedule.meeting_platform || firstSchedule.room_url || course.permanent_room_url;

  const pricePerSessionVal = course.price_per_session || 0;
  const billingData = calculateProratedFirstBill(course, pricePerSessionVal);

  const totalSessions = billingData.totalSessions > 0 ? billingData.totalSessions : 1;
  const totalCoursePrice = billingData.totalCoursePrice > 0 ? billingData.totalCoursePrice : (pricePerSessionVal * totalSessions);
  
  const currentMonthPrice = billingData.firstMonthAmount > 0 ? billingData.firstMonthAmount : totalCoursePrice;
  const currentMonthSessions = billingData.firstMonthSessions > 0 ? billingData.firstMonthSessions : totalSessions;

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
      return isBooked;
    }
    return false;
  };

  const hasMeetLink = roomUrl && roomUrl.trim() !== "";
  const showMeetLink = canViewMeetLink() && hasMeetLink;

  const currentStudentsCount = course.current_students !== undefined 
    ? course.current_students 
    : (Array.isArray(course.students) ? course.students.length : 0);
  const isFull = currentStudentsCount >= course.max_students;

  return (
    <div className={styles.container} style={{marginTop: "80px"}}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Trang chủ</Link>
        <span className={styles.separator}>›</span>
        <Link href="/classList">Danh sách lớp học</Link>
        <span className={styles.separator}>›</span>
        <span className={styles.current}>{course.title}</span>
      </nav>

      <div className={styles.thumbnailWrapper}>
        <img 
          src={course.thumbnail || "/img/default-class-1.jpg"} 
          alt={course.title}
          className={styles.thumbnail}
        />
      </div>

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
            <span className={`${styles.tagBadge} ${course.status === 'active' ? styles.statusActive : styles.statusClosed}`}>
              {course.status === 'active' ? 'Đang mở' : 'Đã đóng'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainContent}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Giới thiệu chương trình</h2>
            <div className={styles.description}>
              <p>{course.description}</p>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Thông tin chi tiết</h2>
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
                <span className={styles.detailValue}>{totalSessions} buổi thực tế</span>
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
                    <span className={styles.meetLocked}>Chỉ học viên đã đăng ký mới xem được link</span>
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

          <section className={styles.section}>
            <div className={styles.reviewsHeader}>
              <h2 className={styles.sectionTitle}>Đánh giá từ học viên</h2>
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

        <div className={styles.sidebar}>
          <div className={styles.priceCard}>
            <div className={styles.priceHeader}>
              <span className={styles.price}>
                {course.price_per_session ? `${formatPrice(currentMonthPrice)}đ` : 'Liên hệ'}
              </span>
              {course.price_per_session && <span className={styles.priceUnit}>/ kỳ đầu ({currentMonthSessions} buổi)</span>}
            </div>

            {course.price_per_session && (
              <div style={{ 
                background: "#f8f9fa", 
                border: "1px solid #e9ecef", 
                borderRadius: "8px", 
                padding: "12px", 
                fontSize: "13px", 
                color: "#495057", 
                marginBottom: "15px",
                textAlign: "left"
              }}>
                <div style={{ fontWeight: "600", color: "#2b32b2", marginBottom: "6px" }}>
                  💡 Lịch đóng học phí & Gia hạn:
                </div>
                <div style={{ marginBottom: "4px" }}>
                  • <strong>Kỳ thanh toán đầu:</strong> {currentMonthSessions} buổi từ ngày {billingData.joinDateText}.
                </div>
                <div style={{ marginBottom: "4px" }}>
                  • <strong>Ngày gia hạn tiếp theo:</strong> <span>{billingData.nextBillingDateText}</span> (Mùng 5 hàng tháng).
                </div>
                {billingData.isCombined && (
                  <div style={{ color: "#d97706", fontStyle: "italic", fontSize: "12px", marginTop: "4px" }}>
                    *(Do đăng ký gần đầu tháng, hệ thống đã tối ưu gộp chi phí để tránh việc bạn phải đóng tiền 2 lần sát nhau).*
                  </div>
                )}
                <div style={{ borderTop: "1px dashed #dee2e6", marginTop: "8px", paddingTop: "6px", color: "#6c757d" }}>
                  Tổng học phí toàn khóa ({totalSessions} buổi): <strong>{formatPrice(totalCoursePrice)}đ</strong>
                </div>
              </div>
            )}

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
                <span>{totalSessions} buổi học thực tế</span>
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
               isBooked ? "Đã đăng ký khóa học" : 
               isFull ? "Lớp đã đủ học viên" :
               course.status !== 'active' ? "Lớp đã đóng" : 
               "Đăng ký học ngay"}
            </button>
          </div>

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
                <p className={styles.tutorTitle}>{tutorInfo?.expertise || "Gia sư chuyên môn"}</p>
                <p className={styles.tutorDescription}>
                  {tutorInfo?.bio || "Gia sư giàu kinh nghiệm giảng dạy."}
                </p>
                <div className={styles.tutorExtra}>
                  <span>{tutorInfo?.rating || 5.0}/5</span>
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

      {showBookingModal && (
        <BookingModal 
          course={{
            ...course,
            totalSessions: totalSessions,            
            firstMonthSessions: currentMonthSessions,   
            calculatedTotalPrice: currentMonthPrice,    
          }}
          tutorName={tutorInfo?.full_name || userTutor?.full_name}
          onClose={() => {
            // Nếu đóng modal mà chưa thanh toán thành công, xóa cache để tránh hiển thị sai
            if (!isBooked) {
              const studentId = currentUser?.user_id || currentUser?.id;
              if (studentId && courseId) {
                localStorage.removeItem(`booked_${studentId}_${courseId}`);
              }
            }
            setShowBookingModal(false);
          }}
          onConfirm={confirmBooking}
          onSuccess={handleBookingSuccess}
          loading={bookingLoading}
        />
      )}
    </div>
  );
}