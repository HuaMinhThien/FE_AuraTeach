"use client";

import React from "react";
import styles from "./schedule.module.css";

export default function SchedulePage() {
  // 🔥 TÍNH TOÁN TRỰC TIẾP (Không dùng useState và useEffect nữa)
  const today = new Date();
  const currentDay = today.getDay(); // 0: Chủ Nhật, 1: Thứ 2...
  
  // Tìm ngày đầu tuần (Thứ 2)
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const labels = ["THU 2", "THU 3", "THU 4", "THU 5", "THU 6", "THU 7", "CHỦ NHẬT"];
  
  // Tạo mảng 7 ngày trực tiếp trong lúc render
  const currentWeekDays = labels.map((label, i) => {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    return {
      name: label,
      num: nextDay.getDate(),
      isActive: nextDay.toDateString() === today.toDateString(), // Đánh dấu ngày hôm nay
      isSunday: i === 6,
    };
  });

  const currentMonthYear = `Tháng ${today.getMonth() + 1}, ${today.getFullYear()}`;

  // Mảng tự động tạo ra đủ 24 tiếng (từ 00:00 đến 23:00)
  const full24Hours = Array.from({ length: 24 }, (_, index) => {
    return `${index.toString().padStart(2, "0")}:00`;
  });

  return (
    <div className={styles.container}>
      {/* 1. HEADER SECTION */}
      <div className={styles.headerFlex}>
        <div className={styles.headerLeft}>
          <h1>Lịch trình giảng dạy</h1>
          <p>Quản lý các tiết dạy và thời gian trống trong tuần này.</p>
        </div>
        <button className={styles.addBtn}>
          <span>➕</span> Thêm lịch trống
        </button>
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG THỜI GIAN DỰA THEO THỜI GIAN THỰC */}
      <div className={styles.navBar}>
        <div className={styles.dateControl}>
          <button className={styles.arrowBtn}>&lt;</button>
          <span className={styles.currentDate}>{currentMonthYear}</span>
          <button className={styles.arrowBtn}>&gt;</button>
          <button className={styles.todayBtn}>Hôm nay</button>
        </div>
        
        <div className={styles.viewToggle}>
          <button className={styles.toggleBtn}>Tháng</button>
          <button className={`${styles.toggleBtn} ${styles.activeToggle}`}>Tuần</button>
          <button className={styles.toggleBtn}>Ngày</button>
        </div>
      </div>

      {/* 3. LƯỚI LỊCH TRÌNH CỐ ĐỊNH KÍCH THƯỚC */}
      <div className={styles.calendarOuterWrapper}>
        
        {/* HÀNG HEADER THỨ/NGÀY CỐ ĐỊNH TRÊN CÙNG KHI CUỘN */}
        <div className={styles.stickyHeaderRow}>
          <div className={styles.gridHeader} style={{ fontWeight: "700" }}>GMT+7</div>
          {currentWeekDays.map((day, idx) => (
            <div 
              key={idx} 
              className={`${styles.gridHeader} ${day.isActive ? styles.activeDayHeader : ""} ${day.isSunday ? styles.sundayHeader : ""}`}
            >
              <span>{day.name}</span>
              <span className={styles.dayNumber}>{day.num}</span>
            </div>
          ))}
        </div>

        {/* KHỐI NỘI DUNG CHỨA 24 TIẾNG CÓ THANH CUỘN DỌC */}
        <div className={styles.scrollContainer}>
          <div className={styles.scheduleGrid}>
            
            {full24Hours.map((hour) => {
              return (
                <React.Fragment key={hour}>
                  {/* Cột mốc giờ */}
                  <div className={styles.timeColCell}>{hour}</div>
                  
                  {/* 7 Ô dữ liệu tương ứng với 7 ngày của mốc giờ đó */}
                  {Array(7).fill(null).map((_, dayIdx) => {
                    // Dữ liệu mẫu hiển thị
                    if (hour === "08:00" && dayIdx === 0) {
                      return (
                        <div key={dayIdx} className={styles.gridCell}>
                          <div className={`${styles.slotCard} ${styles.bookedClass1}`}>
                            <div className={styles.classTitle}>Toán lớp 9 - Ôn tập</div>
                            <div className={styles.tutorName}>👤 Nguyễn Văn An</div>
                            <button className={styles.meetBtn}>🔗 Vào lớp</button>
                          </div>
                        </div>
                      );
                    }
                    if (hour === "08:00" && dayIdx === 3) {
                      return (
                        <div key={dayIdx} className={styles.gridCell}>
                          <div className={`${styles.slotCard} ${styles.emptySlot}`}>
                            <span>📅 Trống</span>
                          </div>
                        </div>
                      );
                    }
                    if (hour === "09:00" && dayIdx === 2) {
                      return (
                        <div key={dayIdx} className={styles.gridCell}>
                          <div className={`${styles.slotCard} ${styles.bookedClass2}`}>
                            <div className={styles.classTitle}>Lý lớp 12 - Giải đề</div>
                            <div className={styles.tutorName}>Trần Thị Bé •</div>
                          </div>
                        </div>
                      );
                    }
                    if (hour === "13:00" && dayIdx === 2) {
                      return (
                        <div key={dayIdx} className={styles.gridCell}>
                          <div className={`${styles.slotCard} ${styles.emptySlot}`}>
                            <span>📅 Trống</span>
                          </div>
                        </div>
                      );
                    }

                    return <div key={dayIdx} className={styles.gridCell}></div>;
                  })}
                </React.Fragment>
              );
            })}

          </div>
        </div>

      </div>

      {/* 4. THANH THỐNG KÊ TỔNG QUAN PHÍA DƯỚI */}
      <div className={styles.statsBar}>
        <div className={styles.legendList}>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ backgroundColor: "#1e3a8a" }}></div>
            <span>Lớp học đã đăng ký</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ backgroundColor: "#ffedd5", border: "1px dashed #f97316" }}></div>
            <span>Lịch trống sẵn sàng</span>
          </div>
        </div>

        <div className={styles.rightStats}>
          <div className={styles.statGroup}>
            <span className={styles.statValue}>12</span>
            <span className={styles.statLabel}>Giờ dạy tuần này</span>
          </div>
          <div className={styles.statGroup}>
            <span className={styles.statValue} style={{ color: "#2563eb" }}>04</span>
            <span className={styles.statLabel}>Lịch trống còn lại</span>
          </div>
        </div>
      </div>
    </div>
  );
}