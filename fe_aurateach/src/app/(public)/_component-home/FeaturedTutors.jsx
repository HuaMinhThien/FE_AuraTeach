"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';

function FeaturedTutors() {
  const [tutorsList, setTutorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        // Gọi đồng thời cả 3 API endpoint để lấy dữ liệu phục vụ cho việc map thuộc tính
        const [resUsers, resTutors, resCourses] = await Promise.all([
          fetch('http://localhost:8000/api/users'),
          fetch('http://localhost:8000/api/tutors'),
          fetch('http://localhost:8000/api/courses')
        ]);

        if (!resUsers.ok || !resTutors.ok || !resCourses.ok) {
          throw new Error('Không thể tải đầy đủ dữ liệu gia sư');
        }

        const usersData = await resUsers.json();
        const tutorsData = await resTutors.json();
        const coursesData = await resCourses.json();

        const mergedTutors = tutorsData.map((tutor) => {
  const matchedUser = usersData.find(u => String(u.user_id) === String(tutor.user_id)) || {};
    const matchedCourse = coursesData.find(c => String(c.tutor_id) === String(tutor.tutor_id)) || {};

    return {
      id: tutor.tutor_id,
      name: matchedUser.full_name || "Gia sư AuraTeach",
      avatar: matchedUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      subject: matchedCourse.course_name || matchedCourse.title || "Gia sư tự do", // Kiểm tra cả 2 trường
      rating: parseFloat(tutor.rating) || 5.0, // Ép kiểu số
      experience: tutor.Experience || "Chưa cập nhật",
      bio: tutor.bio || "",
      price: matchedCourse.price_per_session ? `${parseInt(matchedCourse.price_per_session).toLocaleString()}đ` : "Liên hệ",
      reviews: tutor.reviews || 0 // Nếu API không có trường này, hãy để 0
    };
  });

        setTutorsList(mergedTutors);
      } catch (error) {
        console.error('Lỗi gọi hoặc map API Section 5:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTutors();
  }, []);

  if (loading) {
    return <div className="featured-teachers__loading">Đang tải danh sách gia sư nổi bật...</div>;
  }

  return (
    <section className="featured-teachers">
      
      {/* Khối tiêu đề chính */}
      <div className="featured-teachers__header">
        <h2 className="featured-teachers__title">Đội Ngũ Gia Sư Tiêu Biểu</h2>
        <p className="featured-teachers__desc">Học hỏi từ những chuyên gia, giáo viên có kinh nghiệm và tràn đầy nhiệt huyết.</p>
      </div>

      {/* Lưới danh sách các gia sư lấy từ JSON */}
      <div className="featured-teachers__grid">
        {tutorsList.map((tutor) => (
          <div key={tutor.id} className="featured-teachers__card">
            
            {/* Phần thông tin chân dung */}
            <div className="featured-teachers__profile">
              <img 
                className="featured-teachers__avatar" 
                src={tutor.avatar} 
                alt={`Gia sư ${tutor.name}`} 
              />
              <div>
                <h3 className="featured-teachers__name">{tutor.name}</h3>
                <p className="featured-teachers__subject">{tutor.subject}</p>
              </div>
            </div>

            {/* Phần thông số đánh giá & kinh nghiệm */}
            <div className="featured-teachers__meta">
              <div className="featured-teachers__rating-box">
                {/* SVG Ngôi sao */}
                <svg className="featured-teachers__rating-star" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                <span>{tutor.rating.toFixed(1)}</span>
              </div>
              <span className="featured-teachers__reviews">({tutor.reviews} đánh giá)</span>
              <span className="featured-teachers__divider">•</span>
              <span className="featured-teachers__exp">{tutor.experience}</span>
            </div>

            {/* Đoạn mô tả tiểu sử bản thân ngắn */}
            <p className="featured-teachers__bio">{tutor.bio}</p>

            {/* Phần chân thẻ chứa giá tiền và nút hành động */}
            <div className="featured-teachers__footer">
              <div>
                <div className="featured-teachers__price-label">Học phí trung bình</div>
                <div className="featured-teachers__price-value">{tutor.price}</div>
              </div>
              <Link href={`/tutorList/${tutor.id}`} className="featured-teachers__btn">
                Xem hồ sơ
              </Link>
            </div>

          </div>
        ))}
      </div>

    </section>
  );
}

export default FeaturedTutors;