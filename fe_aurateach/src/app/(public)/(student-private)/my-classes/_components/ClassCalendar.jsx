"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMeetLink, openMeetLink } from "@/utils/roomUtils";
import styles from "./ClassCalendar.module.css";

export default function ClassCalendar({ courses, makeupSessions = [], onDateClick }) {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  
  const wrapperRef = useRef(null);
  const rowRefs = useRef({});
  const classBlockRefs = useRef({});
  const hasScrolledRef = useRef(false);

  // Hàm chuẩn hóa đổi Date object thành chuỗi YYYY-MM-DD theo giờ địa phương (tránh lệch UTC)
  const getLocalDateKey = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 1. Tạo danh sách các khóa học duy nhất (chỉ lấy các khóa không có trạng thái completed)
  const uniqueCourses = useMemo(() => {
    const map = new Map();
    courses.forEach(item => {
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

  // 2. Tạo map các ngày có buổi học thực tế
  const classDates = useMemo(() => {
    const dates = {};
    courses.forEach(session => {
      if (session.status === "completed" || session.course_status === "completed") return;

      const sessionDate = session.actual_date; 
      if (sessionDate) {
        const dateKey = sessionDate.split("T")[0]; 
        if (!dates[dateKey]) {
          dates[dateKey] = [];
        }
        
        const startTime = session.start_time ? session.start_time.substring(0, 5) : "00:00";
        const endTime = session.end_time ? session.end_time.substring(0, 5) : "00:00";
        
        dates[dateKey].push({
          course: session,
          time: `${startTime} - ${endTime}`,
          start_time: startTime,
          end_time: endTime,
          isMakeup: false,
        });
      }
    });

    makeupSessions.forEach((session) => {
      if (!session.actual_date || !session.start_time || !session.end_time) return;

      const sessionDate = new Date(session.actual_date);
      const dateKey = sessionDate.toISOString().split("T")[0];

      if (!dates[dateKey]) {
        dates[dateKey] = [];
      }

      dates[dateKey].push({
        course: {
          course_id: session.course_id,
          title: session.course_title || session.lesson_title || "Buổi học bù",
          permanent_room_url: session.permanent_room_url,
          tutor_name: session.tutor_name,
        },
        time: `${session.start_time}-${session.end_time}`,
        isMakeup: true,
        session: session,
      });
    });

    return dates;
  }, [courses, makeupSessions]);

  // Thay đổi khung giờ theo từng tiếng (60 phút) thay vì 30 phút
  const getAllTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = String(h).padStart(2, '0');
      slots.push(`${hourStr}:00`);
    }
    return slots;
  };

  const allTimeSlots = getAllTimeSlots();

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const getClassesAtSlot = (date, slotStr) => {
    const dateKey = getLocalDateKey(date);
    const dayClasses = classDates[dateKey] || [];
    const slotMin = timeToMinutes(slotStr);

    return dayClasses.filter(cls => {
      const startMin = timeToMinutes(cls.start_time);
      const endMin = timeToMinutes(cls.end_time);
      return slotMin >= startMin && slotMin < endMin + 30;
    });
  };

  const hasClassAtSlot = (date, slotStr) => {
    const matchingClasses = getClassesAtSlot(date, slotStr);
    if (matchingClasses.length === 0) return false;
    
    if (selectedCourseIds.length > 0) {
      return matchingClasses.some(cls => selectedCourseIds.includes(cls.course.course_id));
    }
    return true;
  };

  // Lấy tuần hiện tại (bắt đầu từ Thứ Hai)
  const getWeekDays = (baseDate) => {
    const date = new Date(baseDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);

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

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getClassesForDate = (date) => {
    const dateKey = getLocalDateKey(date);
    const dayClasses = classDates[dateKey] || [];
    const totalMinutes = 24 * 60;
    return dayClasses.map(cls => {
      const startMin = timeToMinutes(cls.start_time);
      const endMin = timeToMinutes(cls.end_time);
      return {
        course: cls.course,
        time: cls.time,
        startMin,
        endMin,
        durationMin: endMin - startMin,
        topPercent: (startMin / totalMinutes) * 100,
        heightPercent: ((endMin - startMin) / totalMinutes) * 100,
        isMakeup: cls.isMakeup || false,
        session: cls.session || null,        
      };
    }).filter(cls => selectedCourseIds.length === 0 || selectedCourseIds.includes(cls.course.course_id));
  };

  const handleJoinFromBlock = (course) => {
    if (!course) return;
    openMeetLink(course);
  };

  const handleClassClick = (course) => {
    if (course) {
      onDateClick(course);
    }
  };

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

  const handleSelectAll = () => {
    const allIds = uniqueCourses.map(c => c.course_id);
    if (selectedCourseIds.length === allIds.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(allIds);
    }
    hasScrolledRef.current = false;
  };

  // ===== TÍNH NĂNG TỰ ĐỘNG CUỘN =====
  useEffect(() => {
    if (courses.length === 0 || hasScrolledRef.current) return;

    const timer = setTimeout(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      let targetBlockRef = null;

      if (selectedCourseIds.length === 1) {
        const targetCourseId = selectedCourseIds[0];
        for (const date of weekDays) {
          const classesForDate = getClassesForDate(date);
          const targetClass = classesForDate.find(cls => cls.course.course_id === targetCourseId);
          if (targetClass) {
            const dateKey = getLocalDateKey(date);
            targetBlockRef = classBlockRefs.current[`${dateKey}-${targetCourseId}`];
            break;
          }
        }
      } else {
        let targetDate = null;
        let maxClassCount = 0;

        weekDays.forEach(date => {
          const classesForDate = getClassesForDate(date);
          if (classesForDate.length > maxClassCount) {
            maxClassCount = classesForDate.length;
            targetDate = date;
          }
        });

        if (targetDate && maxClassCount > 0) {
          const classesForTargetDate = getClassesForDate(targetDate);
          const targetClass = classesForTargetDate[0];
          const dateKey = getLocalDateKey(targetDate);
          targetBlockRef = classBlockRefs.current[`${dateKey}-${targetClass.course.course_id}`];
        }
      }

      if (targetBlockRef) {
        const wrapperRect = wrapper.getBoundingClientRect();
        const blockRect = targetBlockRef.getBoundingClientRect();
        const offset = blockRect.top - wrapperRect.top - 60;
        
        wrapper.scrollTo({
          top: wrapper.scrollTop + offset,
          behavior: 'smooth'
        });
        hasScrolledRef.current = true;
      } else {
        hasScrolledRef.current = true;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedCourseIds, currentWeek, courses, weekDays]);

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
          <button className={styles.selectAllBtn} onClick={handleSelectAll}>
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
      </div>

      {/* TimeTable */}
      <div className={styles.timetableWrapper} ref={wrapperRef}>
        <div className={styles.timetable}>
          <div className={styles.timetableHeader}>
            <div className={styles.timeHeaderCell}>Giờ</div>
            {weekDays.map((date, index) => {
              const isTodayDay = isToday(date);
              return (
                <div key={index} className={`${styles.dayHeaderCell} ${isTodayDay ? styles.todayHeader : ""}`}>
                  <span className={styles.dayName}>{date.toLocaleDateString("vi-VN", { weekday: "short" })}</span>
                  <span className={styles.dayNumberHeader}>{date.getDate()}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.timetableBodyWrapper}>
            <div className={styles.timetableBody}>
              {allTimeSlots.map((slot, slotIndex) => (
                <div 
                  key={slotIndex} 
                  className={styles.timetableRow}
                  ref={(el) => { if (el) rowRefs.current[slotIndex] = el; }}
                >
                  <div className={styles.timeCell}>
                    <span className={styles.timeText}>{slot}</span>
                  </div>
                  {weekDays.map((date, dayIndex) => (
                    <div key={dayIndex} className={`${styles.dayCell} ${isToday(date) ? styles.todayCell : ""}`} />
                  ))}
                </div>
              ))}
            </div>

            <div className={styles.classOverlay}>
              {weekDays.map((date, dayIndex) => {
                const classesForDate = getClassesForDate(date);
                const dateKey = getLocalDateKey(date);
                return (
                  <div key={dayIndex} className={`${styles.classColumn} ${isToday(date) ? styles.todayColumn : ""}`}>
                    {classesForDate.map((cls, idx) => (
                      <div
                        key={`${dateKey}-${cls.course.course_id || "unknown"}-${cls.isMakeup ? "makeup" : "normal"}-${idx}`}
                        className={styles.classBlock}
                        ref={(el) => {
                          if (el) classBlockRefs.current[`${dateKey}-${cls.course.course_id}`] = el;
                        }}
                        style={{
                          top: `${cls.topPercent}%`,
                          height: `${cls.heightPercent}%`,
                          ...(cls.isMakeup
                            ? {
                                background: "#fff7ed",
                                borderLeft: "4px solid #ea580c",
                                color: "#c2410c",
                              }
                            : {}),                          
                        }}
                        onClick={() => handleClassClick(cls.course)}
                      >
                        <div className={styles.classBlockContent}>
                          <strong>
                            {cls.course.title}
                            {cls.isMakeup && (
                              <span style={{
                                marginLeft: 6,
                                padding: "1px 6px",
                                background: "#ffedd5",
                                color: "#c2410c",
                                fontSize: 10,
                                fontWeight: 600,
                                borderRadius: 999,
                              }}>
                                Học bù
                              </span>
                            )}
                          </strong>                          
                          <span>{cls.time}</span>
                          <button
                            className={styles.classJoinBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinFromBlock(cls.course);
                            }}
                            style={cls.isMakeup ? { background: "#ea580c", color: "#fff" } : {}}
                          >
                            Vào lớp
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className={styles.calendarLegend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDotGreen}></span>
          <span>Có lớp học</span>
        </div>
        <div className={styles.legendItem}>
          <span style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#fff7ed",
            border: "2px solid #ea580c",
            display: "inline-block",
          }}></span>
          <span>Buổi học bù</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDotGray}></span>
          <span>Không có lớp</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDotBlue}></span>
          <span>Hôm nay</span>
        </div>
        {selectedCourseIds.length > 0 && (
          <div className={styles.legendItem}>
            <span className={styles.legendDotPurple}></span>
            <span>Đang lọc {selectedCourseIds.length} lớp</span>
          </div>
        )}
      </div>      
    </div>
  );
}