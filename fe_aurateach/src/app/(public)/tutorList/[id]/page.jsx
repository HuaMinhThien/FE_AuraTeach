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
    const fetchData = async () => {
      try {
        const resolvedParams = await params;
        const currentTutorId = resolvedParams?.id;
        if (!currentTutorId) return;

        // Gọi API chi tiết gia sư, đánh giá, khóa học và API related mới
        const [tutorRes, reviewsRes, coursesRes, relatedRes] = await Promise.all([
          fetch(`http://localhost:8000/api/tutors/${currentTutorId}`),
          fetch(`http://localhost:8000/api/reviews?tutor_id=${currentTutorId}`),
          fetch(`http://localhost:8000/api/courses?tutor_id=${currentTutorId}`),
          fetch(`http://localhost:8000/api/tutors/${currentTutorId}/related`) // API mới
        ]);

        const tutorData = await tutorRes.json();
        const reviewsData = await reviewsRes.json();
        const coursesData = await coursesRes.json();
        const relatedData = await relatedRes.json();

        // Fetch user riêng biệt (dựa vào user_id từ tutorData)
        const userRes = await fetch(`http://localhost:8000/api/users/${tutorData.user_id}`);
        const userData = await userRes.json();

        // Set State
        setTutorDetails(tutorData);
        setAccountUser(userData);
        setTutorCourses(coursesData);
      console.log("Dữ liệu review thô:", reviewsData);
        setTutorReviews(reviewsData.map(r => ({ 
          ...r, 
          studentName: r.student_name || "Học viên ẩn danh" 
        })));

        // Xử lý dữ liệu related nhận về từ API
        console.log("Dữ liệu reviews đang có:", tutorReviews);
        const uniqueRelated = Array.from(new Map(relatedData.map(t => [t.tutor_id, t])).values());
        setRelatedTutorsList(
          uniqueRelated.map(t => ({
            id: t.tutor_id,
            name: t.full_name,
            avatar: t.avatar,
            subject: t.category_name || "Chưa có môn",
            rating: t.rating
          }))
        );

      } catch (err) {
        console.error("Lỗi fetch dữ liệu:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params]);


  if (isLoading) return <div style={{textAlign: 'center', marginTop: '100px'}}>Đang tải...</div>;
  if (!tutorDetails || !accountUser) return <div style={{textAlign: 'center', marginTop: '100px'}}>Không tìm thấy dữ liệu.</div>;

  // PHẦN DƯỚI ĐÂY LÀ JSX NGUYÊN BẢN CỦA BẠN (ĐÃ GIỮ NGUYÊN)
  return (
    <div className={styles.tutorProfilePage}>
      <div className={styles.mainLayout}>
        <div className={styles.leftColumn}>
          <div className={styles.headerCard}>
            <img 
              src={accountUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
              alt={accountUser.full_name} 
              className={styles.avatar} 
            />
            <div>
              <div className={styles.nameRow}>
                <h1 className={styles.tutorName}>{accountUser.full_name}</h1>
                <span className={styles.verifiedCheck}>✓</span>
              </div>
              <div className={styles.ratingMeta}>
                ⭐ {tutorDetails.rating ? tutorDetails.rating.toFixed(1) : '4.5'} 
                <span>({tutorReviews.length} đánh giá)</span>
              </div>
              <div className={styles.statsContainer}>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>120</div>
                  <div className={styles.statLabel}>Lượt tìm kiếm</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>45</div>
                  <div className={styles.statLabel}>Lớp đã dạy</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{tutorCourses.length}</div>
                  <div className={styles.statLabel}>Khóa học mở sẵn</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Giới thiệu</h2>
            <p className={styles.bioText}>{tutorDetails.bio || "Chưa có thông tin giới thiệu"}</p>
          </div>

          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Thành tích nổi bật</h2>
            <img 
              src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200" 
              alt="Chứng nhận thành tích gia sư" 
              className={styles.achievementImage} 
            />
            <div className={styles.achievementList}>
              <div>🏅 Giải nhất Olympic Tin học sinh viên 2022</div>
              <div>📜 Chứng chỉ Professional Software Engineer (PSE)</div>
              <div>👥 Founder của AuraTeach Community</div>
            </div>
          </div>

          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Lớp học hiện có</h2>
            {tutorCourses.length > 0 ? (
              <div className={styles.coursesGrid}>
                {tutorCourses.map((course) => (
                  <div key={course.course_id} className={styles.courseCard}>
                    <div>
                      <h3 className={styles.courseCardTitle}>{course.title}</h3>
                      <p className={styles.courseCardDesc}>{course.description}</p>
                    </div>
                    <div className={styles.courseCardFooter}>
                      <span className={styles.coursePrice}>
                        {course.price_per_session || 'Liên hệ'}
                      </span>
                      <button className={styles.registerBtn}>Đăng ký học</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
                Gia sư này chưa có khóa học nào.
              </p>
            )}
          </div>

          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Đánh giá từ học viên</h2>
            <div className={styles.ratingSummary}>
              <div style={{ textAlign: 'center' }}>
                <div className={styles.bigScore}>
                  {tutorDetails.rating ? tutorDetails.rating.toFixed(1) : '4.5'}
                </div>
                <div className={styles.starsRow}>⭐⭐⭐⭐⭐</div>
                <div className={styles.voteCount}>{tutorReviews.length} bình chọn</div>
              </div>
              <div className={styles.progressContainer}>
                <div className={styles.progressRow}>
                  <span>5 sao</span>
                  <div className={styles.progressBarTrack}><div className={styles.progressBarFill5}></div></div>
                </div>
                <div className={styles.progressRow}>
                  <span>4 sao</span>
                  <div className={styles.progressBarTrack}><div className={styles.progressBarFill4}></div></div>
                </div>
                <div className={styles.progressRow}>
                  <span>3 sao</span>
                  <div className={styles.progressBarTrack}></div>
                </div>
              </div>
            </div>

            {tutorReviews.length > 0 ? (
              <div className={styles.commentsList}>
                {tutorReviews.map((reviewItem) => (
                  <div key={reviewItem.review_id} className={styles.commentItem}>
                    <div className={styles.studentName}>{reviewItem.studentName}</div>
                    <div className={styles.commentStars}>
                      {"★".repeat(Math.min(reviewItem.rating || 0, 5))}
                    </div>
                    <p className={styles.commentText}>“{reviewItem.comment}”</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
                Chưa có đánh giá nào cho gia sư này.
              </p>
            )}
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.contactBox}>
            <button className={styles.callBtn}>
              📞 Gọi điện: {accountUser.phone || 'Chưa cập nhật'}
            </button>
          </div>

          <div className={styles.infoBox}>
            <h3 className={styles.infoBoxTitle}>Thông tin hồ sơ</h3>
            <div className={styles.infoList}>
              <div><span>Kinh nghiệm:</span> <strong>{tutorDetails.Experience || 'Chưa cập nhật'}</strong></div>
              <div><span>Trình độ:</span> <strong>{tutorDetails.qualification || 'Chưa cập nhật'}</strong></div>
              <div><span>Trạng thái:</span> <strong className={styles.statusActive}>{tutorDetails.verification_status || 'Đã xác minh'}</strong></div>
              <div className={styles.subjectsDivider}>
                <span className={styles.subjectsTitle}>Môn học giảng dạy:</span>
                <div className={styles.tagsContainer}>
                  <span className={styles.subjectTag}>Toán học</span>
                  <span className={styles.subjectTag}>Ngữ Văn</span>
                  <span className={styles.subjectTag}>Tiếng Anh</span>
                </div>
              </div>
            </div>
            <div className={styles.reportBtn}>⚠️ Báo cáo gia sư</div>
          </div>

          <div className={styles.relatedBox}>
            <h3 className={styles.relatedBoxTitle}>Gia sư liên quan</h3>
            {relatedTutorsList.length > 0 ? (
              <div className={styles.relatedList}>
                {relatedTutorsList.map((relatedTutor) => (
                  <div key={relatedTutor.id} className={styles.relatedItem}>
                    <img 
                      src={relatedTutor.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
                      alt={relatedTutor.name} 
                      className={styles.relatedAvatar} 
                    />
                    <div className={styles.relatedInfo}>
                      <h4 className={styles.relatedName}>{relatedTutor.name}</h4>
                      <p className={styles.relatedSub}>{relatedTutor.subject}</p>
                      <span className={styles.relatedStars}>⭐ {relatedTutor.rating ? relatedTutor.rating.toFixed(1) : '4.5'}</span>
                    </div>
                    <Link href={`/tutorList/${relatedTutor.id}`} className={styles.viewBtn}>Xem</Link>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
                Không có gia sư liên quan.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}