"use client";

import React, { useState, useEffect } from 'react';

// Dữ liệu mặc định khi API chưa có endpoint honored_members
const DEFAULT_HONORED = {
  sectionTitle: 'Học viên tiêu biểu',
  studentSpotlight: {
    badge: '🏆 Học viên xuất sắc',
    quote: 'Nhờ AuraTeach tôi đã cải thiện điểm số đáng kể',
    name: 'Nguyễn Văn A',
    role: 'Học sinh lớp 12',
    resultImage: '/img/class/default-class-1.jpg',
    achievement: 'Đạt 9.5 môn Toán',
  },
  parentReview: {
    quote: 'Tôi rất hài lòng với chất lượng giảng dạy tại AuraTeach',
    avatar: '/img/avt/avt.jpg',
    name: 'Phụ huynh học sinh',
    role: 'Phụ huynh',
  },
};

function HonoredSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHonoredData = async () => {
      try {
        // 🌟 1. SỬA ĐỔI: Thêm tham số ?section=honored vào URL để lấy đúng Object dữ liệu vinh danh
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.aurateach.io.vn/api';
        const response = await fetch(`${API_URL}/admin/content-management`);
        if (!response.ok) {
          throw new Error('Không thể tải dữ liệu vinh danh');
        }
        const resData = await response.json();
        // honored_members là dữ liệu tĩnh — nếu BE chưa có thì dùng mặc định
        setData(resData.honored_members ?? resData.data?.honored_members ?? DEFAULT_HONORED);
      } catch (error) {
        console.error('Lỗi gọi API Section 6:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHonoredData();
  }, []);

  if (loading || !data || !data.studentSpotlight || !data.parentReview) {
    return (
      <div className="aurateach-sec6" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
        Đang tải dữ liệu vinh danh thành tích...
      </div>
    );
  }

  return (
    <section className="aurateach-sec6">
      {/* Tiêu đề chính */}
      <h2 className="aurateach-sec6__title">{data.sectionTitle}</h2>

      <div className="aurateach-sec6__container">
        
        {/* KHỐI BÊN TRÁI: Học viên tiêu biểu */}
        <div className="aurateach-sec6__student-card">
          <div className="aurateach-sec6__content">
            {/* 🌟 Thêm dấu hỏi chấm (?.) để đọc dữ liệu an toàn tuyệt đối */}
            <span className="aurateach-sec6__badge">{data.studentSpotlight?.badge}</span>
            <p className="aurateach-sec6__quote">“{data.studentSpotlight?.quote}”</p>
            
            <div className="aurateach-sec6__user">
              
              <div>
                <h4 className="aurateach-sec6__user-name">{data.studentSpotlight?.name}</h4>
                <p className="aurateach-sec6__user-role">{data.studentSpotlight?.role}</p>
              </div>
            </div>
          </div>

          <div className="aurateach-sec6__media-box">
            <img 
              className="aurateach-sec6__result-img" 
              src={data.studentSpotlight?.resultImage} 
              alt="Học tập thực tế" 
            />
            <span className="aurateach-sec6__achievement">{data.studentSpotlight?.achievement}</span>
          </div>
        </div>

        {/* KHỐI BÊN PHẢI: Phụ huynh/Hội đồng đánh giá */}
        <div className="aurateach-sec6__parent-card">
          <p className="aurateach-sec6__parent-quote">“{data.parentReview?.quote}”</p>
          
          <div className="aurateach-sec6__user">
            <img 
              className="aurateach-sec6__avatar" 
              src={data.parentReview?.avatar} 
              alt={data.parentReview?.name} 
            />
            <div>
              <h4 className="aurateach-sec6__user-name aurateach-sec6__user-name--light">
                {data.parentReview?.name}
              </h4>
              <p className="aurateach-sec6__user-role aurateach-sec6__user-role--light">
                {data.parentReview?.role}
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default HonoredSection;