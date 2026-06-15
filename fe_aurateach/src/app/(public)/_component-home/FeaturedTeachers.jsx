"use client";

import React, { useState, useEffect } from 'react';

function FeaturedTeachers() {
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/home-data?section=featured');
        if (!response.ok) {
          throw new Error('Không thể tải danh sách gia sư tổng hợp');
        }
        const data = await response.json();
        setTeachersList(data);
      } catch (error) {
        console.error('Lỗi gọi API Section 5:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
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
        {teachersList.map((teacher) => (
          <div key={teacher.id} className="featured-teachers__card">
            
            {/* Phần thông tin chân dung */}
            <div className="featured-teachers__profile">
              <img 
                className="featured-teachers__avatar" 
                src={teacher.avatar} 
                alt={`Gia sư ${teacher.name}`} 
              />
              <div>
                <h3 className="featured-teachers__name">{teacher.name}</h3>
                <p className="featured-teachers__subject">{teacher.subject}</p>
              </div>
            </div>

            {/* Phần thông số đánh giá & kinh nghiệm */}
            <div className="featured-teachers__meta">
              <div className="featured-teachers__rating-box">
                {/* SVG Ngôi sao */}
                <svg className="featured-teachers__rating-star" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>
                <span>{teacher.rating.toFixed(1)}</span>
              </div>
              <span className="featured-teachers__reviews">({teacher.reviews} đánh giá)</span>
              <span className="featured-teachers__divider">•</span>
              <span className="featured-teachers__exp">{teacher.experience}</span>
            </div>

            {/* Đoạn mô tả tiểu sử bản thân ngắn */}
            <p className="featured-teachers__bio">{teacher.bio}</p>

            {/* Phần chân thẻ chứa giá tiền và nút hành động */}
            <div className="featured-teachers__footer">
              <div>
                <div className="featured-teachers__price-label">Học phí trung bình</div>
                <div className="featured-teachers__price-value">{teacher.price}</div>
              </div>
              <button className="featured-teachers__btn">Xem hồ sơ</button>
            </div>

          </div>
        ))}
      </div>

    </section>
  );
}

export default FeaturedTeachers;