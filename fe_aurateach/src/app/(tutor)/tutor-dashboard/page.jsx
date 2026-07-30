"use client";

import { useEffect, useState } from "react";
import Tutor_sec1 from "./_component/Tutor_sec1";
import Tutor_sec2 from "./_component/Tutor_sec2";
import Tutor_sec3 from "./_component/Tutor_sec3";
import Tutor_sec4 from "./_component/Tutor_sec4";

const API_BASE = "http://localhost:3007";

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

  const getCookie = (name) => {
    if (typeof window === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // 🔄 HÀM TỰ ĐỘNG GIẢI NGÂN (Trừ ví chờ pending -> Cộng ví rút available sau 24 tiếng)
  const processHoldingPayouts = async (tutorDetail, lessonConfirmations) => {
    const now = new Date();
    const readyConfirmations = lessonConfirmations.filter(lc => {
      if (lc.payout_status !== "holding") return false;
      const payoutTime = new Date(lc.payout_available_at);
      return now >= payoutTime;
    });

    if (readyConfirmations.length === 0) return tutorDetail;

    let updatedPending = tutorDetail.pending_balance || 0;
    let updatedAvailable = tutorDetail.available_balance || 0;

    for (const conf of readyConfirmations) {
      const amount = conf.lesson_amount || 0;
      updatedPending = Math.max(0, updatedPending - amount);
      updatedAvailable += amount;

      await fetch(`http://localhost:3007/lesson_confirmations/${conf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payout_status: "transferred",
          status: "approved"
        })
      });
    }

    await fetch(`http://localhost:3007/tutors/${tutorDetail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pending_balance: updatedPending,
        available_balance: updatedAvailable
      })
    });

    return {
      ...tutorDetail,
      pending_balance: updatedPending,
      available_balance: updatedAvailable
    };
  };

  const fetchDashboardData = async () => {
    const userCookie = getCookie("user_info");
    if (!userCookie) return;

    try {
      const userData = JSON.parse(decodeURIComponent(userCookie));
      const userId = userData.user_id;
      setUserName(userData.full_name || userData.name || "Gia Sư");

      // 1. Lấy thông tin gia sư
      const tutorRes = await fetch(`http://localhost:3007/tutors?user_id=${userId}`);
      let tutorDetail = null;
      if (tutorRes.ok) {
        const tutorData = await tutorRes.json();
        if (tutorData && tutorData.length > 0) tutorDetail = tutorData[0];
      }

      if (!tutorDetail) return;

      const usersRes = await fetch(`http://localhost:3007/users`);
      const allUsers = usersRes.ok ? await usersRes.json() : [];

      // 2. Lấy danh sách xác nhận bài học & tự động giải ngân nếu đủ 24 tiếng
      const confRes = await fetch(`http://localhost:3007/lesson_confirmations?tutor_id=${tutorDetail.tutor_id}`);
      let lessonConfirmations = confRes.ok ? await confRes.json() : [];

      tutorDetail = await processHoldingPayouts(tutorDetail, lessonConfirmations);

      // 3. Lấy danh sách khóa học
      const coursesRes = await fetch(`http://localhost:3007/courses?tutor_id=${tutorDetail.tutor_id}`);
      
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
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

        const now = new Date();
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

            // KIỂM TRA BUỔI HỌC VỪA KẾT THÚC CẦN XÁC NHẬN HOÀN THÀNH (14 NGÀY GẦN NHẤT)
            for (let i = 0; i <= 14; i++) {
              const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
              if (checkDate >= startDate && checkDate <= endDate) {
                const dayOfWeek = checkDate.getDay();
                if (scheduleDays.some(d => dayMap[d] === dayOfWeek)) {
                  const sessionEnd = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), endHour, endMinute, 0);

                  // Đã vượt qua thời điểm kết thúc buổi học
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
                        tutor_id: tutorDetail.tutor_id,
                        tutor_db_id: tutorDetail.id,
                        lesson_date: dateStr,
                        time_slot: timeSlot,
                        hourly_rate: course.hourly_rate || 0,
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
              hourly_rate: course.hourly_rate,
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
      }
    } catch (error) {
      console.error("Lỗi xử lý API tại trang Dashboard:", error);
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