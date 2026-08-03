"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./ClassCalendar.module.css";

export default function ClassCalendar({ courses, onDateClick }) {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  
  const wrapperRef = useRef(null);
  const rowRefs = useRef({});
  const hasScrolledRef = useRef(false);

  // 1. Tạo danh sách các khóa học duy nhất (chỉ lấy các khóa không có trạng thái completed)
  const uniqueCourses = useMemo(() => {
    const map = new Map();
    courses.forEach(item => {
      // ⚠️ Kiểm tra trạng thái của khóa học (nếu status hoặc course_status là "completed" thì bỏ qua)
      if (item.status === "completed" || item.course_status === "completed") return;

      const id = item.course_id;
      if (id && !map.has(id)) {
        map.set(id, {
          course_id: id,
          title: item.title || "Khóa học chưa đặt tên"
        });
      }
    });
    return Array.from(map.values());
  }, [courses]);

  // 2. Tạo map các ngày có buổi học thực tế (chỉ lấy từ các khóa học chưa completed)
  const classDates = useMemo(() => {
    const dates = {};
    courses.forEach(session => {
      // ⚠️ Bỏ qua toàn bộ buổi học thuộc khóa học đã hoàn thành
      if (session.status === "completed" || session.course_status === "completed") return;

      const sessionDate = session.actual_date; 
      if (sessionDate) {
        const dateKey = sessionDate.split("T")[0]; // Định dạng YYYY-MM-DD
        if (!dates[dateKey]) {
          dates[dateKey] = [];
        }
        
        const startTime = session.start_time ? session.start_time.substring(0, 5) : "00:00";
        const endTime = session.end_time ? session.end_time.substring(0, 5) : "00:00";
        
        dates[dateKey].push({
          course: session,
          timeSlot: `${startTime} - ${endTime}`,
        });
      }
    });
    return dates;
  }, [courses]);

  // Lấy tất cả khung giờ 30 phút từ 00:00 đến 23:30
  const getAllTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hourStr = String(h).padStart(2, '0');
        const minStr = String(m).padStart(2, '0');
        slots.push(`${hourStr}:${minStr}`);
      }
    }
    return slots;
  };

  const allTimeSlots = getAllTimeSlots();

  // Parse thời gian thành số phút từ 00:00
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  // Chuyển đổi khung giờ của buổi học sang danh sách các slot 30 phút để hiển thị trên bảng
  const getSessionSlots = (timeSlotStr) => {
    if (!timeSlotStr || timeSlotStr.includes("undefined")) return [];
    const parts = timeSlotStr.split('-').map(t => t.trim());
    if (parts.length < 2) return [];
    
    const startMin = timeToMinutes(parts[0]);
    const endMin = timeToMinutes(parts[1]);
    
    const slots = [];
    // ✅ Sửa thành <= để bao gồm cả mốc giờ kết thúc (ví dụ đến đúng 20:00)
    for (let t = startMin; t <= endMin; t += 30) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    return slots;
  };

  // Lấy tuần hiện tại
  const getWeekDays = (baseDate) => {
    const date = new Date(baseDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDays(currentWeek);

  const prevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
    hasScrolledRef.current = false;
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
    hasScrolledRef.current = false;
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
    hasScrolledRef.current = false;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Kiểm tra có buổi học tại slot này không
  const getClassesAtSlot = (date, timeSlot) => {
    const dateKey = date.toISOString().split("T")[0];
    const dayClasses = classDates[dateKey] || [];
    const result = [];
    
    dayClasses.forEach(cls => {
      const slots = getSessionSlots(cls.timeSlot);
      if (slots.includes(timeSlot)) {
        if (selectedCourseIds.length > 0 && !selectedCourseIds.includes(cls.course.course_id)) {
          return;
        }
        result.push(cls);
      }
    });
    
    return result;
  };

  const hasClassAtSlot = (date, timeSlot) => {
    return getClassesAtSlot(date, timeSlot).length > 0;
  };

  const handleMouseEnter = (e, course) => {
    if (!course) return;
    setHoveredCourse(course);
    setShowTooltip(true);
    
    let x = e.clientX + 15;
    let y = e.clientY - 10;
    
    const tooltipWidth = 260;
    const tooltipHeight = 150;
    
    if (x + tooltipWidth > window.innerWidth) {
      x = e.clientX - tooltipWidth - 15;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - 10;
    }
    if (y < 10) y = 10;
    
    setTooltipPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
    setHoveredCourse(null);
  };

  const handleClassClick = (course) => {
    if (course) {
      onDateClick(course);
    }
  };

  // Lọc theo lớp - dạng checkbox
  const handleFilterToggle = (courseId) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
    hasScrolledRef.current = false;
  };

  // Chọn tất cả
  const handleSelectAll = () => {
    const allIds = uniqueCourses.map(c => c.course_id);
    if (selectedCourseIds.length === allIds.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(allIds);
    }
    hasScrolledRef.current = false;
  };

  const getFirstCourseAtSlot = (date, timeSlot) => {
    const classes = getClassesAtSlot(date, timeSlot);
    return classes.length > 0 ? classes[0].course : null;
  };

  // ===== TÍNH NĂNG TỰ ĐỘNG CUỘN =====
  useEffect(() => {
    if (courses.length === 0 || hasScrolledRef.current) return;

    const timer = setTimeout(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      let targetRowIndex = -1;
      let maxClassCount = 0;

      allTimeSlots.forEach((slot, index) => {
        let classCount = 0;
        weekDays.forEach(date => {
          if (hasClassAtSlot(date, slot)) {
            classCount++;
          }
        });

        if (selectedCourseIds.length === 1) {
          const targetCourseId = selectedCourseIds[0];
          let hasTargetClass = false;
          weekDays.forEach(date => {
            const classes = getClassesAtSlot(date, slot);
            if (classes.some(cls => cls.course.course_id === targetCourseId)) {
              hasTargetClass = true;
            }
          });
          if (hasTargetClass) {
            targetRowIndex = index;
            return;
          }
        } else {
          if (classCount > maxClassCount) {
            maxClassCount = classCount;
            targetRowIndex = index;
          }
        }
      });

      if (targetRowIndex === -1) {
        targetRowIndex = 0;
      }

      const targetRow = rowRefs.current[targetRowIndex];
      if (targetRow) {
        const wrapperRect = wrapper.getBoundingClientRect();
        const rowRect = targetRow.getBoundingClientRect();
        const offset = rowRect.top - wrapperRect.top - 60;
        
        wrapper.scrollTo({
          top: wrapper.scrollTop + offset,
          behavior: 'smooth'
        });
        hasScrolledRef.current = true;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedCourseIds, currentWeek, courses, allTimeSlots, weekDays]);

  if (courses.length === 0) {
    return (
      <div className={styles.emptySchedule}>
        <span className={styles.emptyIcon}></span>
        <p>Bạn chưa có lịch học nào</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Tooltip */}
      {showTooltip && hoveredCourse && (
        <div
          className={styles.tooltip}
          style={{
            position: "fixed",
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <div className={styles.tooltipContent}>
            <h4>{hoveredCourse.title}</h4>
            <p><strong>Bài học:</strong> {hoveredCourse.lesson_title || "Chưa cập nhật"}</p>
            <p><strong>Thời gian:</strong> {hoveredCourse.start_time?.substring(0, 5)} - {hoveredCourse.end_time?.substring(0, 5)}</p>
            <p><strong>Gia sư:</strong> {hoveredCourse.tutor_name || "Chưa có thông tin"}</p>
            <small>Nhấn để xem chi tiết</small>
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div className={styles.calendarHeader}>
        <div className={styles.calendarNav}>
          <button onClick={prevWeek} className={styles.navBtn}>←</button>
          <span className={styles.calendarTitle}>
            {weekDays[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - {weekDays[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
          <button onClick={nextWeek} className={styles.navBtn}>→</button>
        </div>
        <div className={styles.headerRight}>
          <button onClick={goToToday} className={styles.todayBtn}>Hôm nay</button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className={styles.filterSection}>
        <div className={styles.filterHeader}>
          <span className={styles.filterLabel}>📋 Lọc lớp học:</span>
          <button 
            className={styles.selectAllBtn}
            onClick={handleSelectAll}
          >
            {selectedCourseIds.length === uniqueCourses.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>
        <div className={styles.filterOptions}>
          {uniqueCourses.map((course, index) => (
            <label 
              key={course.course_id || `unique-course-${index}`} 
              className={`${styles.filterTag} ${selectedCourseIds.includes(course.course_id) ? styles.filterTagActive : ""}`}
            >
              <input
                type="checkbox"
                checked={selectedCourseIds.includes(course.course_id)}
                onChange={() => handleFilterToggle(course.course_id)}
                className={styles.filterCheckboxHidden}
              />
              <span className={styles.filterTagText}>{course.title}</span>
            </label>
          ))}
        </div>
        {selectedCourseIds.length > 0 && selectedCourseIds.length < uniqueCourses.length && (
          <div className={styles.filterStatus}>
            Đang hiển thị <strong>{selectedCourseIds.length}</strong>/{uniqueCourses.length} lớp
          </div>
        )}
      </div>

      {/* TimeTable */}
      <div 
        className={styles.timetableWrapper} 
        ref={wrapperRef}
      >
        <div className={styles.timetable}>
          {/* Header */}
          <div className={styles.timetableHeader}>
            <div className={styles.timeHeaderCell}>Giờ</div>
            {weekDays.map((date, index) => {
              const isTodayDay = isToday(date);
              return (
                <div
                  key={index}
                  className={`${styles.dayHeaderCell} ${isTodayDay ? styles.todayHeader : ""}`}
                >
                  <span className={styles.dayName}>
                    {date.toLocaleDateString("vi-VN", { weekday: "short" })}
                  </span>
                  <span className={styles.dayNumberHeader}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className={styles.timetableBody}>
            {allTimeSlots.map((slot, slotIndex) => {
              return (
                <div 
                  key={slotIndex} 
                  className={styles.timetableRow}
                  ref={(el) => {
                    if (el) rowRefs.current[slotIndex] = el;
                  }}
                >
                  <div className={styles.timeCell}>
                    <span className={styles.timeText}>{slot}</span>
                  </div>

                  {weekDays.map((date, dayIndex) => {
                    const hasClass = hasClassAtSlot(date, slot);
                    const isTodayDay = isToday(date);
                    const firstCourse = hasClass ? getFirstCourseAtSlot(date, slot) : null;

                    return (
                      <div
                        key={dayIndex}
                        className={`${styles.dayCell} ${hasClass ? styles.hasClass : ""} ${isTodayDay ? styles.todayCell : ""}`}
                        onMouseEnter={(e) => hasClass && handleMouseEnter(e, firstCourse)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => hasClass && handleClassClick(firstCourse)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.calendarLegend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDotGreen}></span>
          <span>Có buổi học</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDotGray}></span>
          <span>Trống</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDotBlue}></span>
          <span>Hôm nay</span>
        </div>
      </div>
    </div>
  );
}