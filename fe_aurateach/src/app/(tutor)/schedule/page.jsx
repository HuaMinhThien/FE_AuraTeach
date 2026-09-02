"use client";

import React, { useState, useEffect } from "react";
import styles from "./schedule.module.css";
import { tutorService } from "@/services/tutorService";
import { courseService } from "@/services/courseService";
import { classSessionService } from "@/services/classSessionService";

// Màu thống nhất theo theme xanh navy của AuraTeach
const CLASS_COLOR = {
  bg: "#eef2ff",
  text: "#1e40af",
  border: "#0a37a3",
};

const MAKEUP_COLOR = {
  bg: "#fff7ed",
  text: "#c2410c",
  border: "#ea580c",
};

const getColorForClass = () => CLASS_COLOR;
const getColorForMakeup = () => MAKEUP_COLOR;


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
  const [makeupSessions, setMakeupSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchedule() {
      try {
        setLoading(true);
        const userId = getUserIdFromCookie();
        if (!userId) {
          setLoading(false);
          return;
        }

        // 1. Gọi hàm getByUserId có sẵn trong tutorService
        const tutorData = await tutorService.getByUserId(userId);
        
        // Trích xuất tutor_id từ kết quả trả về (hỗ trợ cả dạng mảng lẫn object)
        const tutor = Array.isArray(tutorData) ? tutorData[0] : tutorData;
        const tutorId = tutor?.tutor_id || tutor?.id || tutor?._id;

        if (!tutorId) {
          setLoading(false);
          return;
        }

        // 2. Gọi hàm getCourses có sẵn trong courseService
        const coursesData = await courseService.getCourses({ tutor_id: tutorId });
        const courses = Array.isArray(coursesData) ? coursesData : (coursesData.data || []);
        
        // Lọc các lớp active
        const activeClasses = courses.filter(c => c.status === "active");
        setClasses(activeClasses);

        // ===== Load buổi học bù =====
        const courseIds = activeClasses.map(c => c.course_id || c.id).filter(Boolean);
        if (courseIds.length > 0) {
          try {
            const sessionsRes = await classSessionService.getSessions({ course_ids: courseIds.join(",") });
            const allSessions = Array.isArray(sessionsRes) ? sessionsRes : (sessionsRes?.data || []);
            const makeups = allSessions.filter(
              s => s.is_makeup === true &&
                   courseIds.includes(s.course_id) &&
                   (s.session_status || s.status) !== "cancelled"
            );
            setMakeupSessions(makeups);
          } catch {
            setMakeupSessions([]);
          }
        } else {
          setMakeupSessions([]);
        }
      } catch (error) {
        console.error("Lỗi tải lịch học:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSchedule();
  }, []);

  // Các phần logic hiển thị lịch và giao diện giữ nguyên...
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

  const renderClassCards = () => {
    const cards = [];

    classes.forEach((cls, classIdx) => {
      if (!cls.time_slot || !cls.time_slot.includes("-")) return;

      const colorStyle = getColorForClass();
      const [start, end] = cls.time_slot.split("-");
      const startHour = parseInt(start.split(":")[0]);
      const endHour = parseInt(end.split(":")[0]);
      const duration = endHour - startHour;

      const topPosition = startHour * ROW_HEIGHT;
      const cardHeight = duration * ROW_HEIGHT - 8; 

      if (!cls.schedule_days) return;
      
      // Handle cả JSON string lẫn array
      let scheduleDaysArr = cls.schedule_days;
      if (typeof scheduleDaysArr === 'string') {
        try { scheduleDaysArr = JSON.parse(scheduleDaysArr); } catch { return; }
      }
      if (!Array.isArray(scheduleDaysArr)) return;

      scheduleDaysArr.forEach((dayStr) => {
        const dayIdx = mapScheduleDayIndex[dayStr];
        if (dayIdx === undefined) return;

        const targetDayInstance = currentWeekDays[dayIdx].dateObj;
        const targetDateKey = new Date(
          targetDayInstance.getFullYear(),
          targetDayInstance.getMonth(),
          targetDayInstance.getDate()
        );

        if (cls.start_date && targetDateKey < new Date(cls.start_date).setHours(0,0,0,0)) return;
        if (cls.end_date && targetDateKey > new Date(cls.end_date).setHours(0,0,0,0)) return;

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
              <div
                className={styles.classTitle}
                title={cls.class_name}
                style={{ color: colorStyle.text }}
              >                
              {cls.title || cls.class_name}
              </div>
              <span
                className={styles.timeBadge}
                style={{
                  backgroundColor: "rgba(10, 55, 163, 0.08)",
                  color: colorStyle.text,
                }}
              >                
              {cls.time_slot}
              </span>
            </div>
            
            <div className={styles.cardFooterFlex}>
              <div className={styles.tutorName} style={{ color: colorStyle.text }}>
                👤 {cls.students?.length || 0} học viên
              </div>
              {cls.permanent_room_url && (
                <a
                  href={cls.permanent_room_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.meetBtn}
                  style={{ backgroundColor: colorStyle.border, color: "#ffffff" }}
                >
                  Vào lớp
                </a>
              )}
            </div>
          </div>
        );
      });
    });

    makeupSessions.forEach((session) => {
      if (!session.actual_date || !session.start_time || !session.end_time) return;

      const sessionDate = new Date(session.actual_date);
      const sessionDateOnly = new Date(
        sessionDate.getFullYear(),
        sessionDate.getMonth(),
        sessionDate.getDate()
      );

      // Tìm xem buổi này có nằm trong tuần đang xem không
      const dayIdx = currentWeekDays.findIndex((d) => {
        const dOnly = new Date(
          d.dateObj.getFullYear(),
          d.dateObj.getMonth(),
          d.dateObj.getDate()
        );
        return dOnly.getTime() === sessionDateOnly.getTime();
      });

      if (dayIdx === -1) return; // không thuộc tuần này

      const colorStyle = getColorForMakeup();
      const startHour = parseInt(session.start_time.split(":")[0]);
      const endHour = parseInt(session.end_time.split(":")[0]);
      const duration = Math.max(endHour - startHour, 1);

      const topPosition = startHour * ROW_HEIGHT;
      const cardHeight = duration * ROW_HEIGHT - 8;
      const leftPosition = (dayIdx * 100) / 7;

      // Tìm tên lớp từ courses
      const relatedCourse = classes.find(
        (c) => (c.course_id || c.id) === session.course_id
      );
      const className =
        relatedCourse?.title ||
        relatedCourse?.class_name ||
        session.lesson_title ||
        "Buổi học bù";

      cards.push(
        <div
          key={`makeup-${session.session_id || session.id}`}
          className={styles.slotCard}
          style={{
            top: `${topPosition}px`,
            left: `calc(${leftPosition}% + 4px)`,
            width: `calc(${100 / 7}% - 8px)`,
            height: `${cardHeight}px`,
            backgroundColor: colorStyle.bg,
            color: colorStyle.text,
            borderLeft: `4px solid ${colorStyle.border}`,
          }}
        >
          <div className={styles.cardHeaderFlex}>
            <div
              className={styles.classTitle}
              title={className}
              style={{ color: colorStyle.text }}
            >
              {className}
            </div>
            <span
              className={styles.timeBadge}
              style={{
                backgroundColor: "rgba(234, 88, 12, 0.12)",
                color: colorStyle.text,
              }}
            >
              {session.start_time} - {session.end_time}
            </span>
          </div>

          <div className={styles.cardFooterFlex}>
            <div className={styles.tutorName} style={{ color: colorStyle.text }}>
              🔄 Học bù
            </div>
            {relatedCourse?.permanent_room_url && (
              <a
                href={relatedCourse.permanent_room_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.meetBtn}
                style={{ backgroundColor: colorStyle.border, color: "#ffffff" }}
              >
                Vào lớp
              </a>
            )}
          </div>
        </div>
      );
    });

    return cards;
  };

  const renderCards = renderClassCards();
  
  const totalHoursThisWeek = classes.reduce((total, cls) => {
    if (!cls.time_slot || !cls.time_slot.includes("-")) return total;
    const [start, end] = cls.time_slot.split("-");
    const diff = parseInt(end.split(":")[0]) - parseInt(start.split(":")[0]);

    let scheduleDaysArr = cls.schedule_days;
    if (typeof scheduleDaysArr === 'string') {
      try { scheduleDaysArr = JSON.parse(scheduleDaysArr); } catch { return total; }
    }
    if (!Array.isArray(scheduleDaysArr)) return total;

    let actualDaysInWeek = 0;
    scheduleDaysArr.forEach((dayStr) => {
      const dayIdx = mapScheduleDayIndex[dayStr];
      if (dayIdx === undefined) return;
      const targetDayInstance = currentWeekDays[dayIdx].dateObj;
      const targetDateKey = new Date(
        targetDayInstance.getFullYear(),
        targetDayInstance.getMonth(),
        targetDayInstance.getDate()
      );

      let isValid = true;
      if (cls.start_date && targetDateKey < new Date(cls.start_date).setHours(0, 0, 0, 0))
        isValid = false;
      if (cls.end_date && targetDateKey > new Date(cls.end_date).setHours(0, 0, 0, 0))
        isValid = false;
      
      if (isValid) actualDaysInWeek++;
    });

    return total + diff * actualDaysInWeek;
  }, 0);

  return (
    <div className={styles.container}>
      <div className={styles.headerFlex}>
        <div className={styles.headerLeft}>
          <h1>Lịch trình giảng dạy</h1>
          <p>Quản lý các tiết dạy và thời gian trống trong tuần này.</p>
        </div>
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
          ) : classes.length === 0 && makeupSessions.length === 0 ? (
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
            <div
              className={styles.colorDot}
              style={{ backgroundColor: "#eef2ff", border: "2px solid #0a37a3" }}
            ></div>            
            <span>Lớp học đang hoạt động</span>
          </div>
          <div className={styles.legendItem}>
            <div
              className={styles.colorDot}
              style={{
                backgroundColor: "#fff7ed",
                border: "2px solid #ea580c",
              }}
            ></div>
            <span>Buổi học bù</span>
          </div>
          <div className={styles.legendItem}>
            <div
              className={styles.colorDot}
              style={{
                backgroundColor: "#ffedd5",
                border: "1px dashed #f97316",
              }}
            ></div>            
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