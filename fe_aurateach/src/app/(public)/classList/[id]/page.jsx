"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import styles from "./ClassDetail.module.css";

// Import dữ liệu thật
import rawData from "../../../api/data.json"; // Điều chỉnh đường dẫn nếu cần

const data = rawData;

export default function ClassDetailPage({ params }) {
  // ✅ Unwrap params bằng React.use()
  const { id } = use(params);
  const courseId = id;
  
  const course = data.courses.find(c => c.course_id === courseId);
  
  // Tìm tutor tương ứng
  const tutorInfo = data.tutors.find(t => t.tutor_id === course?.tutor_id);
  const userTutor = data.users.find(u => u.user_id === tutorInfo?.user_id);

  // Lấy reviews của course này
  const courseReviews = data.reviews.filter(r => r.course_id === courseId);

  const [isBooked, setIsBooked] = useState(false);

  if (!course) {
    return <div className={styles.container}>Không tìm thấy khóa học</div>;
  }

  // Sửa hàm formatPrice để xử lý trường hợp undefined/null
  const formatPrice = (priceStr) => {
    // Kiểm tra nếu priceStr là undefined, null hoặc không phải string
    if (!priceStr || typeof priceStr !== 'string') {
      return '0';
    }
    // Xử lý chuỗi kiểu "150.000đ/giờ"
    return priceStr.replace(/[^0-9]/g, '');
  };

  const handleBooking = () => {
    setIsBooked(true);
    alert("Đăng ký hỗ trợ thành công!");
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
            <span>{course.current_students}/{course.max_students} học viên</span>
          </div>
          <div className={styles.tag}>
            <span className={styles.tagBadge}>✓ {course.flow}</span>
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

          {/* Topics / Flow Section
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Nội dung hướng dẫn & Hỗ trợ</h2>
            <div className={styles.topicItem}>
              <div className={styles.topicHeader}>
                <h3 className={styles.topicTitle}>{course.flow}</h3>
              </div>
            </div>
          </section> */}

          {/* Reviews Section */}
          <section className={styles.section}>
            <div className={styles.reviewsHeader}>
              <h2 className={styles.sectionTitle}>
                Đánh giá từ phụ huynh & Học sinh
              </h2>
              <div className={styles.reviewsSummary}>
                <span className={styles.summaryRating}>{averageRating}</span>
                <span className={styles.summaryStars}>⭐⭐⭐⭐⭐</span>
                <span className={styles.summaryCount}>
                  {courseReviews.length} Đánh giá
                </span>
              </div>
            </div>

            <div className={styles.reviewsList}>
              {courseReviews.length > 0 ? (
                courseReviews.map((review) => {
                  const student = data.students.find(s => s.student_id === review.student_id);
                  const studentUser = data.users.find(u => u.user_id === student?.user_id);
                  
                  return (
                    <div key={review.review_id} className={styles.reviewCard}>
                      <div className={styles.reviewAuthor}>
                        <span className={styles.reviewName}>
                          {studentUser?.full_name || "Học viên"}
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
                {course.price_per_session ? formatPrice(course.price_per_session) : 'Liên hệ'}
              </span>
              {course.price_per_session && (
                <span className={styles.priceUnit}>/giờ</span>
              )}
            </div>

            <div className={styles.priceDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>👥</span>
                <span>Sĩ số: {course.current_students}/{course.max_students} học viên</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>💻</span>
                <span>Nền tảng: {course.meeting_platform}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>🔗</span>
                <span>Phòng học cố định</span>
              </div>
            </div>

            <button onClick={handleBooking} className={styles.bookButton}>
              Đăng ký học ngay
            </button>
            <button className={styles.consultButton}>
              Đặt lịch tư vấn miễn phí
            </button>
          </div>

          {/* Tutor Card */}
          <div className={styles.tutorCard}>
            <h3 className={styles.tutorCardTitle}>GIA SƯ HƯỚNG DẪN</h3>
            <div className={styles.tutorInfo}>
              <div className={styles.tutorAvatar}>
                {userTutor?.avatar ? (
                  <img 
                    src={userTutor.avatar} 
                    alt={userTutor.full_name}
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {userTutor?.full_name?.charAt(0) || 'T'}
                  </div>
                )}
              </div>
              <div className={styles.tutorDetails}>
                <h4 className={styles.tutorName}>{userTutor?.full_name}</h4>
                <p className={styles.tutorTitle}>{tutorInfo?.qualification}</p>
                <p className={styles.tutorDescription}>
                  {tutorInfo?.bio || "Gia sư giàu kinh nghiệm."}
                </p>
                <Link 
                  href={`/tutor/${tutorInfo?.tutor_id}`} 
                  className={styles.tutorProfileLink}
                >
                  Xem hồ sơ chi tiết →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}