"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// Import file CSS Module
import styles from './TutorDetail.module.css';

export default function TutorDetailPage({ params }) {
  const [tutorDetails, setTutorDetails] = useState(null);
  const [accountUser, setAccountUser] = useState(null);
  const [tutorCourses, setTutorCourses] = useState([]);
  const [tutorReviews, setTutorReviews] = useState([]);
  const [relatedTutorsList, setRelatedTutorsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllTutorData = async () => {
      try {
        // 🌟 FIX LỖI URL: Unbox (giải nén) params vì params trong Next.js App Router là một Promise
        const resolvedParams = await params;
        const currentTutorId = resolvedParams?.id;

        if (!currentTutorId) {
          console.error("Không tìm thấy thuộc tính ID trên URL path.");
          setIsLoading(false);
          return;
        }

        // 1. Gọi đồng thời tất cả các bảng dữ liệu liên quan từ JSON Server
        const [
          responseTutors, 
          responseUsers, 
          responseCourses, 
          responseReviews, 
          responseStudents
        ] = await Promise.all([
          fetch('http://localhost:3007/tutors'),
          fetch('http://localhost:3007/users'),
          fetch('http://localhost:3007/courses'),
          fetch('http://localhost:3007/reviews'),
          fetch('http://localhost:3007/students')
        ]);

        const totalTutorsArray = await responseTutors.json();
        const totalUsersArray = await responseUsers.json();
        const totalCoursesArray = await responseCourses.json();
        const totalReviewsArray = await responseReviews.json();
        const totalStudentsArray = await responseStudents.json();

        // 2. Tìm thông tin chi tiết của Gia sư hiện tại đang hiển thị trên URL
        const matchedTutor = totalTutorsArray.find(
          (singleTutor) => singleTutor.tutor_id === currentTutorId
        );
        if (!matchedTutor) throw new Error("Không khớp dữ liệu ID gia sư trong hệ thống");

        // 3. Tìm thông tin tài khoản cá nhân (họ tên, avatar, số điện thoại) của gia sư đó
        const matchedUser = totalUsersArray.find(
          (singleUser) => singleUser.user_id === matchedTutor.user_id
        );
        
        // 4. Lọc toàn bộ danh sách các khóa học được mở bởi riêng gia sư này
        const filteredTutorCourses = totalCoursesArray.filter(
          (singleCourse) => singleCourse.tutor_id === currentTutorId
        );
        
        // 5. Lọc và ánh xạ (map) danh sách đánh giá của học viên dành cho gia sư này
        const tutorCourseIdsArray = filteredTutorCourses.map((course) => course.course_id);
        const rawMatchedReviews = totalReviewsArray.filter((review) => 
          tutorCourseIdsArray.includes(review.course_id)
        );

        const formattedReviews = rawMatchedReviews.map((singleReview) => {
          // Tìm thực thể học viên gửi đánh giá
          const matchedStudent = totalStudentsArray.find(
            (student) => student.student_id === singleReview.student_id
          ) || {};
          // Truy vết ra họ tên của học viên từ bảng users công khai
          const studentUserInfo = totalUsersArray.find(
            (user) => user.user_id === matchedStudent.user_id
          ) || {};

          return { 
            ...singleReview, 
            studentName: studentUserInfo.full_name || "Học viên ẩn danh" 
          };
        });

        // 6. Lọc danh sách "Gia sư liên quan" (Bỏ gia sư hiện tại ra khỏi danh sách gợi ý)
        const specificRelatedTutors = totalTutorsArray
          .filter((tutor) => tutor.tutor_id !== currentTutorId)
          .slice(0, 4)
          .map((otherTutor) => {
            const otherTutorUser = totalUsersArray.find(
              (user) => user.user_id === otherTutor.user_id
            ) || {};
            const otherTutorCourse = totalCoursesArray.find(
              (course) => course.tutor_id === otherTutor.tutor_id
            ) || {};

            return {
              id: otherTutor.tutor_id,
              name: otherTutorUser.full_name,
              avatar: otherTutorUser.avatar,
              subject: otherTutorCourse.title || "Gia sư AuraTeach",
              rating: otherTutor.rating
            };
          });

        // Cập nhật toàn bộ trạng thái State với tên biến rõ ràng
        setTutorDetails(matchedTutor);
        setAccountUser(matchedUser);
        setTutorCourses(filteredTutorCourses);
        setTutorReviews(formattedReviews);
        setRelatedTutorsList(specificRelatedTutors);

      } catch (error) {
        console.error("Xảy ra lỗi trong quá trình lấy chi tiết hồ sơ gia sư:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTutorData();
  }, [params]);

  if (isLoading) return <div style={{ textAlign: 'center', padding: '100px' }}>Đang tải thông tin hồ sơ gia sư từ hệ thống...</div>;
  if (!tutorDetails || !accountUser) return <div style={{ textAlign: 'center', padding: '100px' }}>Không tìm thấy thông tin gia sư theo mã yêu cầu.</div>;

  return (
    <div className={styles.tutorProfilePage}>
      <div className={styles.mainLayout}>
        
        {/* ================= CỘT BÊN TRÁI: THÔNG TIN CHI TIẾT GIA SƯ ================= */}
        <div className={styles.leftColumn}>
          
          {/* 1. Thẻ thông tin chung đầu trang */}
          <div className={styles.headerCard}>
            <img src={accountUser.avatar || "/img/default.png"} alt={accountUser.full_name} className={styles.avatar} />
            <div>
              <div className={styles.nameRow}>
                <h1 className={styles.tutorName}>{accountUser.full_name}</h1>
                <span className={styles.verifiedCheck}>✓</span>
              </div>
              <div className={styles.ratingMeta}>
                ⭐ {tutorDetails.rating.toFixed(1)} <span>({tutorReviews.length} đánh giá)</span>
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

          {/* 2. Đoạn văn giới thiệu bản thân */}
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Giới thiệu</h2>
            <p className={styles.bioText}>{tutorDetails.bio}</p>
          </div>

          {/* 3. Khối bằng cấp và thành tích */}
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

          {/* 4. Khối danh sách các lớp học hiện có của riêng gia sư */}
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Lớp học hiện có</h2>
            <div className={styles.coursesGrid}>
              {tutorCourses.map((course) => (
                <div key={course.course_id} className={styles.courseCard}>
                  <div>
                    <h3 className={styles.courseCardTitle}>{course.title}</h3>
                    <p className={styles.courseCardDesc}>{course.description}</p>
                  </div>
                  <div className={styles.courseCardFooter}>
                    <span className={styles.coursePrice}>{course.price_per_session}</span>
                    <button className={styles.registerBtn}>Đăng ký học</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Khối biểu đồ & danh sách nhận xét đánh giá */}
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Đánh giá từ học viên</h2>
            <div className={styles.ratingSummary}>
              <div style={{ textAlign: 'center' }}>
                <div className={styles.bigScore}>{tutorDetails.rating.toFixed(1)}</div>
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

            <div className={styles.commentsList}>
              {tutorReviews.map((reviewItem) => (
                <div key={reviewItem.review_id} className={styles.commentItem}>
                  <div className={styles.studentName}>{reviewItem.studentName}</div>
                  <div className={styles.commentStars}>{"★".repeat(reviewItem.rating)}</div>
                  <p className={styles.commentText}>“{reviewItem.comment}”</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= CỘT BÊN PHẢI: SIDEBAR TIỆN ÍCH ================= */}
        <div className={styles.rightColumn}>
          
          <div className={styles.contactBox}>
            <button className={styles.callBtn}>
              📞 Gọi điện: {accountUser.phone}
            </button>
          </div>

          <div className={styles.infoBox}>
            <h3 className={styles.infoBoxTitle}>Thông tin hồ sơ</h3>
            <div className={styles.infoList}>
              <div><span>Kinh nghiệm:</span> <strong>{tutorDetails.Experience}</strong></div>
              <div><span>Trình độ:</span> <strong>{tutorDetails.qualification}</strong></div>
              <div><span>Trạng thái:</span> <strong className={styles.statusActive}>{tutorDetails.verification_status}</strong></div>
              
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

          {/* Danh sách Gia sư liên quan gợi ý thêm */}
          <div className={styles.relatedBox}>
            <h3 className={styles.relatedBoxTitle}>Gia sư liên quan</h3>
            <div className={styles.relatedList}>
              {relatedTutorsList.map((relatedTutor) => (
                <div key={relatedTutor.id} className={styles.relatedItem}>
                  <img src={relatedTutor.avatar || "/img/default.png"} alt={relatedTutor.name} className={styles.relatedAvatar} />
                  <div className={styles.relatedInfo}>
                    <h4 className={styles.relatedName}>{relatedTutor.name}</h4>
                    <p className={styles.relatedSub}>{relatedTutor.subject}</p>
                    <span className={styles.relatedStars}>⭐ {relatedTutor.rating.toFixed(1)}</span>
                  </div>
                  <Link href={`/tutorList/${relatedTutor.id}`} className={styles.viewBtn}>Xem</Link>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}