"use client";
import React, { useEffect, useState, useRef } from "react";


// Thành phần chạy số độc lập
const AnimatedCounter = ({ target, duration = 2000, isFormatted = false }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const hasAnimated = useRef(false); // Tránh chạy lại hiệu ứng nhiều lần

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Khi phần tử xuất hiện trên màn hình và chưa từng chạy hiệu ứng
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime = null;

          const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            
            // Tính toán tỷ lệ phần trăm thời gian đã trôi qua
            const progressRatio = Math.min(progress / duration, 1);
            
            // Sử dụng hiệu ứng Ease-Out để số chạy chậm dần khi gần về đích
            const easeOutQuad = progressRatio * (2 - progressRatio);
            
            const currentCount = Math.floor(easeOutQuad * target);
            setCount(currentCount);

            if (progress < duration) {
              requestAnimationFrame(animate);
            } else {
              setCount(target); // Đảm bảo số cuối cùng khớp chính xác với target
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 } // Kích hoạt khi thấy 10% cấu trúc phần tử
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [target, duration]);

  // Định dạng hiển thị dấu chấm phần ngàn (Ví dụ: 5000 thành 5.000)
  const formatNumber = (num) => {
    if (isFormatted) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    return num;
  };

  return <span ref={elementRef}>{formatNumber(count)}</span>;
};

export default function StatsSection() {
  return (
    <section className="stats-section">
      <div className="stats-container">
        
        {/* <!-- CỘT 1: GIA SƯ --> */}
        <div className="stat-item">
          <div className="stat-icon-wrapper">
            {/* Icon Nhóm người/Gia sư */}
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="stat-number-text">
            <AnimatedCounter target={500} />+
          </h2>
          <p className="stat-label-text">Gia sư kinh nghiệm</p>
        </div>

        {/* <!-- CỘT 2: MÔN HỌC --> */}
        <div className="stat-item">
          <div className="stat-icon-wrapper">
            {/* Icon Cuốn sách */}
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.438s-3.188-3.125-9-3.125V5.313c5.813 0 9 3.124 9 3.124s3.188-3.124 9-3.124v13c-5.813 0-9 3.125-9 3.125zM12 8.438v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="stat-number-text">
            <AnimatedCounter target={6} />+
          </h2>
          <p className="stat-label-text">Môn học & Khóa học</p>
        </div>

        {/* <!-- CỘT 3: GIỜ HỌC --> */}
        <div className="stat-item">
          <div className="stat-icon-wrapper">
            {/* Icon Huy chương đạt chuẩn */}
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15a6 6 0 100-12 6 6 0 000 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.21 13.89L7 21l5-3 5 3-1.21-7.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="stat-number-text">
            <AnimatedCounter target={5000} isFormatted={true} />+
          </h2>
          <p className="stat-label-text">Giờ học đã hoàn thành</p>
        </div>

      </div>
    </section>
  );
}