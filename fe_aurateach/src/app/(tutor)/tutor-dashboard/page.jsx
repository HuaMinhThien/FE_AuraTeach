"use client";

import { useEffect, useState } from "react";
import Tutor_sec1 from "./_component/Tutor_sec1";
import Tutor_sec2 from "./_component/Tutor_sec2";
import Tutor_sec3 from "./_component/Tutor_sec3";
import Tutor_sec4 from "./_component/Tutor_sec4";

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

  const getCookie = (name) => {
    if (typeof window === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      const userCookie = getCookie("user_info");
      if (!userCookie) return;

      try {
        const userData = JSON.parse(decodeURIComponent(userCookie));
        const tutorId = userData.user_id || userData.tutor_id || userData.id || "u-01";
        
        setUserName(userData.full_name || userData.name || "Gia Sư");

        // Hàm helper an toàn: tự động tìm mảng bất chấp cấu trúc API trả về kiểu gì
        const extractArray = (resData) => {
          if (Array.isArray(resData)) return resData;
          if (!resData || typeof resData !== "object") return [];
          if (Array.isArray(resData.data)) return resData.data;
          if (resData.data && typeof resData.data === "object") {
            if (Array.isArray(resData.data.data)) return resData.data.data;
          }
          // Quét toàn bộ property trong object nếu lỡ backend bọc sâu
          for (let key in resData) {
            if (Array.isArray(resData[key])) return resData[key];
          }
          return [];
        };

        // 1. Fetch thông tin ví từ tutors
        const tutorRes = await fetch(`http://localhost:8000/api/tutors?user_id=${tutorId}`);
        let tutorDetail = null;
        if (tutorRes.ok) {
          const tutorJson = await tutorRes.json();
          const tutorList = extractArray(tutorJson);
          if (tutorList.length > 0) tutorDetail = tutorList[0];
        }

        // 2. Fetch danh sách lớp từ courses
        const coursesRes = await fetch(`http://localhost:8000/api/courses?tutor_id=${tutorId}`);
        if (coursesRes.ok) {
          const coursesJson = await coursesRes.json();
          const coursesData = extractArray(coursesJson); // Đảm bảo 100% là mảng

          const activeClasses = coursesData.filter(c => c.status === "active");
          const totalStudents = coursesData.reduce((sum, c) => sum + (Array.isArray(c.students) ? c.students.length : 0), 0);
          const availableWallet = parseFloat(tutorDetail?.available_balance) || 0;
          const pendingWallet = parseFloat(tutorDetail?.pending_balance) || 0;
          const calculatedTotalIncome = availableWallet + pendingWallet;
          const ratingValue = tutorDetail?.rating ? tutorDetail.rating : "0.0";
          const safeTotal = calculatedTotalIncome > 0 ? calculatedTotalIncome : 1; 
          const growthPercentage = pendingWallet > 0 
            ? Math.round((pendingWallet / safeTotal) * 100) 
            : 0;

          setStats({
            totalIncome: `${Math.round(calculatedTotalIncome).toLocaleString("vi-VN")}đ`,
            incomeGrowth: pendingWallet > 0 ? `+${growthPercentage}% chờ duyệt` : "Ổn định",
            totalStudents: totalStudents,
            studentsGrowth: `+${activeClasses.length} lớp`,
            openClasses: activeClasses.length < 10 ? `0${activeClasses.length}` : activeClasses.length.toString(),
            rating: `${ratingValue}/5.0`
          });

          // --- THUẬT TOÁN TÌM CHÍNH XÁC NGÀY HỌC TIẾP THEO ---
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

          const formattedClasses = coursesData
            .map((course) => {
              const timeSlot = course.time_slot || "19:00-21:00";
              
              let scheduleDays = [];
              if (Array.isArray(course.schedule_days)) {
                scheduleDays = course.schedule_days;
              } else if (typeof course.schedule_days === "string") {
                try {
                  scheduleDays = JSON.parse(course.schedule_days);
                } catch (e) {
                  scheduleDays = [];
                }
              }
              
              const startTimeStr = timeSlot.split("-")[0].trim();
              const [startHour, startMinute] = startTimeStr.split(":").map(Number);

              const startDate = course.start_date ? new Date(course.start_date) : new Date();
              const totalWeeks = course.total_weeks || 12;
              const endDate = new Date(startDate.getTime());
              endDate.setDate(endDate.getDate() + (totalWeeks * 7));

              if (now > endDate) return null;

              let nextClassDate = null;
              
              for (let i = 0; i <= 7; i++) {
                const checkDate = new Date(now.getTime());
                checkDate.setDate(now.getDate() + i);
                
                if (checkDate >= startDate && checkDate <= endDate) {
                  const dayNameInJs = checkDate.getDay();
                  const isMatchDay = scheduleDays.some(d => dayMap[d] === dayNameInJs);

                  if (isMatchDay) {
                    checkDate.setHours(startHour || 0, startMinute || 0, 0, 0);
                    if (i === 0 && now > checkDate) {
                      continue;
                    }
                    nextClassDate = checkDate;
                    break;
                  }
                }
              }

              if (!nextClassDate) {
                nextClassDate = startDate;
                nextClassDate.setHours(startHour || 0, startMinute || 0, 0, 0);
              }

              let dateTag = "";
              const diffTime = nextClassDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              const formattedDateString = nextClassDate.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit"
              });

              if (nextClassDate.toDateString() === now.toDateString()) {
                dateTag = `HÔM NAY, ${formattedDateString}`;
              } else if (diffDays === 1) {
                dateTag = `NGÀY MAI, ${formattedDateString}`;
              } else {
                const weekdays = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
                dateTag = `${weekdays[nextClassDate.getDay()]}, ${formattedDateString}`;
              }

              return {
                id: course.id || course.course_id,
                tag: dateTag,
                title: course.title || course.class_name || "Lớp học chưa đặt tên",
                time: timeSlot,
                students: `${Array.isArray(course.students) ? course.students.length : 0} học viên`,
                sortTimestamp: nextClassDate.getTime(),
                isUrgent: false,
                thumbnail: course.thumbnail,
                permanent_room_url: course.permanent_room_url || null
              };
            })
            .filter(Boolean);

          formattedClasses.sort((a, b) => a.sortTimestamp - b.sortTimestamp);

          if (formattedClasses.length > 0) {
            const firstClassTime = formattedClasses[0].sortTimestamp;
            const oneDayInMs = 24 * 60 * 60 * 1000;
            
            if (firstClassTime - now.getTime() < oneDayInMs) {
              formattedClasses[0].isUrgent = true;
              if (formattedClasses[0].tag.includes("HÔM NAY")) {
                formattedClasses[0].tag = "SẮP DIỄN RA (HÔM NAY)";
              }
            }
          }

          const limitedClasses = formattedClasses.slice(0, 3);
          setClassesList(limitedClasses);

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

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", marginTop: "80px" }}>
      <Tutor_sec1 tutorName={userName} statsData={stats} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", width: "100%" }}>
        <Tutor_sec2 classesData={classesList} />
        <Tutor_sec3 activitiesData={null} />
      </div>
      <Tutor_sec4 chartData={chartData} />
    </div>
  );
}