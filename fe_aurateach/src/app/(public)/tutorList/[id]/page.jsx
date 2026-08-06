"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './TutorDetail.module.css';
import data from '../../../api/data.json';
import BookingModal from '@/components/users/BookingModal';

const API_BASE = "http://localhost:3007";

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

  // Lấy thông tin user hiện tại từ cookie
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

        const totalTutorsArray = data.tutors || [];
        const totalUsersArray = data.users || [];
        const totalCoursesArray = data.courses || [];
        const totalReviewsArray = data.reviews || [];
        const totalStudentsArray = data.students || [];

        const matchedTutor = totalTutorsArray.find(
          (singleTutor) => String(singleTutor.tutor_id) === String(currentTutorId)
        );

        if (!matchedTutor) {
          console.error("Không tìm thấy gia sư với ID:", currentTutorId);
          setIsLoading(false);
          return;
        }

        const matchedUser = totalUsersArray.find(
          (singleUser) => singleUser.user_id === matchedTutor.user_id
        );

        const filteredTutorCourses = totalCoursesArray.filter(
          (singleCourse) => String(singleCourse.tutor_id) === String(currentTutorId)
        );

        const tutorCourseIdsArray = filteredTutorCourses.map((course) => course.course_id);
        const rawMatchedReviews = totalReviewsArray.filter((review) => 
          tutorCourseIdsArray.includes(review.course_id)
        );

        const formattedReviews = rawMatchedReviews.map((singleReview) => {
          const matchedStudent = totalStudentsArray.find(
            (student) => student.student_id === singleReview.student_id
          ) || {};
          const studentUserInfo = totalUsersArray.find(
            (user) => user.user_id === matchedStudent.user_id
          ) || {};
          return { 
            ...singleReview, 
            studentName: studentUserInfo.full_name || "Học viên ẩn danh" 
          };
        });

        const specificRelatedTutors = totalTutorsArray
          .filter((tutor) => String(tutor.tutor_id) !== String(currentTutorId))
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
              name: otherTutorUser.full_name || "Gia sư AuraTeach",
              avatar: otherTutorUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
              subject: otherTutorCourse.title || "Gia sư AuraTeach",
              rating: otherTutor.rating || 4.5
            };
          });

        setTutorDetails(matchedTutor);
        setAccountUser(matchedUser);
        setTutorCourses(filteredTutorCourses);
        setTutorReviews(formattedReviews);
        setRelatedTutorsList(specificRelatedTutors);

      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTutorData();
  }, [params]);

  // ===== HÀM TÌM HOẶC TẠO CONVERSATION =====
  const findOrCreateConversation = async (studentId, userId, tutorId) => {
    try {
      console.log(`🔍 Tìm conversation: student=${studentId}, user_id=${userId}, tutor_id=${tutorId}`);

      // 1. Lấy tất cả conversations
      const res = await fetch(`${API_BASE}/conversations`);
      const conversations = await res.json();
      
      // 2. Tìm conversation đã tồn tại (kiểm tra cả user_id và tutor_id)
      const existingConv = conversations.find(conv => {
        if (!conv.participants || !conv.participants.includes(studentId)) return false;
        
        // Kiểm tra xem conversation có chứa tutor không (theo user_id hoặc tutor_id)
        return conv.participants.includes(userId) || conv.participants.includes(tutorId);
      });
      
      if (existingConv) {
        console.log("✅ Found existing conversation:", existingConv);
        return existingConv;
      }
      
      // 3. Tạo conversation mới (dùng user_id để đồng bộ với dữ liệu hiện tại)
      const newConv = {
        id: `conv_${Date.now()}`,
        participants: [studentId, userId],
        last_message: "",
        last_message_time: new Date().toISOString(),
        unread_count: 0
      };
      
      console.log("📝 Creating new conversation:", newConv);
      
      const createRes = await fetch(`${API_BASE}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConv),
      });
      
      if (!createRes.ok) {
        throw new Error("Không thể tạo hội thoại");
      }
      
      const createdConv = await createRes.json();
      console.log("✅ Created new conversation:", createdConv);
      return createdConv;
      
    } catch (error) {
      console.error("❌ Lỗi tìm/tạo conversation:", error);
      return null;
    }
  };

  // ===== HÀM XỬ LÝ LIÊN HỆ =====
  const handleContact = async () => {
    // Kiểm tra đã đăng nhập chưa
    if (!currentUser) {
      router.push(`/login?redirect=/tutorList/${tutorDetails?.tutor_id}`);
      return;
    }

    // Kiểm tra nếu là học viên thì chuyển đến Messenger
    if (currentUser.role === 'student') {
      try {
        const studentId = currentUser.user_id || currentUser.id;
        const userId = accountUser?.user_id;     // user_id của gia sư
        const tutorId = tutorDetails?.tutor_id;   // tutor_id của gia sư
        
        console.log(`📌 Contact: studentId=${studentId}, userId=${userId}, tutorId=${tutorId}`);
        
        // ✅ Tìm hoặc tạo conversation
        const conv = await findOrCreateConversation(studentId, userId, tutorId);
        
        if (conv) {
          router.push(`/messenger?conversationId=${conv.id}`);
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

      const tutorId = tutorDetails?.tutor_id;
      const courseId = selectedCourse?.course_id;

      console.log("📝 Đăng ký khóa học:", { courseId, studentId, tutorId, notes, paymentMethod });

      const res = await fetch(`/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          studentId,
          tutorId,
          notes,
          paymentMethod: paymentMethod || 'qr',
        }),
      });

      const result = await res.json();
      console.log("📝 Kết quả đăng ký:", result);
      return result;
    } catch (error) {
      console.error("❌ Lỗi đăng ký:", error);
      return { success: false, message: error.message };
    }
  };

  // ===== HÀM MỞ BOOKING MODAL =====
  const handleOpenBooking = (course) => {
    if (!currentUser) {
      router.push(`/login?redirect=/tutorList/${tutorDetails?.tutor_id}`);
      return;
    }
    if (currentUser.role !== 'student') {
      alert('Chỉ học viên mới có thể đăng ký học!');
      return;
    }
    setSelectedCourse(course);
    setShowBooking(true);
  };

  // Hiển thị loading
  if (isLoading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '100px 20px',
        fontSize: '18px',
        color: '#475569'
      }}>
        <div style={{ marginBottom: '16px' }}>⏳</div>
        Đang tải thông tin gia sư...
      </div>
    );
  }

  // Hiển thị khi không tìm thấy
  if (!tutorDetails || !accountUser) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '100px 20px',
        fontSize: '18px',
        color: '#475569'
      }}>
        <div style={{ marginBottom: '16px' }}>😅</div>
        Không tìm thấy thông tin gia sư. Vui lòng quay lại trang danh sách.
        <div style={{ marginTop: '20px' }}>
          <Link href="/tutorList" style={{
            display: 'inline-block',
            padding: '10px 24px',
            backgroundColor: '#1259c9',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none'
          }}>
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  // Phân tách các môn học
  const subjectsArray = tutorDetails.expertise
    ? tutorDetails.expertise.split(',').map(item => item.trim())
    : ["Toán học", "Ngữ Văn", "Tiếng Anh"];

  return (
    <div className={styles.tutorProfilePage}>
      <div className={styles.mainLayout}>
        
        {/* ================= CỘT BÊN TRÁI: THÔNG TIN CHI TIẾT GIA SƯ ================= */}
        <div className={styles.leftColumn}>
          
          {/* 1. Thẻ thông tin chung đầu trang */}
          <div className={styles.headerCard}>
            <img 
              src={accountUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
              alt={accountUser.full_name} 
              className={styles.avatar} 
            />
            <div>
              <div className={styles.nameRow}>
                <h1 className={styles.tutorName}>{accountUser.full_name}</h1>
                {/* HIỂN THỊ LEVEL (SINH VIÊN HOẶC GIÁO VIÊN) */}
                {tutorDetails.level && (
                  <span className={styles.levelBadge}>
                    {tutorDetails.level}
                  </span>
                )}
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

          {/* 2. Đoạn văn giới thiệu bản thân */}
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Giới thiệu</h2>
            <p className={styles.bioText}>{tutorDetails.bio || "Chưa có thông tin giới thiệu"}</p>
          </div>

          {/* 3. Khối Bằng cấp & Chứng chỉ */}
          <div className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>Bằng cấp & Chứng chỉ</h2>
            
            {/* Hiển thị danh sách hình ảnh chứng chỉ nếu có */}
            {tutorDetails.certificates && tutorDetails.certificates.length > 0 ? (
              <div className={styles.certificatesGallery}>
                {tutorDetails.certificates.map((certImg, idx) => (
                  <img 
                    key={idx}
                    src={certImg} 
                    alt={`Chứng chỉ ${idx + 1}`} 
                    className={styles.certificateImage} 
                  />
                ))}
              </div>
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200" 
                alt="Chứng nhận thành tích gia sư" 
                className={styles.achievementImage} 
              />
            )}

          </div>

          {/* 4. Khối danh sách các lớp học hiện có */}
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
                      <button className={styles.registerBtn} onClick={() => handleOpenBooking(course)}>Đăng ký học</button>
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

          {/* 5. Khối đánh giá */}
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
                  <div className={styles.progressBarTrack}>
                    <div className={styles.progressBarFill5}></div>
                  </div>
                </div>
                <div className={styles.progressRow}>
                  <span>4 sao</span>
                  <div className={styles.progressBarTrack}>
                    <div className={styles.progressBarFill4}></div>
                  </div>
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

        {/* ================= CỘT BÊN PHẢI: SIDEBAR TIỆN ÍCH ================= */}
        <div className={styles.rightColumn}>
          
          {/* NÚT LIÊN HỆ */}
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
                <span>Trình độ:</span> 
                <strong>{tutorDetails.level || 'Chưa cập nhật'}</strong>
              </div>
              <div>
                <span>Kinh nghiệm:</span> 
                <strong>{tutorDetails.experience || 'Chưa cập nhật'}</strong>
              </div>
              <div>
                <span>Trạng thái:</span> 
                <strong className={styles.statusActive}>
                  {tutorDetails.verification_status === 'approved' ? 'Đã xác thực' : 'Chưa xác thực'}
                </strong>
              </div>
              
              <div className={styles.subjectsDivider}>
                <span className={styles.subjectsTitle}>Môn học giảng dạy:</span>
                <div className={styles.tagsContainer}>
                  {subjectsArray.map((sub, i) => (
                    <span key={i} className={styles.subjectTag}>{sub}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.reportBtn}>⚠️ Báo cáo gia sư</div>
          </div>

          {/* Danh sách Gia sư liên quan */}
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