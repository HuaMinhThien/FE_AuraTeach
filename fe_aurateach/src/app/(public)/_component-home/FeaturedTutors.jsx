"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { tutorService } from '@/services/tutorService'; // Import service vừa thêm

function FeaturedTutors() {
  const [tutorsList, setTutorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Gọi thẳng qua tutorService đã định nghĩa
        const res = await tutorService.getFeaturedTutors();
        const tutorsData = Array.isArray(res) ? res : (res?.data || []);

        const mappedTutors = tutorsData.map((tutor) => {
          const matchedUser = tutor.user || {};
          const tutorCourses = tutor.courses || [];

          // Tìm mức giá thấp nhất từ danh sách khóa học của gia sư
          let lowestPriceText = "Đang cập nhật";
          if (tutorCourses.length > 0) {
            const validPrices = tutorCourses
              .map(c => Number(c.price_per_session || c.price))
              .filter(price => !isNaN(price) && price > 0);

            if (validPrices.length > 0) {
              const minPrice = Math.min(...validPrices);
              lowestPriceText = `${minPrice.toLocaleString('vi-VN')}đ / buổi`;
            }
          }

          const ratingNum = tutor.rating !== undefined && tutor.rating !== null ? Number(tutor.rating) : 0.0;

          return {
            id: tutor.tutor_id,
            name: matchedUser.full_name || "Gia sư AuraTeach",
            avatar: matchedUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
            subject: tutor.expertise || "Gia sư tự do",
            rating: isNaN(ratingNum) ? 5.0 : ratingNum,
            experience: tutor.Experience || "Chưa cập nhật",
            bio: tutor.bio || "",
            price: lowestPriceText,
            reviews: tutor.reviews || 0 
          };
        });

        setTutorsList(mappedTutors);
      } catch (error) {
        console.error('Lỗi tải gia sư nổi bật:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
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
                  <div className="featured-teachers__price-label">Có thể đặt lịch gia sư với giá</div>
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