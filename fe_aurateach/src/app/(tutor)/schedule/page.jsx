"use client";

import React, { useState, useEffect } from "react";
import styles from "./schedule.module.css";
import { getClassroomRoomPath } from "@/utils/roomUtils";

const API_BASE = "http://localhost:3007";

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

const getUserIdFromCookie = () => {
  try {
    const cookies = document.cookie.split("; ");
    const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));
    if (userInfoCookie) {
      const cookieValue = userInfoCookie.split("=")[1];
      const decodedValue = decodeURIComponent(cookieValue);
      const userInfo = JSON.parse(decodedValue);
      return userInfo.user_id || userInfo.id || null;
    }
  } catch (error) {
    console.error("Lỗi đọc cookie:", error);
  }
  return null;
};

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveClasses() {
      try {
        setLoading(true);
        
        const userId = getUserIdFromCookie();
        if (!userId) {
          setLoading(false);
          return;
        }

        // Lấy tất cả tutors để tìm tutor_id
        const tutorsRes = await fetch(`${API_BASE}/tutors`);
        const tutors = await tutorsRes.json();
        const tutor = tutors.find(t => t.user_id === userId);
        
        if (!tutor) {
          setLoading(false);
          return;
        }

        // Lấy courses của tutor
        const res = await fetch(`${API_BASE}/courses?tutor_id=${tutor.tutor_id}`);
        const data = await res.json();
        const courses = Array.isArray(data) ? data : [];
        
        // Lọc chỉ lấy lớp active
        const activeClasses = courses.filter(c => c.status === "active");
        setClasses(activeClasses);
        
      } catch (error) {
        console.error("Lỗi khi fetch lớp học:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveClasses();
  }, []);

  // TÍNH TOÁN CÁC NGÀY TRONG TUẦN
  const todayString = new Date().toDateString();
  const currentDay = currentDate.getDay(); 
  
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() + mondayOffset);

  const labels = ["THU 2", "THU 3", "THU 4", "THU 5", "THU 6", "THU 7", "CHỦ NHẬT"];
  const mapScheduleDayIndex = {
    "Thứ 2": 0, "Thứ 3": 1, "Thứ 4": 2, "Thứ 5": 3, "Thứ 6": 4, "Thứ 7": 5, "Chủ Nhật": 6
  };

  const currentWeekDays = labels.map((label, i) => {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    return {
      name: label,
      num: nextDay.getDate(),
      dateObj: nextDay,
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

  // Tính tổng số giờ dạy thực tế
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

        const targetDayInstance = currentWeekDays[dayIdx].dateObj;
        const targetDateKey = new Date(targetDayInstance.getFullYear(), targetDayInstance.getMonth(), targetDayInstance.getDate());

        if (cls.start_date) {
          const startLimit = new Date(cls.start_date);
          startLimit.setHours(0,0,0,0);
          if (targetDateKey < startLimit) return;
        }

        if (cls.end_date) {
          const endLimit = new Date(cls.end_date);
          endLimit.setHours(0,0,0,0);
          if (targetDateKey > endLimit) return;
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
                {cls.title || cls.class_name}
              </div>
              <span className={styles.timeBadge} style={{ backgroundColor: "rgba(0, 0, 0, 0.05)", color: colorStyle.text }}>
                {cls.time_slot}
              </span>
            </div>
            
            <div className={styles.cardFooterFlex}>
              <div className={styles.tutorName} style={{ color: colorStyle.text }}>
                👤 {cls.students?.length || 0} học viên
              </div>
              {cls && (
                <a
                  href={getClassroomRoomPath(cls, "tutor")}
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

  const renderCards = renderClassCards();
  
  // Tính tổng số giờ dạy dự kiến trong tuần này
  const totalHoursThisWeek = classes.reduce((total, cls) => {
    if (!cls.time_slot || !cls.time_slot.includes("-")) return total;
    const [start, end] = cls.time_slot.split("-");
    const diff = parseInt(end.split(":")[0]) - parseInt(start.split(":")[0]);

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
      <div className={styles.headerFlex}>
        <div className={styles.headerLeft}>
          <h1>Lịch trình giảng dạy</h1>
          <p>Quản lý các tiết dạy và thời gian trống trong tuần này.</p>
        </div>
        <button className={styles.addBtn}>
          <span>➕</span> Thêm lịch trống
        </button>
      </div>

      <div className={styles.navBar}>
        <div className={styles.dateControl}>
          <button className={styles.arrowBtn} onClick={handlePrevWeek}>&lt;</button>
          <span className={styles.currentDate}>{currentMonthYear}</span>
          <button className={styles.arrowBtn} onClick={handleNextWeek}>&gt;</button>
          <button className={styles.todayBtn} onClick={handleGoToToday}>Hôm nay</button>
        </div>
      </div>

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
          ) : classes.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", width: "100%", color: "#94a3b8" }}>
              Chưa có lớp học nào để hiển thị
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
          <div className={styles.statGroup}>
            <span className={styles.statValue}>{classes.length}</span>
            <span className={styles.statLabel}>Lớp học đang mở</span>
          </div>
        </div>
      </div>
    </div>
  );
}