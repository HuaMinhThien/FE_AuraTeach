"use client";

import React, { useState, useEffect } from 'react';

function ReviewSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // 🌟 SỬA ĐỔI: Thêm tham số ?section=reviews để Laravel trả về đúng mảng comment sạch
        const response = await fetch('http://localhost:8000/api/home-data?section=reviews');
        if (!response.ok) {
          throw new Error('Không thể tải danh sách bình luận');
        }
        const data = await response.json();
        
        // Đảm bảo dữ liệu nhận về là mảng rồi mới tiến hành lọc để chống sập tuyệt đối
        if (Array.isArray(data)) {
          const highRatingReviews = data.filter(item => item.rating >= 4.5);
          setReviews(highRatingReviews);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error('Lỗi gọi API lọc review Section 7:', error);
        setReviews([]); // Dự phòng mảng rỗng nếu API lỗi
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

  return (
    <section className="container-center">
      <div className='aurateach-sec7'>
        {/* Khối tiêu đề */}
        <div className="aurateach-sec7__header">
          <h2 className="aurateach-sec7__title">Đánh giá từ học viên thực tế</h2>
          <p className="aurateach-sec7__desc">Lắng nghe những chia sẻ thực tế về hiệu quả học tập tại AuraTeach.</p>
        </div>

        {/* Vùng lưới hiển thị các card đã được lọc >= 4.5 sao */}
        <div className="aurateach-sec7__grid">
          {/* Kiểm tra an toàn trước khi dùng .map */}
          {Array.isArray(reviews) && reviews.map((item) => (
            <div key={item.id} className="aurateach-sec7__card">
              
              <h3 className="aurateach-sec7__author">{item.author}</h3>
              <p className="aurateach-sec7__role">{item.role}</p>
              
              {/* Hàng hiển thị 5 ngôi sao vàng cố định kèm số điểm */}
              <div className="aurateach-sec7__rating">
                <div className="aurateach-sec7__stars">
                  {[...Array(5)].map((_, index) => (
                    <svg key={index} className="aurateach-sec7__star-icon" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
                    </svg>
                  ))}
                </div>
                <span className="aurateach-sec7__score">{Number(item.rating).toFixed(1)}</span>
              </div>

              {/* Nội dung đoạn nhận xét */}
              <p className="aurateach-sec7__content">“{item.content}”</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ReviewSection;