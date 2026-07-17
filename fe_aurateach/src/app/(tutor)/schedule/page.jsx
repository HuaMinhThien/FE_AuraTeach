"use client";

import React, { useState, useEffect } from "react";
import courseService from "@/services/courseService";
import authService from "@/services/authService";
import styles from "./schedule.module.css";
import { 
  COURSE_LABELS, 
  MAP_SCHEDULE_DAY_INDEX, 
  getColorForCourse 
} from "@/services/courseService";

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveCourses() {
      try {
        setLoading(true);
        
        const user = await authService.getCurrentUser();
        const currentUserId = user?.id || user?.user_id;

        const response = await courseService.getActiveCourses(currentUserId);
        console.log("Dữ liệu thô từ API:", response); // 👈 Bật F12 xem console in ra cấu trúc gì

        // Xử lý bóc tách linh hoạt mọi định dạng trả về của Laravel
        let coursesData = [];
        if (Array.isArray(response)) {
          coursesData = response;
        } else if (Array.isArray(response?.data)) {
          coursesData = response.data; // Trường hợp trả về { success: true, data: [...] }
        } else if (Array.isArray(response?.data?.data)) {
          coursesData = response.data.data; // Trường hợp dùng paginate() của Laravel
        }

        setCourses(coursesData);
      } catch (error) {
        console.error("Lỗi khi tải lịch học:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveCourses();
  }, []);

  // TÍNH TOÁN CÁC NGÀY TRONG TUẦN ĐANG XEM
  const todayString = new Date().toDateString();
  const currentDay = currentDate.getDay(); 
  
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() + mondayOffset);

  const currentWeekDays = COURSE_LABELS.map((label, i) => {
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

  const renderCourseCards = () => {
    const cards = [];

    courses.forEach((crs, courseIdx) => {
      if (!crs.time_slot || !crs.time_slot.includes("-")) return;

      const colorStyle = getColorForCourse(crs._id || crs.id || crs.course_name);
      const [start, end] = crs.time_slot.split("-");
      const startHour = parseInt(start.split(":")[0]);
      const endHour = parseInt(end.split(":")[0]);
      const duration = endHour - startHour;

      const topPosition = startHour * ROW_HEIGHT;
      const cardHeight = duration * ROW_HEIGHT - 8; 

      let scheduleDays = [];
      if (Array.isArray(crs.schedule_days)) {
        scheduleDays = crs.schedule_days;
      } else if (typeof crs.schedule_days === "string") {
        try {
          scheduleDays = JSON.parse(crs.schedule_days);
        } catch (e) {
          scheduleDays = [];
        }
      }

      scheduleDays.forEach((dayStr) => {
        const dayIdx = MAP_SCHEDULE_DAY_INDEX[dayStr];
        if (dayIdx === undefined) return;

        const targetDayInstance = currentWeekDays[dayIdx].dateObj;
        const targetDateKey = new Date(targetDayInstance.getFullYear(), targetDayInstance.getMonth(), targetDayInstance.getDate());

        if (crs.start_date) {
          const startLimit = new Date(crs.start_date);
          startLimit.setHours(0,0,0,0);
          if (targetDateKey < startLimit) return;
        }

        if (crs.end_date) {
          const endLimit = new Date(crs.end_date);
          endLimit.setHours(0,0,0,0);
          if (targetDateKey > endLimit) return;
        }

        const leftPosition = (dayIdx * 100) / 7;

        cards.push(
          <div
            key={`${courseIdx}-${dayStr}`}
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
              <div className={styles.classTitle} title={crs.title} style={{ color: colorStyle.text }}>
                {crs.title}
              </div>
              <span className={styles.timeBadge} style={{ backgroundColor: "rgba(0, 0, 0, 0.05)", color: colorStyle.text }}>
                {crs.time_slot}
              </span>
            </div>
            
            <div className={styles.cardFooterFlex}>
              <div className={styles.tutorName} style={{ color: colorStyle.text }}>
                👤 {crs.student_count > 0 ? crs.student_details[0].full_name : "Chưa có HS"}
              </div>
              {crs.permanent_room_url && (
                <a
                  href={crs.permanent_room_url}
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

  const renderCards = renderCourseCards();
  const totalHoursThisWeek = courses.reduce((total, crs) => {
    if (!crs.time_slot || !crs.time_slot.includes("-")) return total;
    const [start, end] = crs.time_slot.split("-");
    const diff = parseInt(end.split(":")[0]) - parseInt(start.split(":")[0]);

    let actualDaysInWeek = 0;

    const scheduleDays = Array.isArray(crs.schedule_days) ? crs.schedule_days : [];

    scheduleDays.forEach((dayStr) => {
      const dayIdx = MAP_SCHEDULE_DAY_INDEX[dayStr];
      if (dayIdx === undefined) return;
      const targetDayInstance = currentWeekDays[dayIdx].dateObj;
      const targetDateKey = new Date(targetDayInstance.getFullYear(), targetDayInstance.getMonth(), targetDayInstance.getDate());

      let isValid = true;
      if (crs.start_date && targetDateKey < new Date(crs.start_date).setHours(0,0,0,0)) isValid = false;
      if (crs.end_date && targetDateKey > new Date(crs.end_date).setHours(0,0,0,0)) isValid = false;
      
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
            <span>Khoá học đang hoạt động</span>
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