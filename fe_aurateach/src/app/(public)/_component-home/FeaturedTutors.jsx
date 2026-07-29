"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { userService } from '@/services/userService';
import { tutorService } from '@/services/tutorService';
import { courseService } from '@/services/courseService';

function FeaturedTutors() {
  const [tutorsList, setTutorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        // Truyền thêm { get_all: true } để lấy toàn bộ danh sách khóa học không bị phân trang
        const [resUsers, resTutors, resCourses] = await Promise.all([
          userService.getUsers(),
          tutorService.getTutors(),
          courseService.getCourses({ get_all: true }) 
        ]);

        // Chuẩn hóa dữ liệu: Đảm bảo luôn lấy được mảng bất kể API trả về kiểu gì
        const usersData = Array.isArray(resUsers) ? resUsers : (resUsers?.data || []);
        const tutorsData = Array.isArray(resTutors) ? resTutors : (resTutors?.data || []);
        const coursesData = Array.isArray(resCourses) ? resCourses : (resCourses?.data || []);

        const mergedTutors = tutorsData.map((tutor) => {
          const matchedUser = usersData.find(u => u.user_id === tutor.user_id) || {};
          const matchedCourse = coursesData.find(c => c.tutor_id === tutor.tutor_id) || {};

          const ratingNum = tutor.rating !== undefined && tutor.rating !== null ? Number(tutor.rating) : 0.0;

          return {
            id: tutor.tutor_id,
            name: matchedUser.full_name || "Gia sư AuraTeach",
            avatar: matchedUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
            subject: matchedCourse.title || "Gia sư tự do",
            rating: isNaN(ratingNum) ? 5.0 : ratingNum,
            experience: tutor.Experience || "Chưa cập nhật",
            bio: tutor.bio || "",
            price: matchedCourse.hourly_rate ? `${parseInt(matchedCourse.hourly_rate).toLocaleString('vi-VN')}đ/h` : "Đang cập nhật",
            reviews: tutor.tutor_id === "tutor_01" ? 120 : 45 
          };
        });

        // Chỉ lấy 4 gia sư đầu tiên
        setTutorsList(mergedTutors.slice(0, 4));
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
      
      <div className="featured-teachers__header">
        <h2 className="featured-teachers__title">Đội Ngũ Gia Sư Tiêu Biểu</h2>
        <p className="featured-teachers__desc">Học hỏi từ những chuyên gia, giáo viên có kinh nghiệm và tràn đầy nhiệt huyết.</p>
      </div>

      <div className="featured-teachers__grid">
        {tutorsList.map((tutor) => (
          <Link 
            key={tutor.id} 
            href={`/tutorList/${tutor.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="featured-teachers__card">
              
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

              <div className="featured-teachers__meta">
                <div className="featured-teachers__rating-box">
                  <svg className="featured-teachers__rating-star" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                  <span>{tutor.rating.toFixed(1)}</span>
                </div>
                <span className="featured-teachers__reviews">({tutor.reviews} đánh giá)</span>
                <span className="featured-teachers__divider">•</span>
                <span className="featured-teachers__exp">{tutor.experience}</span>
              </div>

              <p className="featured-teachers__bio">{tutor.bio}</p>

              <div className="featured-teachers__footer">
                <div>
                  <div className="featured-teachers__price-label">Học phí trung bình</div>
                  <div className="featured-teachers__price-value">{tutor.price}</div>
                </div>
                <span className="featured-teachers__btn">
                  Xem hồ sơ
                </span>
              </div>

            </div>
          </Link>
        ))}
      </div>

    </section>
  );
}

export default FeaturedTutors;