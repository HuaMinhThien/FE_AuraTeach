"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './TutorDetail.module.css';

export default function TutorDetailPage({ params }) {
  const [tutorDetails, setTutorDetails] = useState(null);
  const [accountUser, setAccountUser] = useState(null);
  const [tutorCourses, setTutorCourses] = useState([]);
  const [tutorReviews, setTutorReviews] = useState([]);
  const [relatedTutorsList, setRelatedTutorsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTutorData = async () => {
      try {
        const resolvedParams = await params;
        const currentTutorId = resolvedParams?.id;
        if (!currentTutorId) return;

        // Fetch song song để tăng tốc độ load
        const [tutorRes, coursesRes, reviewsRes, allTutorsRes] = await Promise.all([
          fetch(`http://localhost:8000/api/tutors/${currentTutorId}`),
          fetch(`http://localhost:8000/api/courses?tutor_id=${currentTutorId}`),
          fetch(`http://localhost:8000/api/reviews?tutor_id=${currentTutorId}`),
          fetch(`http://localhost:8000/api/tutors`)
        ]);

        const tutorData = await tutorRes.json();
        const coursesData = await coursesRes.json();
        const reviewsData = await reviewsRes.json();
        const allTutorsData = await allTutorsRes.json();

        // Fetch thêm user (cần ID từ tutorData)
        const userRes = await fetch(`http://localhost:8000/api/users/${tutorData.user_id}`);
        const userData = await userRes.json();

        setTutorDetails(tutorData);
        setAccountUser(userData);
        setTutorCourses(coursesData);
        setTutorReviews(reviewsData);
        setRelatedTutorsList(allTutorsData.filter(t => String(t.tutor_id) !== String(currentTutorId)).slice(0, 4));
      } catch (error) {
        console.error("Lỗi:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTutorData();
  }, [params]);

  if (isLoading) return <div className={styles.loading}>Đang tải...</div>;
  if (!tutorDetails || !accountUser) return <div className={styles.error}>Không tìm thấy gia sư.</div>;

  return (
    <div className={styles.tutorProfilePage}>
      <div className={styles.mainLayout}>
        {/* CỘT TRÁI */}
        <div className={styles.leftColumn}>
          <div className={styles.headerCard}>
            <img src={accountUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} alt={accountUser.full_name} className={styles.avatar} />
            <div>
              <div className={styles.nameRow}>
                <h1 className={styles.tutorName}>{accountUser.full_name}</h1>
                <span className={styles.verifiedCheck}>✓</span>
              </div>
              <div className={styles.ratingMeta}>⭐ {tutorDetails.rating?.toFixed(1) || '4.5'} ({tutorReviews.length} đánh giá)</div>
              {/* Các Stat Box */}
              <div className={styles.statsContainer}>
                <div className={styles.statBox}><div className={styles.statValue}>120</div><div className={styles.statLabel}>Lượt tìm kiếm</div></div>
                <div className={styles.statBox}><div className={styles.statValue}>45</div><div className={styles.statLabel}>Lớp đã dạy</div></div>
                <div className={styles.statBox}><div className={styles.statValue}>{tutorCourses.length}</div><div className={styles.statLabel}>Khóa học</div></div>
              </div>
            </div>
          </div>

          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Giới thiệu</h2>
            <p className={styles.bioText}>{tutorDetails.bio}</p>
          </div>

          {/* Lớp học */}
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Lớp học hiện có</h2>
            <div className={styles.coursesGrid}>
              {tutorCourses.map(course => (
                <div key={course.course_id} className={styles.courseCard}>
                  <h3 className={styles.courseCardTitle}>{course.title}</h3>
                  <p className={styles.courseCardDesc}>{course.description}</p>
                  <div className={styles.courseCardFooter}>
                    <span className={styles.coursePrice}>{course.price_per_session}</span>
                    <button className={styles.registerBtn}>Đăng ký học</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Đánh giá */}
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Đánh giá từ học viên</h2>
            {tutorReviews.map(review => (
              <div key={review.review_id} className={styles.commentItem}>
                <div className={styles.studentName}>{review.student_name || "Học viên"}</div>
                <div className={styles.commentStars}>{"★".repeat(review.rating)}</div>
                <p className={styles.commentText}>“{review.comment}”</p>
              </div>
            ))}
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className={styles.rightColumn}>
          <div className={styles.contactBox}><button className={styles.callBtn}>📞 {accountUser.phone}</button></div>
          <div className={styles.infoBox}>
            <h3 className={styles.infoBoxTitle}>Thông tin hồ sơ</h3>
            <div className={styles.infoList}>
              <div><span>Kinh nghiệm:</span> <strong>{tutorDetails.Experience || 'N/A'}</strong></div>
              <div><span>Trình độ:</span> <strong>{tutorDetails.qualification}</strong></div>
            </div>
            <div className={styles.reportBtn}>⚠️ Báo cáo gia sư</div>
          </div>
          
          <div className={styles.relatedBox}>
            <h3 className={styles.relatedBoxTitle}>Gia sư liên quan</h3>
            {relatedTutorsList.map(tutor => (
              <div key={tutor.tutor_id} className={styles.relatedItem}>
                <div className={styles.relatedInfo}>
                  <h4 className={styles.relatedName}>{tutor.name || "Gia sư"}</h4>
                  <Link href={`/tutorList/${tutor.tutor_id}`} className={styles.viewBtn}>Xem</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}