"use client";

import React from 'react';

// Dữ liệu tĩnh — section vinh danh không phụ thuộc database
const HONORED_DATA = {
  sectionTitle: "Thành Tích Học Viên Tiêu Biểu",
  studentSpotlight: {
    badge: "🏆 Học viên xuất sắc",
    quote: "Nhờ AuraTeach, tôi đã cải thiện điểm Toán từ 5.0 lên 9.2 chỉ trong 3 tháng. Gia sư tận tâm và phương pháp giảng dạy rất phù hợp với tôi.",
    name: "Nguyễn Minh Khôi",
    role: "Học sinh lớp 12 — Đỗ Đại học Bách Khoa TP.HCM",
    resultImage: "/img/class/default-class-1.jpg",
    achievement: "Điểm Toán: 9.2/10",
  },
  parentReview: {
    quote: "Con tôi tiến bộ rõ rệt sau 2 tháng học tại AuraTeach. Gia sư không chỉ dạy kiến thức mà còn giúp con tự tin hơn trong học tập.",
    avatar: "https://res.cloudinary.com/ghbrskob/image/upload/v1786685723/aurateach_reports/v09h1kwwsnzbczsggiuy.webp",
    name: "Chị Trần Thị Lan",
    role: "Phụ huynh học sinh lớp 9",
  },
};

function HonoredSection() {
  const data = HONORED_DATA;

  return (
    <section className="aurateach-sec6">
      <h2 className="aurateach-sec6__title">{data.sectionTitle}</h2>

      <div className="aurateach-sec6__container">

        {/* KHỐI BÊN TRÁI: Học viên tiêu biểu */}
        <div className="aurateach-sec6__student-card">
          <div className="aurateach-sec6__content">
            <span className="aurateach-sec6__badge">{data.studentSpotlight.badge}</span>
            <p className="aurateach-sec6__quote">"{data.studentSpotlight.quote}"</p>
            <div className="aurateach-sec6__user">
              <div>
                <h4 className="aurateach-sec6__user-name">{data.studentSpotlight.name}</h4>
                <p className="aurateach-sec6__user-role">{data.studentSpotlight.role}</p>
              </div>
            </div>
          </div>
          <div className="aurateach-sec6__media-box">
            <img
              className="aurateach-sec6__result-img"
              src={data.studentSpotlight.resultImage}
              alt="Học tập thực tế"
            />
            <span className="aurateach-sec6__achievement">{data.studentSpotlight.achievement}</span>
          </div>
        </div>

        {/* KHỐI BÊN PHẢI: Phụ huynh đánh giá */}
        <div className="aurateach-sec6__parent-card">
          <p className="aurateach-sec6__parent-quote">"{data.parentReview.quote}"</p>
          <div className="aurateach-sec6__user">
            <img
              className="aurateach-sec6__avatar"
              src={data.parentReview.avatar}
              alt={data.parentReview.name}
              onError={(e) => { e.target.src = '/img/default-avatar.svg'; }}
            />
            <div>
              <h4 className="aurateach-sec6__user-name aurateach-sec6__user-name--light">
                {data.parentReview.name}
              </h4>
              <p className="aurateach-sec6__user-role aurateach-sec6__user-role--light">
                {data.parentReview.role}
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default HonoredSection;
