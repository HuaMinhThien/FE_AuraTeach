"use client";

import React, { useState, useEffect } from "react";
import styles from "./schedule.module.css";
import { tutorService } from "@/services/tutorService";
import { courseService } from "@/services/courseService";

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
  const [sessions, setSessions] = useState([]); // class_sessions thực tế của tuần
  const [coursesMap, setCoursesMap] = useState({}); // map course_id → course info
  const [loading, setLoading] = useState(true);

  // Tính monday của tuần hiện tại từ currentDate
  const getMondayOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const formatDateParam = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Re-fetch khi tuần thay đổi
  useEffect(() => {
    async function loadSchedule() {
      try {
        setLoading(true);
        const userId = getUserIdFromCookie();
        if (!userId) { setLoading(false); return; }

        // 1. Lấy tutor_id
        const tutorData = await tutorService.getByUserId(userId);
        const tutor = Array.isArray(tutorData) ? tutorData[0] : tutorData;
        const tutorId = tutor?.tutor_id || tutor?.id;
        if (!tutorId) { setLoading(false); return; }

        // 2. Lấy tất cả courses của gia sư (để có tên lớp, permanent_room_url)
        const courses = await courseService.getTutorScheduleCourses(tutorId);
        const map = {};
        (Array.isArray(courses) ? courses : []).forEach((c) => {
          map[c.course_id || c.id] = c;
        });
        setCoursesMap(map);

        // 3. Tính from_date / to_date của tuần đang xem
        const monday = getMondayOfWeek(currentDate);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const courseIds = Object.keys(map);
        if (courseIds.length === 0) { setSessions([]); setLoading(false); return; }

        // 4. Fetch class_sessions thực tế theo tuần
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const params = new URLSearchParams({
          course_ids: courseIds.join(','),
          from_date: formatDateParam(monday),
          to_date: formatDateParam(sunday),
        });
        const token = typeof window !== 'undefined'
          ? (localStorage.getItem('access_token') || localStorage.getItem('token') || '')
          : '';
        const res = await fetch(`${API_BASE}/class-sessions?${params}`, {
          headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : (data?.data || []));
      } catch (error) {
        console.error('Lỗi tải lịch học:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [currentDate]); // re-fetch khi đổi tuần

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

  // Parse "HH:MM" hoặc "HH:MM:SS" thành số giờ thập phân (vd: "07:30" → 7.5)
  const parseTimeToHours = (timeStr) => {
    const parts = timeStr.trim().split(":");
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return h + m / 60;
  };

  const renderClassCards = () => {
    const cards = [];

    sessions.forEach((session) => {
      if (!session.actual_date || !session.start_time || !session.end_time) return;

      const course = coursesMap[session.course_id] || session.course || {};
      const isMakeup = session.is_makeup == true || session.session_type === 'makeup';
      const colorStyle = isMakeup ? getColorForMakeup() : getColorForClass();

      // Tìm dayIdx trong tuần hiện tại
      const sessionDate = new Date(session.actual_date);
      const sessionDateOnly = new Date(
        sessionDate.getFullYear(),
        sessionDate.getMonth(),
        sessionDate.getDate()
      );
      const dayIdx = currentWeekDays.findIndex((d) => {
        const dOnly = new Date(
          d.dateObj.getFullYear(),
          d.dateObj.getMonth(),
          d.dateObj.getDate()
        );
        return dOnly.getTime() === sessionDateOnly.getTime();
      });
      if (dayIdx === -1) return;

      const startHours = parseTimeToHours(session.start_time);
      const endHours = parseTimeToHours(session.end_time);
      const topPosition = startHours * ROW_HEIGHT;
      const cardHeight = (endHours - startHours + 1) * ROW_HEIGHT - 4;
      const leftPosition = (dayIdx * 100) / 7;

      const className = course.title || course.class_name || session.lesson_title || 'Buổi học';
      const timeLabel = `${session.start_time.slice(0, 5)} - ${session.end_time.slice(0, 5)}`;
      const roomUrl = course.permanent_room_url || null;

      cards.push(
        <div
          key={session.session_id || session.id}
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
            <div className={styles.classTitle} title={className} style={{ color: colorStyle.text }}>
              {isMakeup ? '🔄 ' : ''}{className}
            </div>
            <span
              className={styles.timeBadge}
              style={{
                backgroundColor: isMakeup ? 'rgba(234, 88, 12, 0.12)' : 'rgba(10, 55, 163, 0.08)',
                color: colorStyle.text,
              }}
            >
              {timeLabel}
            </span>
          </div>
          <div className={styles.cardFooterFlex}>
            <div className={styles.tutorName} style={{ color: colorStyle.text }}>
              {isMakeup ? '🔄 Học bù' : `👤 ${course.students?.length || 0} học viên`}
            </div>
            {roomUrl && (
              <a
                href={roomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.meetBtn}
                style={{ backgroundColor: colorStyle.border, color: '#ffffff' }}
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
  
  const totalHoursThisWeek = sessions.reduce((total, session) => {
    if (!session.start_time || !session.end_time) return total;
    return total + (parseTimeToHours(session.end_time) - parseTimeToHours(session.start_time));
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
          ) : sessions.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", width: "100%", color: "#94a3b8" }}>
              Không có buổi học nào trong tuần này
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
            <span className={styles.statValue}>{sessions.length}</span>
            <span className={styles.statLabel}>Buổi học trong tuần</span>
          </div>
        </div>
      </div>
    </div>
  );
}