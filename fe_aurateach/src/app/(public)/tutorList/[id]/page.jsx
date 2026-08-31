"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './TutorDetail.module.css';
import BookingModal from '@/components/users/BookingModal';
import { tutorService } from '@/services/tutorService';
import { reviewService } from '@/services/reviewService';
import { courseSubscriptionService } from '@/services/courseSubscriptionService';
import apiClient from '@/services/apiClient';

export default function TutorDetailPage({ params }) {
  const router = useRouter();
  const [tutorDetails, setTutorDetails] = useState(null);
  const [accountUser, setAccountUser] = useState(null);
  const [tutorCourses, setTutorCourses] = useState([]);
  const [tutorReviews, setTutorReviews] = useState([]);
  const [relatedTutorsList, setRelatedTutorsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAllCourses, setShowAllCourses] = useState(false);

  const COURSES_PREVIEW = 4;

  // Lấy thông tin user hiện tại từ cookie hoặc localStorage
  useEffect(() => {
    const getCurrentUser = () => {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      const userCookie = getCookie("user_info");
      if (userCookie) {
        try {
          return JSON.parse(decodeURIComponent(userCookie));
        } catch {
          return null;
        }
      }
      return null;
    };
    setCurrentUser(getCurrentUser());
  }, []);

  // Fetch dữ liệu gia sư chi tiết thông qua các API service chuẩn
  useEffect(() => {
    const fetchAllTutorData = async () => {
      try {
        const resolvedParams = await params;
        const currentTutorId = resolvedParams?.id;

        if (!currentTutorId) {
          console.error("Không tìm thấy ID gia sư");
          setIsLoading(false);
          return;
        }

        // 1. Lấy thông tin chi tiết gia sư hiện tại bằng tutorService đã cấu hình
        const tutorData = await tutorService.getDetail(currentTutorId);
        
        if (!tutorData) {
          console.error("Không tìm thấy gia sư với ID:", currentTutorId);
          setIsLoading(false);
          return;
        }

        setTutorDetails(tutorData);
        setAccountUser(tutorData.user || null);

        // 2. Lấy danh sách khóa học của gia sư này trước
        let coursesList = [];
        try {
          const coursesRes = await apiClient.get(`/courses?tutor_id=${currentTutorId}`);
          coursesList = Array.isArray(coursesRes) ? coursesRes : (coursesRes.data || []);
          setTutorCourses(coursesList);
        } catch (err) {
          console.error("Lỗi tải khóa học:", err);
          setTutorCourses([]);
        }

        // 3. Sau khi đã có danh sách khóa học, tiến hành lấy review thông qua reviewService và gia sư liên quan
        try {
          const [reviewsRes, relatedRes] = await Promise.all([
            reviewService.getReviews().catch(() => []),
            tutorService.getRelatedTutors(currentTutorId).catch(() => [])
          ]);

          const reviewsList = Array.isArray(reviewsRes) ? reviewsRes : (reviewsRes.data || []);
          
          // Lấy chính xác mảng course_id thuộc gia sư này để lọc đánh giá khớp với database của bạn
          const matchedReviews = reviewsList.filter(r => 
              String(r.tutor_id) === String(currentTutorId)
            );
            setTutorReviews(matchedReviews);

          // Xử lý dữ liệu trả về từ tutorService.getRelatedTutors
          const relatedListRaw = Array.isArray(relatedRes) ? relatedRes : (relatedRes.data || []);
          const related = relatedListRaw.map(other => ({
            id: other.tutor_id || other.id,
            name: other.user?.full_name || "Gia sư AuraTeach",
            avatar: other.user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            subject: other.expertise || other.bio || "Gia sư chuyên môn",
            rating: other.rating || 4.5
          }));
          
          setRelatedTutorsList(related);

        } catch (subErr) {
          console.error("Lỗi tải thông tin phụ (review/related):", subErr);
        }

      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu gia sư:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTutorData();
  }, [params]);

  // ===== HÀM TÌM HOẶC TẠO CONVERSATION =====
  const findOrCreateConversation = async (studentId, userId, tutorId) => {
    try {
      console.log("🛠️ [DEBUG] Đang tìm conversation với studentId:", studentId, "và targetId:", userId || tutorId);

      const url = `/conversations?user_id=${encodeURIComponent(studentId)}`;
      const response = await apiClient.get(url);
      
      const resData = response.data || response;
      const conversations = Array.isArray(resData) ? resData : (resData.data || []);
      
      const existingConv = conversations.find(conv => {
        const participants = conv.users || conv.participants || [];
        const participantIds = participants.map(p => String(p.user_id || p.id || p));
        
        const hasStudent = participantIds.includes(String(studentId));
        const hasTutorTarget = participantIds.includes(String(userId)) || participantIds.includes(String(tutorId));
        
        return hasStudent && hasTutorTarget;
      });
      
      if (existingConv) {
        console.log("✅ Đã tìm thấy conversation cũ:", existingConv);
        return existingConv;
      }
      
      // 🚀 Kiểm tra xem ID nào thực sự là user_id của gia sư (ưu tiên dùng userId của accountUser)
      const targetUserId = userId || tutorId;
      const newConvPayload = {
        participants: [studentId, targetUserId]
      };
      
      console.log("🚀 [DEBUG] Đang gửi payload tạo conversation mới:", newConvPayload);

      const createdRes = await apiClient.post("/conversations", newConvPayload);
      console.log("🚀 [DEBUG] Kết quả tạo conversation từ server:", createdRes);

      const createdData = createdRes.data || createdRes;
      return createdData.data || createdData;
      
    } catch (error) {
      console.error("❌ Lỗi tìm/tạo conversation chi tiết:", error);
      return null;
    }
  };

  // ===== HÀM XỬ LÝ LIÊN HỆ =====
  const handleContact = async () => {
    if (!currentUser) {
      router.push(`/login?redirect=/tutorList/${tutorDetails?.tutor_id || tutorDetails?.id}`);
      return;
    }

    if (currentUser.role === 'student') {
      try {
        const studentId = currentUser.user_id || currentUser.id;
        const userId = accountUser?.user_id || accountUser?.id;
        const tutorId = tutorDetails?.tutor_id || tutorDetails?.id;
        
        const conv = await findOrCreateConversation(studentId, userId, tutorId);
        
        if (conv && (conv.id || conv._id)) {
          router.push(`/messenger?conversationId=${conv.id || conv._id}`);
        } else {
          router.push('/messenger');
        }
      } catch (error) {
        console.error("❌ Lỗi tạo hội thoại:", error);
        router.push('/messenger');
      }
    } else {
      alert('Bạn cần đăng nhập với tài khoản học viên để liên hệ!');
    }
  };

  // ===== HÀM XỬ LÝ ĐĂNG KÝ KHÓA HỌC =====
  const handleRegisterCourse = async (notes, paymentMethod) => {
    try {
      const studentId = currentUser?.user_id || currentUser?.id;
      if (!studentId) {
        return { success: false, message: "Vui lòng đăng nhập để đăng ký" };
      }

      const tutorId = tutorDetails?.tutor_id || tutorDetails?.id;
      const courseId = selectedCourse?.course_id || selectedCourse?.id;

      const payload = {
        courseId,
        studentId,
        tutorId,
        notes,
        paymentMethod: paymentMethod || 'qr',
      };

      const result = await courseSubscriptionService.createBooking(payload);
      return { success: true, ...result };
    } catch (error) {
      console.error("❌ Lỗi đăng ký:", error);
      return { success: false, message: error.message || "Đăng ký khóa học thất bại" };
    }
  };

  // ===== HÀM MỞ BOOKING MODAL =====
  const handleOpenBooking = (course) => {
    if (!currentUser) {
      router.push(`/login?redirect=/tutorList/${tutorDetails?.tutor_id || tutorDetails?.id}`);
      return;
    }
    if (currentUser.role !== 'student') {
      alert('Chỉ học viên mới có thể đăng ký học!');
      return;
    }
    setSelectedCourse(course);
    setShowBooking(true);
  };

   const handleReport = () => {
    if (!currentUser) {
      router.push(`/login?redirect=/tutorList/${tutorDetails?.tutor_id}`);
      return;
    }
    
    // Kiểm tra nếu là học viên
    if (currentUser.role !== 'student') {
      alert('⚠️ Chỉ học viên mới có thể báo cáo gia sư!');
      return;
    }

    // Chuyển đến trang báo cáo
    const tutorId = tutorDetails?.tutor_id;
    if (tutorId) {
      router.push(`/report-tutor/${tutorId}`);
    } else {
      alert('❌ Không tìm thấy thông tin gia sư để báo cáo');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontSize: '18px', color: '#475569' }}>
        <div style={{ marginBottom: '16px' }}>⏳</div>
        Đang tải thông tin gia sư...
      </div>
    );
  }

  if (!tutorDetails || !accountUser) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontSize: '18px', color: '#475569' }}>
        <div style={{ marginBottom: '16px' }}>😅</div>
        Không tìm thấy thông tin gia sư. Vui lòng quay lại trang danh sách.
        <div style={{ marginTop: '20px' }}>
          <Link href="/tutorList" style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: '#1259c9', color: '#fff', borderRadius: '8px', textDecoration: 'none' }}>
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  // Lấy trực tiếp điểm rating chuẩn từ bảng tutors (tutorDetails.rating)
  const displayRating = tutorDetails.rating !== undefined && tutorDetails.rating !== null 
    ? Number(tutorDetails.rating).toFixed(1) 
    : '0.0';

  return (
    <div className={styles.tutorProfilePage}>
      <div className={styles.mainLayout}>
        
        {/* ================= CỘT BÊN TRÁI: THÔNG TIN CHI TIẾT GIA SƯ ================= */}
        <div className={styles.leftColumn}>
          
          <div className={styles.headerCard}>
            <img 
              src={accountUser.avatar || "https://res.cloudinary.com/ghbrskob/image/upload/v1786685723/aurateach_reports/v09h1kwwsnzbczsggiuy.webp"} 
              alt={accountUser.full_name} 
              className={styles.avatar} 
            />
            <div>
              <div className={styles.nameRow}>
                <h1 className={styles.tutorName}>{accountUser.full_name}</h1>
                <img src="/img/icons/security.png" alt="xác minh" className={styles.verifiedIcon} />
              </div>
              <div className={styles.ratingMeta}>
                <img src="/img/icons/star.png" alt="star" className={styles.ratingStarIcon} /> {displayRating} 
                <span>({tutorReviews.length} đánh giá)</span>
              </div>
              <div className={styles.statsContainer}>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>
                    {tutorDetails.search_views_count ?? tutorDetails.view ?? 0}
                  </div>
                  <div className={styles.statLabel}>Lượt tìm kiếm</div>
                </div>
                
                <div className={styles.statBox}>
                  <div className={styles.statValue}>
                    {tutorDetails.classes_taught_count || tutorCourses.length || 0}
                  </div>
                  <div className={styles.statLabel}>Học viên đã dạy</div>
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
              <div>🏅 Giải nhất Olympic Tin học sinh viên</div>
              <div>📜 Chứng chỉ Professional Software Engineer (PSE)</div>
              <div>👥 Thành viên tích cực cộng đồng giáo dục</div>
            </div>
          </div>

          <div className={styles.sectionBlock}>
            <div className={styles.sectionTitleRow}>
              <h2 className={styles.sectionTitle}>Lớp học hiện có</h2>
              {tutorCourses.length > 0 && (
                <span className={styles.courseCountBadge}>{tutorCourses.length} lớp</span>
              )}
            </div>            
            {tutorCourses.length > 0 ? (
              <>
                <div className={styles.coursesGrid}>
                  {(showAllCourses ? tutorCourses : tutorCourses.slice(0, COURSES_PREVIEW)).map((course) => (
                    <div key={course.course_id} className={styles.courseCard}>
                      <div>
                        <h3 className={styles.courseCardTitle}>{course.title}</h3>
                        <p className={styles.courseCardDesc}>{course.description}</p>
                      </div>
                      <div className={styles.courseCardFooter}>
                        <span className={styles.coursePrice}>
                          {course.price_per_session || 'Liên hệ'}
                        </span>
                        <button className={styles.registerBtn} onClick={() => handleOpenBooking(course)}>Đăng ký học</button>
                      </div>
                    </div>
                  ))}
                </div>

                {tutorCourses.length > COURSES_PREVIEW && (
                  <button
                    className={styles.toggleCoursesBtn}
                    onClick={() => setShowAllCourses((prev) => !prev)}
                  >
                    {showAllCourses
                      ? "▲ Ẩn bớt"
                      : `▼ Xem thêm ${tutorCourses.length - COURSES_PREVIEW} lớp`}
                  </button>
                )}
              </>
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
                  {displayRating}
                </div>
                <div className={styles.starsRow}>⭐⭐⭐⭐⭐</div>
                <div className={styles.voteCount}>{tutorReviews.length} bình chọn</div>
              </div>

              <div className={styles.progressContainer}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const totalReviews = tutorReviews.length;
                  const count = tutorReviews.filter((r) => Number(r.rating) === star).length;
                  const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                  return (
                    <div className={styles.progressRow} key={star}>
                      <span>{star} sao</span>
                      <div className={styles.progressBarTrack}>
                        <div 
                          className={styles.progressBarFill} 
                          style={{ width: `${percent}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: '4px', transition: 'width 0.3s ease' }}
                        ></div>
                      </div>
                      <span className={styles.progressCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {tutorReviews.length > 0 ? (
              <div className={styles.commentsList}>
                {tutorReviews.map((reviewItem) => {
                  const studentName = reviewItem.student?.user?.full_name || reviewItem.studentName || "Học viên";                
                  return (
                    <div key={reviewItem.review_id || reviewItem.id} className={styles.commentItem}>
                      <div className={styles.studentName}>{studentName}</div>
                      <div className={styles.commentStars}>
                        {"★".repeat(Math.min(reviewItem.rating || 0, 5))}
                      </div>
                      <p className={styles.commentText}>“{reviewItem.comment}”</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
                Chưa có đánh giá nào cho gia sư này.
              </p>
            )}
          </div>

        </div>

        {/* ================= CỘT BÊN PHẢI: SIDEBAR TIỆN ÍCH ================= */}
        <div className={styles.rightColumn}>
          
          <div className={styles.contactBox}>
            <button className={styles.contactBtn} onClick={handleContact}>
              💬 Liên hệ với {accountUser.full_name?.split(' ').pop() || 'gia sư'}
            </button>
            {!currentUser && (
              <p className={styles.contactNote}>
                🔑 Vui lòng <Link href="/login" className={styles.loginLink}>đăng nhập</Link> để liên hệ
              </p>
            )}
            {currentUser && currentUser.role !== 'student' && (
              <p className={styles.contactNote}>
                ⚠️ Bạn cần tài khoản học viên để liên hệ
              </p>
            )}
          </div>

          <div className={styles.infoBox}>
            <h3 className={styles.infoBoxTitle}>Thông tin hồ sơ</h3>
            <div className={styles.infoList}>
              <div>
                <span>Kinh nghiệm:</span> 
                <strong>{tutorDetails.experience || 'Chưa cập nhật'}</strong>
              </div>
              <div>
                <span>Trạng thái:</span> 
                <strong className={styles.statusActive}>
                  {tutorDetails.verification_status === 'approved' ? 'Đã xác thực' : 'Đã xác thực'}
                </strong>
              </div>
              
              <div className={styles.subjectsDivider}>
                <span className={styles.subjectsTitle}>Chuyên môn:</span>
                <div className={styles.tagsContainer}>
                  <span className={styles.subjectTag}>{tutorDetails.expertise || 'Đa chuyên ngành'}</span>
                </div>
              </div>
            </div>
          </div>
            {currentUser?.role === 'student' ? (
              <button 
                className={styles.reportBtn} 
                onClick={handleReport}
                style={{ cursor: 'pointer' }}
              >
                ⚠️ Báo cáo gia sư
              </button>
            ) : currentUser ? (
              <div 
                className={styles.reportBtn} 
                style={{ 
                  opacity: 0.5, 
                  cursor: 'not-allowed',
                  backgroundColor: '#e5e7eb',
                  color: '#6b7280'
                }}
              >
                ⚠️ Báo cáo gia sư (Chỉ học viên)
              </div>
            ) : (
              <Link 
                href={`/login?redirect=/tutorList/${tutorDetails?.tutor_id}`}
                className={styles.reportBtn}
                style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}
              >
                ⚠️ Đăng nhập để báo cáo
              </Link>
            )}
          <div className={styles.relatedBox}>
            <h3 className={styles.relatedBoxTitle}>Gia sư liên quan</h3>
            {relatedTutorsList.length > 0 ? (
              <div className={styles.relatedList}>
                {relatedTutorsList.map((relatedTutor) => (
                  <div key={relatedTutor.id} className={styles.relatedItem}>
                    <img 
                      src={relatedTutor.avatar} 
                      alt={relatedTutor.name} 
                      className={styles.relatedAvatar} 
                    />
                    <div className={styles.relatedInfo}>
                      <h4 className={styles.relatedName}>{relatedTutor.name}</h4>
                      <p className={styles.relatedSub}>{relatedTutor.subject}</p>
                      <span className={styles.relatedStars}>⭐ {Number(relatedTutor.rating).toFixed(1)}</span>
                    </div>
                    <Link href={`/tutorList/${relatedTutor.id}`} className={styles.viewBtn}>
                      Xem
                    </Link>
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

      {/* ===== BOOKING MODAL ===== */}
      {showBooking && selectedCourse && (
        <BookingModal
          course={{
            ...selectedCourse,
            student_id: currentUser?.user_id || currentUser?.id,
          }}
          tutorName={accountUser?.full_name || "Gia sư"}
          onClose={() => {
            setShowBooking(false);
            setSelectedCourse(null);
          }}
          onConfirm={handleRegisterCourse}
          loading={false}
        />
      )}
    </div>
  );
}