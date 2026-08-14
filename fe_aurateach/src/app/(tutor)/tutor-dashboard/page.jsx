"use client";

import { useEffect, useState, useCallback } from "react";
import Tutor_sec1 from "./_component/Tutor_sec1";
import Tutor_sec2 from "./_component/Tutor_sec2";
import Tutor_sec3 from "./_component/Tutor_sec3";
import Tutor_sec4 from "./_component/Tutor_sec4";
import { tutorService } from "@/services/tutorService";
import { userService } from "@/services/userService";
import { courseService } from "@/services/courseService";
import { authService } from "@/services/authService";
import { lessonConfirmationService } from "@/services/lessonConfirmationService";

const DAY_MAP = {
  "Chủ Nhật": 0, "Chủ nhật": 0, "CN": 0, "Sunday": 0,
  "Thứ 2": 1, "Thứ hai": 1, "T2": 1, "Monday": 1,
  "Thứ 3": 2, "Thứ ba": 2, "T3": 2, "Tuesday": 2,
  "Thứ 4": 3, "Thứ tư": 3, "T4": 3, "Wednesday": 3,
  "Thứ 5": 4, "Thứ năm": 4, "T5": 4, "Thursday": 4,
  "Thứ 6": 5, "Thứ sáu": 5, "T6": 5, "Friday": 5,
  "Thứ 7": 6, "Thứ bảy": 6, "T7": 6, "Saturday": 6
};

export default function TutorDashboardPage() {
  const [userName, setUserName] = useState("Gia Sư");
  const [stats, setStats] = useState({
    totalIncome: "0đ",
    incomeGrowth: "Ổn định",
    totalStudents: 0,
    studentsGrowth: "+0",
    openClasses: "00",
    rating: "0.0/5.0"
  });
  const [classesList, setClassesList] = useState([]);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [chartData, setChartData] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    const userData = await authService.getCurrentUser();
    if (!userData) return;

    const userId = userData.user_id || userData.id;
    setUserName(userData.full_name || userData.name || "Gia Sư");

    try {
      const tutorRes = await tutorService.getByUserId(userId);
      const tutorList = Array.isArray(tutorRes) ? tutorRes : (tutorRes?.data || [tutorRes]);
      const tutorDetail = tutorList.find(t => t.user_id === userId) || tutorList[0];
      
      if (!tutorDetail) return;
      const tutorId = tutorDetail.tutor_id || tutorDetail.id;

      const [usersRes, coursesRes] = await Promise.all([
        userService.getUsers(),
        courseService.getCourses({ tutor_id: tutorId })
      ]);

      const allUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
      const lessonConfirmations = []; // Có thể gọi thêm API lesson confirmation nếu cần kiểm tra giải ngân sâu hơn
      let coursesData = Array.isArray(coursesRes) ? coursesRes : (coursesRes?.data || []);
      coursesData = coursesData.filter(c => c.tutor_id === tutorId || c.instructor_id === tutorId);

      const now = new Date();
      const activeClasses = coursesData.filter(c => c.status === "active" || !c.status);
      const totalStudents = coursesData.reduce((sum, c) => sum + (c.students?.length || 0), 0);
      
      const availableWallet = tutorDetail?.available_balance || 0;
      const pendingWallet = tutorDetail?.pending_balance || 0;
      const calculatedTotalIncome = availableWallet + pendingWallet;

      setStats({
        totalIncome: availableWallet,
        incomeGrowth: pendingWallet > 0 ? `+${((pendingWallet / (calculatedTotalIncome || 1)) * 100).toFixed(0)}% chờ duyệt` : "Ổn định",
        totalStudents,
        studentsGrowth: `+${activeClasses.length} lớp`,
        openClasses: activeClasses.length < 10 ? `0${activeClasses.length}` : activeClasses.length.toString(),
        rating: `${tutorDetail?.rating || 0}/5.0`
      });

      const confirmableList = [];
      const formattedClasses = coursesData
        .map((course) => {
          if (course.status && course.status !== "active") return null;

          const timeSlot = course.time_slot || "18:00-20:00";
          const scheduleDays = Array.isArray(course.schedule_days) ? course.schedule_days : [];
          const [startStr, endStr] = timeSlot.split("-").map(s => s.trim());
          const [startHour, startMinute] = (startStr || "00:00").split(":").map(Number);
          const [endHour, endMinute] = (endStr || "23:59").split(":").map(Number);

          const enrolledStudents = (course.students || []).map(stId => {
            const u = allUsers.find(usr => usr.user_id === stId || usr.id === stId);
            return u ? { user_id: stId, full_name: u.full_name, email: u.email, phone: u.phone, avatar: u.avatar } 
                     : { user_id: stId, full_name: "Học sinh " + stId };
          });

          // Quét lịch sử 14 ngày gần nhất tìm buổi học cần confirm
          for (let i = 0; i <= 14; i++) {
            const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            if (scheduleDays.length === 0 || scheduleDays.some(d => DAY_MAP[d] === checkDate.getDay())) {
              const sessionEnd = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), endHour, endMinute, 0);

              if (now >= sessionEnd) {
                const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
                const confirmationId = `${course.course_id || course.id}_${dateStr}`;
                
                if (!lessonConfirmations.some(lc => lc.comfirmation_id === confirmationId)) {
                  confirmableList.push({
                    comfirmation_id: confirmationId,
                    course_id: course.course_id || course.id,
                    course_title: course.title,
                    tutor_id: tutorId,
                    tutor_db_id: tutorDetail.id,
                    lesson_date: dateStr,
                    time_slot: timeSlot,
                    price_per_session: course.price_per_session || 0,
                    duration_hours: Math.max(((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60, 0.5),
                    students_count: course.students?.length || 0,
                    tutor_pending_balance: tutorDetail.pending_balance || 0
                  });
                }
              }
            }
          }

          // Quét tìm buổi học sắp tới trong vòng 30 ngày tới
          let nextStartDateTime = null;
          let nextEndDateTime = null;
          
          for (let i = 0; i <= 30; i++) {
            const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            if (scheduleDays.length === 0 || scheduleDays.some(d => DAY_MAP[d] === checkDate.getDay())) {
              nextStartDateTime = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), startHour, startMinute, 0);
              nextEndDateTime = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), endHour, endMinute, 0);
              if (now <= nextEndDateTime) break;
            }
          }

          if (!nextStartDateTime) {
            nextStartDateTime = new Date(now.getTime() + 86400000);
            nextStartDateTime.setHours(startHour, startMinute, 0, 0);
            nextEndDateTime = new Date(nextStartDateTime.getTime() + 7200000);
          }

          const isLive = now >= new Date(nextStartDateTime.getTime() - 900000) && now <= nextEndDateTime;
          const formattedDateString = nextStartDateTime.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
          let dateTag = "";

          if (isLive) {
            dateTag = "🔴 ĐANG DIỄN RA";
          } else if (nextStartDateTime.toDateString() === now.toDateString()) {
            dateTag = `HÔM NAY, ${formattedDateString}`;
          } else {
            const diffDays = Math.ceil((nextStartDateTime.getTime() - now.getTime()) / 86400000);
            if (diffDays === 1) {
              dateTag = `NGÀY MAI, ${formattedDateString}`;
            } else {
              const weekdays = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
              dateTag = `${weekdays[nextStartDateTime.getDay()]}, ${formattedDateString}`;
            }
          }

          return {
            id: course.course_id || course.id,
            tag: dateTag,
            title: course.title || "Lớp học chưa đặt tên",
            level: course.level,
            description: course.description,
            price_per_session: course.price_per_session,
            schedule_days: course.schedule_days,
            time: timeSlot,
            studentsCount: course.students?.length || 0,
            enrolledStudentsDetails: enrolledStudents,
            sortTimestamp: nextStartDateTime.getTime(),
            isLive,
            thumbnail: course.thumbnail,
            permanent_room_url: course.permanent_room_url || null
          };
        })
        .filter(Boolean);

      formattedClasses.sort((a, b) => a.sortTimestamp - b.sortTimestamp);

      setClassesList(formattedClasses);
      setPendingConfirmations(confirmableList);
      setChartData([
        { name: "Th1", income: Math.round(availableWallet * 0.15 / 1000000) || 4 },
        { name: "Th2", income: Math.round(availableWallet * 0.3 / 1000000) || 7 },
        { name: "Th3", income: Math.round(availableWallet * 0.45 / 1000000) || 11 },
        { name: "Th4", income: Math.round(availableWallet * 0.6 / 1000000) || 14 },
        { name: "Th5", income: Math.round(availableWallet * 0.8 / 1000000) || 18 },
        { name: "Th6", income: Math.round(calculatedTotalIncome / 1000000) || 22 },
      ]);

    } catch (error) {
      console.error("Lỗi xử lý API tại trang Dashboard:", error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", marginTop: "80px" }}>
      <Tutor_sec1 tutorName={userName} statsData={stats} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", width: "100%" }}>
        <Tutor_sec2 
          classesData={classesList} 
          pendingConfirmations={pendingConfirmations}
          onRefreshData={fetchDashboardData}
        />
        <Tutor_sec3 activitiesData={null} />
      </div>
      <Tutor_sec4 chartData={chartData} />
    </div>
  );
}