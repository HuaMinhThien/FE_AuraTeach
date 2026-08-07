"use client";

import { useEffect, useState } from "react";
import Tutor_sec1 from "./_component/Tutor_sec1";
import Tutor_sec2 from "./_component/Tutor_sec2";
import Tutor_sec3 from "./_component/Tutor_sec3";
import Tutor_sec4 from "./_component/Tutor_sec4";
import { tutorService } from "@/services/tutorService";
import { userService } from "@/services/userService";
import { lessonConfirmationService } from "@/services/lessonConfirmationService";
import { courseService } from "@/services/courseService";
import { authService } from "@/services/authService"; // 👈 Import authService để lấy user chuẩn từ token

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

  // 🚀 FETCH DỮ LIỆU TỔNG HỢP SONG SONG SỬ DỤNG authService.getCurrentUser()
  const fetchDashboardData = async () => {
    console.log("🚀 [Dashboard] Bắt đầu chạy fetchDashboardData...");
    
    // Gọi API lấy user hiện tại thông qua token đang lưu trong localStorage
    const userData = await authService.getCurrentUser();
    if (!userData) {
      console.warn("⚠️ [Dashboard] Dừng lại: Không thể xác thực user hiện tại hoặc chưa đăng nhập.");
      return;
    }

    const userId = userData.user_id || userData.id;
    console.log("👤 [Dashboard] User ID trích xuất từ token/API:", userId);
    setUserName(userData.full_name || userData.name || "Gia Sư");

    try {
      // 1. Lấy thông tin gia sư theo user_id chính xác bằng tutorService.getByUserId
      console.log(`📡 [Dashboard] Đang gọi tutorService.getByUserId(${userId})...`);
      const tutorRes = await tutorService.getByUserId(userId);
      console.log("📦 [Dashboard] Kết quả trả về từ tutorRes:", tutorRes);

      const tutorList = Array.isArray(tutorRes) ? tutorRes : (tutorRes?.data || [tutorRes]);
      // Tìm đúng hồ sơ gia sư có user_id trùng khớp tuyệt đối với user hiện tại
      let tutorDetail = tutorList.find(t => t.user_id === userId) || tutorList[0];      
      if (!tutorDetail) {
        console.warn("⚠️ [Dashboard] Không tìm thấy dữ liệu hồ sơ gia sư (tutorDetail) tương ứng với user này!");
        return;
      }

      const tutorId = tutorDetail.tutor_id || tutorDetail.id;
      console.log("🆔 [Dashboard] Tutor ID xác định được:", tutorId);
      
      // 2. ⚡ GỘP FETCH DỮ LIỆU SONG SONG QUA CÁC SERVICE SẴN CÓ
      console.log("📡 [Dashboard] Đang gọi Promise.all lấy users, lessonConfirmations, courses...");
      console.log("🔍 [Dashboard] Đang gọi getCourses với tutor_id:", tutorId);
      
      const [usersRes, confRes, coursesRes] = await Promise.all([
        userService.getUsers(),
        lessonConfirmationService.getLessonConfirmations(tutorId),
        courseService.getCourses({ tutor_id: tutorId })
      ]);

      console.log("📊 [Dashboard] Kết quả thô:", { usersRes, confRes, coursesRes });

      const allUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
      let lessonConfirmations = Array.isArray(confRes) ? confRes : (confRes?.data || []);
      let coursesData = Array.isArray(coursesRes) ? coursesRes : (coursesRes?.data || []);

      // 🛡️ Lọc thủ công đảm bảo chỉ lấy đúng lớp của gia sư hiện tại sở hữu tutorId
      coursesData = coursesData.filter(c => c.tutor_id === tutorId || c.instructor_id === tutorId);

      // 3. 🔄 Xử lý tự động giải ngân (holding payouts)
      const now = new Date();
      const readyConfirmations = lessonConfirmations.filter(lc => {
        if (lc.payout_status !== "holding") return false;
        const payoutTime = new Date(lc.payout_available_at);
        return now >= payoutTime;
      });

      if (readyConfirmations.length > 0) {
        console.log(`💰 [Dashboard] Phát hiện ${readyConfirmations.length} khoản tiền đến hạn giải ngân.`);
        let updatedPending = tutorDetail.pending_balance || 0;
        let updatedAvailable = tutorDetail.available_balance || 0;

        await Promise.all(
          readyConfirmations.map(async (conf) => {
            const amount = conf.lesson_amount || 0;
            updatedPending = Math.max(0, updatedPending - amount);
            updatedAvailable += amount;

            await lessonConfirmationService.updateLessonConfirmation(conf.id, {
              payout_status: "transferred",
              status: "approved"
            });
          })
        );

        await tutorService.updateTutorBalance(tutorDetail.id, {
          pending_balance: updatedPending,
          available_balance: updatedAvailable
        });

        tutorDetail.pending_balance = updatedPending;
        tutorDetail.available_balance = updatedAvailable;
      }

      // 4. Xử lý tính toán thống kê, khóa học và lịch học
      const activeClasses = coursesData.filter(c => c.status === "active");
      const totalStudents = coursesData.reduce((sum, c) => sum + (c.students?.length || 0), 0);
      
      const availableWallet = tutorDetail?.available_balance || 0;
      const pendingWallet = tutorDetail?.pending_balance || 0;
      const calculatedTotalIncome = availableWallet + pendingWallet;

      setStats({
        totalIncome: `${calculatedTotalIncome.toLocaleString("vi-VN")}đ`,
        incomeGrowth: pendingWallet > 0 ? `+${((pendingWallet / (calculatedTotalIncome || 1)) * 100).toFixed(0)}% chờ duyệt` : "Ổn định",
        totalStudents: totalStudents,
        studentsGrowth: `+${activeClasses.length} lớp`,
        openClasses: activeClasses.length < 10 ? `0${activeClasses.length}` : activeClasses.length.toString(),
        rating: `${tutorDetail?.rating || 0}/5.0`
      });

      const dayMap = {
        "Chủ Nhật": 0, "Chủ nhật": 0, "CN": 0,
        "Thứ 2": 1, "Thứ hai": 1, "T2": 1,
        "Thứ 3": 2, "Thứ ba": 2, "T3": 2,
        "Thứ 4": 3, "Thứ tư": 3, "T4": 3,
        "Thứ 5": 4, "Thứ năm": 4, "T5": 4,
        "Thứ 6": 5, "Thứ sáu": 5, "T6": 5,
        "Thứ 7": 6, "Thứ bảy": 6, "T7": 6
      };

      const confirmableList = [];

      const formattedClasses = coursesData
        .map((course) => {
          if (course.status !== "active") return null;

          const timeSlot = course.time_slot || "18:00-20:00";
          const scheduleDays = Array.isArray(course.schedule_days) ? course.schedule_days : [];
          const [startStr, endStr] = timeSlot.split("-").map(s => s.trim());
          const [startHour, startMinute] = (startStr || "00:00").split(":").map(Number);
          const [endHour, endMinute] = (endStr || "23:59").split(":").map(Number);

          const startDate = course.start_date ? new Date(course.start_date) : new Date();
          const totalWeeks = course.total_weeks || 12;
          const endDate = new Date(startDate.getTime());
          endDate.setDate(endDate.getDate() + (totalWeeks * 7));

          const enrolledStudents = (course.students || []).map(stId => {
            const u = allUsers.find(usr => usr.user_id === stId || usr.id === stId);
            return u ? { user_id: stId, full_name: u.full_name, email: u.email, phone: u.phone, avatar: u.avatar } 
                     : { user_id: stId, full_name: "Học sinh " + stId };
          });

          for (let i = 0; i <= 14; i++) {
            const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            if (checkDate >= startDate && checkDate <= endDate) {
              const dayOfWeek = checkDate.getDay();
              if (scheduleDays.some(d => dayMap[d] === dayOfWeek)) {
                const sessionEnd = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), endHour, endMinute, 0);

                if (now >= sessionEnd) {
                  const yearStr = checkDate.getFullYear();
                  const monthStr = String(checkDate.getMonth() + 1).padStart(2, "0");
                  const dateNumStr = String(checkDate.getDate()).padStart(2, "0");
                  const dateStr = `${yearStr}-${monthStr}-${dateNumStr}`;

                  const confirmationId = `${course.course_id || course.id}_${dateStr}`;
                  const isAlreadySubmitted = lessonConfirmations.some(lc => lc.comfirmation_id === confirmationId);

                  if (!isAlreadySubmitted) {
                    const durationHours = Math.max(((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60, 0.5);
                    
                    confirmableList.push({
                      comfirmation_id: confirmationId,
                      course_id: course.course_id || course.id,
                      course_title: course.title,
                      tutor_id: tutorId,
                      tutor_db_id: tutorDetail.id,
                      lesson_date: dateStr,
                      time_slot: timeSlot,
                      price_per_session: course.price_per_session || 0,
                      duration_hours: durationHours,
                      students_count: course.students?.length || 0,
                      tutor_pending_balance: tutorDetail.pending_balance || 0
                    });
                  }
                }
              }
            }
          }

          if (now > endDate) return null;

          let nextStartDateTime = null;
          let nextEndDateTime = null;
          
          for (let i = 0; i <= 14; i++) {
            const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            if (checkDate >= startDate && checkDate <= endDate) {
              const dayOfWeek = checkDate.getDay();
              if (scheduleDays.some(d => dayMap[d] === dayOfWeek)) {
                const sessionStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), startHour, startMinute, 0);
                const sessionEnd = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), endHour, endMinute, 0);

                if (now > sessionEnd) continue;

                nextStartDateTime = sessionStart;
                nextEndDateTime = sessionEnd;
                break;
              }
            }
          }

          if (!nextStartDateTime) return null;

          const canJoinTime = new Date(nextStartDateTime.getTime() - 15 * 60 * 1000);
          const isLive = now >= canJoinTime && now <= nextEndDateTime;

          let dateTag = "";
          const formattedDateString = nextStartDateTime.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit"
          });

          if (isLive) {
            dateTag = "🔴 ĐANG DIỄN RA";
          } else if (nextStartDateTime.toDateString() === now.toDateString()) {
            dateTag = `HÔM NAY, ${formattedDateString}`;
          } else {
            const diffTime = nextStartDateTime.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
            isLive: isLive,
            thumbnail: course.thumbnail,
            permanent_room_url: course.permanent_room_url || null
          };
        })
        .filter(Boolean);

      formattedClasses.sort((a, b) => a.sortTimestamp - b.sortTimestamp);

      setClassesList(formattedClasses.slice(0, 3));
      setPendingConfirmations(confirmableList);

      const mockChart = [
        { name: "Th1", income: Math.round(availableWallet * 0.15 / 1000000) || 4 },
        { name: "Th2", income: Math.round(availableWallet * 0.3 / 1000000) || 7 },
        { name: "Th3", income: Math.round(availableWallet * 0.45 / 1000000) || 11 },
        { name: "Th4", income: Math.round(availableWallet * 0.6 / 1000000) || 14 },
        { name: "Th5", income: Math.round(availableWallet * 0.8 / 1000000) || 18 },
        { name: "Th6", income: Math.round(calculatedTotalIncome / 1000000) || 22 },
      ];
      setChartData(mockChart);
      console.log("✅ [Dashboard] Hoàn tất cập nhật dữ liệu thành công!");

    } catch (error) {
      console.error("❌ [Dashboard] Lỗi xử lý API tại trang Dashboard:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) await fetchDashboardData();
    };
    loadData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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