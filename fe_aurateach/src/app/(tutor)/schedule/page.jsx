"use client";

import React, { useState, useEffect } from "react";
import styles from "./schedule.module.css";

const CLASS_COLORS = [
  { bg: "#e0f2fe", text: "#0369a1", border: "#0ea5e9" },
  { bg: "#fef3c7", text: "#b45309", border: "#f59e0b" },
  { bg: "#dcfce7", text: "#15803d", border: "#22c55e" },
  { bg: "#f3e8ff", text: "#6b21a8", border: "#a855f7" },
  { bg: "#ffe4e6", text: "#b91c1c", border: "#f43f5e" },
  { bg: "#ffedd5", text: "#c2410c", border: "#f97316" },
  { bg: "#e2e8f0", text: "#334155", border: "#64748b" },
];

const getColorForClass = (classId) => {
  if (!classId) return CLASS_COLORS[0];
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = classId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CLASS_COLORS.length;
  return CLASS_COLORS[index];
};

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // FETCH API DATA
  useEffect(() => {
    async function fetchActiveClasses() {
      try {
        setLoading(true);
        const res = await fetch("/api/classes?status=active&limit=100");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setClasses(json.data);
        }
      } catch (error) {
        console.error("Lỗi khi fetch lớp học:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveClasses();
  }, []);

  // TÍNH TOÁN CÁC NGÀY TRONG TUẦN ĐANG XEM
  const todayString = new Date().toDateString();
  const currentDay = currentDate.getDay(); 
  
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() + mondayOffset);

  const labels = ["THU 2", "THU 3", "THU 4", "THU 5", "THU 6", "THU 7", "CHỦ NHẬT"];
  const mapScheduleDayIndex = {
    "Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4, "Thứ 7": 5, "Chủ Nhật": 6
  };

  // Mảng chứa thông tin chi tiết (bao gồm đối tượng Date cụ thể) của 7 ngày trong tuần đang xem
  const currentWeekDays = labels.map((label, i) => {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    return {
      name: label,
      num: nextDay.getDate(),
      dateObj: nextDay, // Giữ lại đối tượng Date để so sánh khoảng thời gian
      isActive: nextDay.toDateString() === todayString,
      isSunday: i === 6,
    };
  });

  const currentMonthYear = `Tháng ${monday.getMonth() + 1}, ${monday.getFullYear()}`;

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const full24Hours = Array.from({ length: 24 }, (_, index) => {
    return `${index.toString().padStart(2, "0")}:00`;
  });

  const ROW_HEIGHT = 75; 

  // TÍNH TOÁN VỊ TRÍ VÀ ĐỔ MÀU LỚP HỌC (ĐÃ THÊM LOGIC LỌC NGÀY THÁNG)
  const renderClassCards = () => {
    const cards = [];

    classes.forEach((cls, classIdx) => {
      if (!cls.time_slot || !cls.time_slot.includes("-")) return;

      const colorStyle = getColorForClass(cls._id || cls.id || cls.class_name);
      const [start, end] = cls.time_slot.split("-");
      const startHour = parseInt(start.split(":")[0]);
      const endHour = parseInt(end.split(":")[0]);
      const duration = endHour - startHour;

      const topPosition = startHour * ROW_HEIGHT;
      const cardHeight = duration * ROW_HEIGHT - 8; 

      cls.schedule_days.forEach((dayStr) => {
        const dayIdx = mapScheduleDayIndex[dayStr];
        if (dayIdx === undefined) return;

        // 💡 BƯỚC QUAN TRỌNG: Lấy ngày Date cụ thể của "Thứ X" trong tuần đang xem
        const targetDayInstance = currentWeekDays[dayIdx].dateObj;

        // Reset giờ về 00:00:00 để so sánh chuẩn xác theo ngày
        const targetDateKey = new Date(targetDayInstance.getFullYear(), targetDayInstance.getMonth(), targetDayInstance.getDate());

        // Kiểm tra xem lớp học có ngày bắt đầu/kết thúc không. Nếu có thì đem ra so sánh.
        if (cls.start_date) {
          const startLimit = new Date(cls.start_date);
          startLimit.setHours(0,0,0,0);
          if (targetDateKey < startLimit) return; // Nếu ngày đang xem trước ngày bắt đầu khóa học -> Bỏ qua
        }

        if (cls.end_date) {
          const endLimit = new Date(cls.end_date);
          endLimit.setHours(0,0,0,0);
          if (targetDateKey > endLimit) return; // Nếu ngày đang xem sau ngày kết thúc khóa học -> Bỏ qua
        }

        const leftPosition = (dayIdx * 100) / 7;

        cards.push(
          <div
            key={`${classIdx}-${dayStr}`}
            className={styles.slotCard}
            style={{
              top: `${topPosition}px`,
              left: `calc(${leftPosition}% + 4px)`,
              width: `calc(${100 / 7}% - 8px)`,
              height: `${cardHeight}px`,
              backgroundColor: colorStyle.bg,
              color: colorStyle.text,
              borderLeft: `4px solid ${colorStyle.border}`
            }}
          >
            <div className={styles.cardHeaderFlex}>
              <div className={styles.classTitle} title={cls.class_name} style={{ color: colorStyle.text }}>
                {cls.class_name}
              </div>
              <span className={styles.timeBadge} style={{ backgroundColor: "rgba(0, 0, 0, 0.05)", color: colorStyle.text }}>
                {cls.time_slot}
              </span>
            </div>
            
            <div className={styles.cardFooterFlex}>
              <div className={styles.tutorName} style={{ color: colorStyle.text }}>
                👤 {cls.student_count > 0 ? cls.student_details[0].full_name : "Chưa có HS"}
              </div>
              {cls.permanent_room_url && (
                <a
                  href={cls.permanent_room_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.meetBtn}
                  style={{ backgroundColor: colorStyle.text, color: "#ffffff" }}
                >
                  Vào lớp
                </a>
              )}
            </div>
          </div>
        );
      });
    });

    return cards;
  };

  // Tính tổng số giờ dạy dựa trên danh sách thẻ thực tế hiển thị trong tuần này
  const renderCards = renderClassCards();
  const totalHoursThisWeek = classes.reduce((total, cls) => {
    if (!cls.time_slot.includes("-")) return total;
    const [start, end] = cls.time_slot.split("-");
    const diff = parseInt(end.split(":")[0]) - parseInt(start.split(":")[0]);

    // Đếm xem trong tuần đang chọn, lớp này được hiển thị bao nhiêu buổi thực tế
    let actualDaysInWeek = 0;
    cls.schedule_days.forEach((dayStr) => {
      const dayIdx = mapScheduleDayIndex[dayStr];
      if (dayIdx === undefined) return;
      const targetDayInstance = currentWeekDays[dayIdx].dateObj;
      const targetDateKey = new Date(targetDayInstance.getFullYear(), targetDayInstance.getMonth(), targetDayInstance.getDate());

      let isValid = true;
      if (cls.start_date && targetDateKey < new Date(cls.start_date).setHours(0,0,0,0)) isValid = false;
      if (cls.end_date && targetDateKey > new Date(cls.end_date).setHours(0,0,0,0)) isValid = false;
      
      if (isValid) actualDaysInWeek++;
    });

    return total + (diff * actualDaysInWeek);
  }, 0);

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

      {/* 2. NAVIGATION BAR */}
      <div className={styles.navBar}>
        <div className={styles.dateControl}>
          <button className={styles.arrowBtn} onClick={handlePrevWeek}>&lt;</button>
          <span className={styles.currentDate}>{currentMonthYear}</span>
          <button className={styles.arrowBtn} onClick={handleNextWeek}>&gt;</button>
          <button className={styles.todayBtn} onClick={handleGoToToday}>Hôm nay</button>
        </div>
      </div>

      {/* 3. LƯỚI LỊCH TRÌNH */}
      <div className={styles.calendarOuterWrapper}>
        
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

        <div className={styles.scrollContainer}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", width: "100%" }}>
              Đang tải lịch trình giảng dạy...
            </div>
          ) : (
            <div className={styles.mainGridBody}>
              
              <div className={styles.timetableGridBackground}>
                {full24Hours.map((hour) => (
                  <React.Fragment key={hour}>
                    <div className={styles.timeColCell}>{hour}</div>
                    {Array(7).fill(null).map((_, dayIdx) => (
                      <div key={dayIdx} className={styles.gridCell}></div>
                    ))}
                  </React.Fragment>
                ))}
              </div>

              <div className={styles.cardsOverlayArea}>
                {renderCards}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* 4. THANH THỐNG KÊ TỔNG QUAN */}
      <div className={styles.statsBar}>
        <div className={styles.legendList}>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ backgroundColor: "#2563eb" }}></div>
            <span>Lớp học đang hoạt động</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ backgroundColor: "#ffedd5", border: "1px dashed #f97316" }}></div>
            <span>Lịch trống sẵn sàng</span>
          </div>
        </div>

        <div className={styles.rightStats}>
          <div className={styles.statGroup}>
            <span className={styles.statValue}>{totalHoursThisWeek}</span>
            <span className={styles.statLabel}>Tổng giờ dạy dự kiến</span>
          </div>
        </div>
      </div>
    </div>
  );
}