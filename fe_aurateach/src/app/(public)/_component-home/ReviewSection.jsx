"use client";

import React, { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';

const DEFAULT_AVATAR = 'https://res.cloudinary.com/ghbrskob/image/upload/v1786685723/aurateach_reports/v09h1kwwsnzbczsggiuy.webp';

function ReviewSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await apiClient.get('/home/featured-content');
        const reviewsData = res?.data?.reviews || [];

        const mapped = reviewsData.map((r) => ({
          id:      r.review_id,
          author:  r.author       || 'Học viên AuraTeach',
          avatar:  r.avatar       || DEFAULT_AVATAR,
          role:    r.course_title ? `Học viên lớp: ${r.course_title}` : 'Học viên AuraTeach',
          rating:  Number(r.rating ?? 5),
          comment: r.comment      || '',
        }));

        setReviews(mapped);
      } catch (error) {
        console.error('Lỗi tải đánh giá nổi bật:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  if (loading) {
    return (
      <div className="aurateach-sec7" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
        Đang tải đánh giá học viên...
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section className="container-center">
      <div className="aurateach-sec7">
        <div className="aurateach-sec7__header">
          <h2 className="aurateach-sec7__title">Đánh giá từ học viên thực tế</h2>
          <p className="aurateach-sec7__desc">
            Lắng nghe những chia sẻ thực tế về hiệu quả học tập tại AuraTeach.
          </p>
        </div>

        <div className="aurateach-sec7__grid">
          {reviews.map((item) => (
            <div key={item.id} className="aurateach-sec7__card">
              <h3 className="aurateach-sec7__author">{item.author}</h3>
              <p className="aurateach-sec7__role">{item.role}</p>

              <div className="aurateach-sec7__rating">
                <div className="aurateach-sec7__stars">
                  {[...Array(5)].map((_, index) => (
                    <svg
                      key={index}
                      className="aurateach-sec7__star-icon"
                      stroke="currentColor"
                      fill={index < item.rating ? 'currentColor' : 'none'}
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      height="14"
                      width="14"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <span className="aurateach-sec7__score">
                  {item.rating.toFixed(1)}
                </span>
              </div>

              <p className="aurateach-sec7__content">"{item.comment}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ReviewSection;
