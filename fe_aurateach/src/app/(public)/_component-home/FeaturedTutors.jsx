"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';

const DEFAULT_AVATAR = "https://res.cloudinary.com/ghbrskob/image/upload/v1786685723/aurateach_reports/v09h1kwwsnzbczsggiuy.webp";

function FeaturedTutors() {
  const [tutorsList, setTutorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Gọi endpoint trang chủ — dữ liệu do admin cấu hình
        const res = await apiClient.get('/home/featured-content');
        const tutorsData = res?.data?.tutors || [];

        const mapped = tutorsData.map((tutor) => {
          const ratingNum = Number(tutor.rating ?? 0);
          const priceText = tutor.min_price
            ? `${Number(tutor.min_price).toLocaleString('vi-VN')}đ / buổi`
            : 'Đang cập nhật';

          return {
            id:         tutor.tutor_id,
            name:       tutor.name       || 'Gia sư AuraTeach',
            avatar:     tutor.avatar     || DEFAULT_AVATAR,
            subject:    tutor.expertise  || 'Gia sư tự do',
            rating:     isNaN(ratingNum) ? 5.0 : ratingNum,
            experience: tutor.experience || 'Chưa cập nhật',
            bio:        tutor.bio        || '',
            price:      priceText,
            reviews:    tutor.reviews    || 0,
          };
        });

        setTutorsList(mapped);
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

  if (tutorsList.length === 0) return null;

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
                  onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                />
                <div>
                  <h3 className="featured-teachers__name">{tutor.name}</h3>
                  <p className="featured-teachers__subject">{tutor.subject}</p>
                </div>
              </div>

              <div className="featured-teachers__meta">
                <div className="featured-teachers__rating-box">
                  <svg className="featured-teachers__rating-star" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                  </svg>
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
                <span className="featured-teachers__btn">Xem hồ sơ</span>
              </div>

            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default FeaturedTutors;
