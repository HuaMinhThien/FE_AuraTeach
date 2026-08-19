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
        courseService.getCourseDashboard({ tutor_id: tutorId })
      ]);

      const allUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
      let coursesData = Array.isArray(coursesRes) ? coursesRes : (coursesRes?.data || []);
      coursesData = coursesData.filter(c => c.tutor_id === tutorId || c.instructor_id === tutorId);

      const now = new Date();
      const activeClasses = coursesData.filter(c => c.status !== "completed");    
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

      const formattedClasses = coursesData
        .map((course) => {
          if (course.status === "completed") return null;

          const enrolledStudents = (course.students || []).map(stId => {
            const u = allUsers.find(usr => usr.user_id === stId || usr.id === stId);
            return u ? { user_id: stId, full_name: u.full_name, email: u.email, phone: u.phone, avatar: u.avatar } 
                     : { user_id: stId, full_name: "Học sinh " + stId };
          });

          // Lấy danh sách buổi học từ bảng class_sessions
          const sessions = course.class_sessions || course.sessions || [];

          let nextStartDateTime = null;
          let nextEndDateTime = null;
          let currentSessionTitle = course.title || "Lớp học chưa đặt tên";

          if (sessions.length > 0) {
            // Map và tìm buổi học chưa qua đi (hoặc đang diễn ra) dựa vào actual_date và start_time/end_time
            const validSessions = sessions
              .map(session => {
                const dateStr = session.actual_date; // dạng YYYY-MM-DD
                const startStr = session.start_time || "00:00:00";
                const endStr = session.end_time || "23:59:00";

                const startDateTime = new Date(`${dateStr}T${startStr}`);
                const endDateTime = new Date(`${dateStr}T${endStr}`);

                return {
                  ...session,
                  startDateTime,
                  endDateTime
                };
              })
              .filter(s => !isNaN(s.startDateTime.getTime()) && now <= s.endDateTime)
              .sort((a, b) => a.startDateTime - b.startDateTime);

            if (validSessions.length > 0) {
              const nextSession = validSessions[0];
              nextStartDateTime = nextSession.startDateTime;
              nextEndDateTime = nextSession.endDateTime;
              if (nextSession.lesson_title) {
                currentSessionTitle = `${course.title} - ${nextSession.lesson_title}`;
              }
            }
          }

          // Fallback phòng hờ nếu khóa học chưa có bản ghi nào trong class_sessions
          if (!nextStartDateTime) {
            nextStartDateTime = new Date(now.getTime() + 86400000);
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
              dateTag = `${weekdays[nextStartDateTime.getDay()]} , ${formattedDateString}`;
            }
          }

          const timeSlotStr = sessions.length > 0 && sessions[0].start_time 
            ? `${sessions[0].start_time.slice(0, 5)}-${sessions[0].end_time.slice(0, 5)}`
            : (course.time_slot || "18:00-20:00");

          return {
            id: course.course_id || course.id,
            tag: dateTag,
            title: currentSessionTitle,
            level: course.level,
            description: course.description,
            price_per_session: course.price_per_session,
            schedule_days: course.schedule_days,
            time: timeSlotStr,
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
          pendingConfirmations={[]} 
          onRefreshData={fetchDashboardData}
        />
        <Tutor_sec3 activitiesData={null} />
      </div>
      <Tutor_sec4 chartData={chartData} />
    </div>
  );
}