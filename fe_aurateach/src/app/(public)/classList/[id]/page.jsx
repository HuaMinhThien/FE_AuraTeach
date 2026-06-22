"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./ClassDetail.module.css";

// Mock data - sẽ thay thế bằng API call sau
const classData = {
  id: "1",
  title: "Hỗ trợ ôn tập & Giải bài tập Toán lớp 9",
  rating: 4.9,
  reviews: 128,
  students: 850,
  tag: "Cam kết chuẩn kiến thức",
  price: 150000,
  description: `Dịch vụ hỗ trợ học tập cá nhân hóa được thiết kế dành riêng cho các em học sinh đang chuẩn bị cho kỳ thi chuyên cấp lớp 10 hoặc gặp khó khăn với chương trình Toán lớp 9. Chúng tôi tập trung vào việc củng cố nền tảng kiến thức và rèn luyện kỹ năng giải các dạng đề thi thực tế.

Mỗi buổi học là một phiên làm việc trực tiếp, giúp học sinh rà soát lại các chuyên đề trọng tâm, giải đáp thắc mắc về các bài tập khó trên lớp và hướng dẫn tự duy trinh bày bài làm đạt điểm tối đa.`,
  features: [
    "Ôn tập các chuyên đề Hình học và Đại số 9",
    "Luyện đề thi tuyển sinh lớp 10 các năm",
    "Giải bài tập sách giáo khoa và nâng cao",
    "Linh hoạt thời gian theo lịch học chính khóa",
  ],
  topics: [
    {
      id: "01",
      title: "Hệ thức lượng trong tam giác vuông",
      subtopics: [
        "Các hệ thức về cạnh và đường cao",
        "Ứng dụng thực tế của tỉ số lượng giác",
      ],
    },
    {
      id: "02",
      title: "Đường tròn và các tính chất",
      subtopics: [],
    },
    {
      id: "03",
      title: "Phương trình bậc hai một ẩn",
      subtopics: [],
    },
  ],
  tutor: {
    name: "Nguyễn Tùng Dương",
    title: "Giáo viên Toán THCS",
    description:
      "Cử nhân Sư phạm Toán học với hơn 5 năm kinh nghiệm luyện thi vào lớp 10 chuyên. Dương có phương pháp giảng dạy trực quan.",
    avatar: "/images/avatar-tutor.jpg",
  },
  reviews_data: [
    {
      id: 1,
      name: "Lê Minh Tuấn",
      content:
        '"Gia sư giảng rất kỹ phần hình học, giúp em nắm vững các tính chất đường tròn mà trước đây em hay bị nhầm lẫn. Nhờ ôn tập ở đây mà điểm kiểm tra toán của em đã cải thiện rõ rệt."',
      rating: 5,
    },
  ],
  details: {
    duration: "Tối thiểu 1 giờ/buổi",
    format: "Dạy trực tuyến / Tại nhà",
    language: "Tiếng Việt",
    level: "Lớp 9 - Ôn thi vào 10",
  },
};

export default function ClassDetailPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isBooked, setIsBooked] = useState(false);

  const formatPrice = (price) => {
    return price.toLocaleString("vi-VN");
  };

  const handleBooking = () => {
    // Xử lý đăng ký học
    setIsBooked(true);
    alert("Đăng ký hỗ trợ thành công!");
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/student-private">Học viên</Link>
        <span className={styles.separator}>›</span>
        <Link href="/student-private/classList">Tìm lớp học</Link>
        <span className={styles.separator}>›</span>
        <span className={styles.current}>Chi tiết hỗ trợ học tập</span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{classData.title}</h1>
        <div className={styles.meta}>
          <div className={styles.rating}>
            <span className={styles.star}>⭐</span>
            <span className={styles.ratingValue}>{classData.rating}</span>
            <span className={styles.reviews}>({classData.reviews} đánh giá)</span>
          </div>
          <div className={styles.students}>
            <span>{classData.students} học viên đã đăng ký</span>
          </div>
          <div className={styles.tag}>
            <span className={styles.tagBadge}>✓ {classData.tag}</span>
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
              <p>{classData.description}</p>
            </div>
            <ul className={styles.featuresList}>
              {classData.features.map((feature, index) => (
                <li key={index} className={styles.featureItem}>
                  <span className={styles.checkIcon}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          {/* Topics Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Nội dung hướng dẫn & Hỗ trợ
            </h2>
            <div className={styles.topicsList}>
              {classData.topics.map((topic) => (
                <div key={topic.id} className={styles.topicItem}>
                  <div className={styles.topicHeader}>
                    <span className={styles.topicId}>{topic.id}</span>
                    <h3 className={styles.topicTitle}>{topic.title}</h3>
                  </div>
                  {topic.subtopics.length > 0 && (
                    <ul className={styles.subtopicsList}>
                      {topic.subtopics.map((subtopic, idx) => (
                        <li key={idx} className={styles.subtopicItem}>
                          <span className={styles.subtopicCheck}>✓</span>
                          {subtopic}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Reviews Section */}
          <section className={styles.section}>
            <div className={styles.reviewsHeader}>
              <h2 className={styles.sectionTitle}>
                Đánh giá từ phụ huynh & Học sinh
              </h2>
              <div className={styles.reviewsSummary}>
                <span className={styles.summaryRating}>{classData.rating}</span>
                <span className={styles.summaryStars}>⭐⭐⭐⭐⭐</span>
                <span className={styles.summaryCount}>
                  {classData.reviews} Đánh giá
                </span>
              </div>
            </div>
            <div className={styles.reviewsList}>
              {classData.reviews_data.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewAuthor}>
                    <span className={styles.reviewName}>{review.name}</span>
                    <span className={styles.reviewRating}>⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className={styles.reviewContent}>{review.content}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.priceCard}>
            <div className={styles.priceHeader}>
              <span className={styles.price}>{formatPrice(classData.price)}đ</span>
              <span className={styles.priceUnit}>/giờ</span>
            </div>

            <div className={styles.priceDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>⏱</span>
                <span>Thời gian: {classData.details.duration}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>💻</span>
                <span>Hình thức: {classData.details.format}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>🌐</span>
                <span>Ngôn ngữ: {classData.details.language}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📚</span>
                <span>Trình độ: {classData.details.level}</span>
              </div>
            </div>

            <button onClick={handleBooking} className={styles.bookButton}>
              Đăng ký hỗ trợ ngay
            </button>
            <button className={styles.consultButton}>
              Đặt lịch hẹn tư vấn
            </button>
          </div>

          {/* Tutor Card */}
          <div className={styles.tutorCard}>
            <h3 className={styles.tutorCardTitle}>GIA SƯ HƯỚNG DẪN</h3>
            <div className={styles.tutorInfo}>
              <div className={styles.tutorAvatar}>
                <div className={styles.avatarPlaceholder}>
                  {classData.tutor.name.charAt(0)}
                </div>
              </div>
              <div className={styles.tutorDetails}>
                <h4 className={styles.tutorName}>{classData.tutor.name}</h4>
                <p className={styles.tutorTitle}>{classData.tutor.title}</p>
                <p className={styles.tutorDescription}>
                  {classData.tutor.description}
                </p>
                <Link href={`/tutor/${classData.tutor.name}`} className={styles.tutorProfileLink}>
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