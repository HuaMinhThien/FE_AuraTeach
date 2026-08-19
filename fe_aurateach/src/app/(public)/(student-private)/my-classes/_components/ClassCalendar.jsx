"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClassroomRoomPath } from "@/utils/roomUtils";
import styles from "./ClassCalendar.module.css";

export default function ClassCalendar({ courses, onDateClick }) {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  
  const wrapperRef = useRef(null);
  const rowRefs = useRef({});
  const classBlockRefs = useRef({});
  const hasScrolledRef = useRef(false);

  // Tạo map các ngày có lớp học
  const classDates = useMemo(() => {
    const dates = {};
    courses.forEach(course => {
      if (course.schedule_days && course.schedule_days.length > 0) {
        const startDate = new Date(course.start_date);
        const endDate = new Date(course.end_date);
        const daysOfWeek = course.schedule_days.map(day => {
          const dayMap = {
            "Thứ 2": 1,
            "Thứ 3": 2,
            "Thứ 4": 3,
            "Thứ 5": 4,
            "Thứ 6": 5,
            "Thứ 7": 6,
            "Chủ Nhật": 0,
          };
          return dayMap[day];
        });

        let current = new Date(startDate);
        while (current <= endDate) {
          const dayOfWeek = current.getDay();
          if (daysOfWeek.includes(dayOfWeek)) {
            const dateKey = current.toISOString().split("T")[0];
            if (!dates[dateKey]) {
              dates[dateKey] = [];
            }
            dates[dateKey].push({
              course: course,
              time: course.time_slot || "Chưa có giờ",
            });
          }
          current.setDate(current.getDate() + 1);
        }
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
    if (parts.length !== 2) return 0;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  // Chuyển đổi khung giờ của lớp sang danh sách các slot 30 phút
  const getCourseSlots = (timeSlot) => {
    if (!timeSlot || timeSlot === "Chưa có giờ") return [];
    const [start, end] = timeSlot.split('-').map(t => t.trim());
    if (!start || !end) return [];
    
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    
    const slots = [];
    for (let t = startMin; t < endMin; t += 30) {
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

  const getClassesForDate = (date) => {
    const dateKey = date.toISOString().split("T")[0];
    const dayClasses = classDates[dateKey] || [];
    const totalMinutes = 24 * 60;
    return dayClasses.map(cls => {
      const [start, end] = (cls.time || "00:00-00:00").split('-').map(t => t.trim());
      const startMin = timeToMinutes(start);
      const endMin = timeToMinutes(end);
      return {
        course: cls.course,
        time: cls.time,
        startMin,
        endMin,
        durationMin: endMin - startMin,
        topPercent: (startMin / totalMinutes) * 100,
        heightPercent: ((endMin - startMin) / totalMinutes) * 100,
      };
    }).filter(cls => selectedCourseIds.length === 0 || selectedCourseIds.includes(cls.course.course_id));
  };

  const handleJoinFromBlock = (course) => {
    if (course) {
      const roomPath = getClassroomRoomPath(course, "student");
      if (roomPath) {
        window.open(roomPath, "_blank");
      } else {
        alert("Lớp học này chưa có link tham gia!");
      }
    }
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
    if (selectedCourseIds.length === courses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(courses.map(c => c.course_id));
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
            const dateKey = date.toISOString().split("T")[0];
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
          const dateKey = targetDate.toISOString().split("T")[0];
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
        <p>Bạn chưa đăng ký lớp học nào</p>
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
          <button 
            className={styles.selectAllBtn}
            onClick={handleSelectAll}
          >
            {selectedCourseIds.length === courses.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        </div>
        <div className={styles.filterOptions}>
          {courses.map(course => (
            <label 
              key={course.course_id} 
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
        {selectedCourseIds.length > 0 && selectedCourseIds.length < courses.length && (
          <div className={styles.filterStatus}>
            Đang hiển thị <strong>{selectedCourseIds.length}</strong>/{courses.length} lớp
          </div>
        )}
        {selectedCourseIds.length === 1 && (
          <div className={styles.filterStatus} style={{ color: '#4f46e5' }}>
            Đã cuộn đến lớp được chọn
          </div>
        )}
        {selectedCourseIds.length === 0 && (
          <div className={styles.filterStatus} style={{ color: '#6b7280' }}>
            Đã cuộn đến vùng có nhiều lớp nhất
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

          {/* Body + Overlay */}
          <div className={styles.timetableBodyWrapper}>
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
                      const isTodayDay = isToday(date);

                      return (
                        <div
                          key={dayIndex}
                          className={`${styles.dayCell} ${isTodayDay ? styles.todayCell : ""}`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className={styles.classOverlay}>
              {weekDays.map((date, dayIndex) => {
                const isTodayDay = isToday(date);
                const classesForDate = getClassesForDate(date);
                const dateKey = date.toISOString().split("T")[0];

                return (
                  <div
                    key={dayIndex}
                    className={`${styles.classColumn} ${isTodayDay ? styles.todayColumn : ""}`}
                  >
                    {classesForDate.map((cls, idx) => (
                      <div
                        key={`${dateKey}-${cls.course.course_id}`}
                        className={styles.classBlock}
                        ref={(el) => {
                          if (el) classBlockRefs.current[`${dateKey}-${cls.course.course_id}`] = el;
                        }}
                        style={{
                          top: `${cls.topPercent}%`,
                          height: `${cls.heightPercent}%`,
                        }}
                        onClick={() => handleClassClick(cls.course)}
                      >
                        <div className={styles.classBlockContent}>
                          <strong>{cls.course.title}</strong>
                          <span>{cls.time}</span>
                          <button
                            className={styles.classJoinBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinFromBlock(cls.course);
                            }}
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