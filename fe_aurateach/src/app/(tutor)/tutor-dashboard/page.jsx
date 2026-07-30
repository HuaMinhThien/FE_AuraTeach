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
        const userId = userData.user_id || userData.id || userData.tutor_id;
        
        setUserName(userData.full_name || userData.name || "Gia Sư");

        console.log("👤 User ID:", userId);

        // Lấy tất cả dữ liệu từ JSON Server
        const [usersRes, tutorsRes, coursesRes, bookingsRes] = await Promise.all([
          fetch(`${API_BASE}/users`),
          fetch(`${API_BASE}/tutors`),
          fetch(`${API_BASE}/courses`),
          fetch(`${API_BASE}/bookings`)
        ]);

        const users = await usersRes.json();
        const tutors = await tutorsRes.json();
        const courses = await coursesRes.json();
        const bookings = await bookingsRes.json();

        // Tìm tutor của user hiện tại
        let tutor = tutors.find(t => t.user_id === userId);
        if (!tutor) {
          tutor = tutors.find(t => t.tutor_id === userId);
        }

        if (!tutor) {
          console.warn("⚠️ Không tìm thấy tutor cho user:", userId);
          return;
        }

        console.log("✅ Tutor found:", tutor);

        // Lấy danh sách courses của tutor
        const tutorCourses = courses.filter(c => c.tutor_id === tutor.tutor_id);
        console.log("📚 Tutor courses:", tutorCourses.length);

        // ✅ TÍNH TỔNG HỌC VIÊN - CÁCH 1: Dùng Set để loại bỏ trùng
        const allStudents = new Set();
        tutorCourses.forEach(c => {
          if (c.students && Array.isArray(c.students)) {
            c.students.forEach(s => {
              if (s) {
                allStudents.add(s);
                console.log("👤 Student ID:", s);
              }
            });
          }
        });
        const totalStudents = allStudents.size;
        console.log("👥 Total unique students:", totalStudents);
        console.log("👥 Student list:", Array.from(allStudents));

        // ✅ TÍNH TỔNG HỌC VIÊN - CÁCH 2: Đếm từng học viên trong từng lớp
        let totalStudentsCount = 0;
        tutorCourses.forEach(c => {
          if (c.students && Array.isArray(c.students)) {
            totalStudentsCount += c.students.length;
          }
        });
        console.log("👥 Total students count (sum):", totalStudentsCount);

        // Lấy số lớp đang hoạt động
        const activeClasses = tutorCourses.filter(c => c.status === "active");
        console.log("📚 Active classes:", activeClasses.length);

        // Tính tổng thu nhập
        const totalIncome = (tutor.available_balance || 0) + (tutor.pending_balance || 0);
        console.log("💰 Total income:", totalIncome);

        // Lấy rating
        const tutorRating = tutor.rating || 0;

        // Cập nhật stats
        setStats({
          totalIncome: `${totalIncome.toLocaleString("vi-VN")}đ`,
          incomeGrowth: tutor.pending_balance > 0 
            ? `+${((tutor.pending_balance / (totalIncome || 1)) * 100).toFixed(0)}% chờ duyệt` 
            : totalIncome > 0 ? "Đã nhận đủ" : "Chưa có thu nhập",
          totalStudents: totalStudents, // ✅ Đã sửa: dùng Set để đếm unique
          studentsGrowth: activeClasses.length > 0 ? `${activeClasses.length} lớp đang mở` : "Chưa có lớp",
          openClasses: activeClasses.length < 10 ? `0${activeClasses.length}` : activeClasses.length.toString(),
          rating: `${tutorRating.toFixed(1)}/5.0`
        });

        // Xây dựng danh sách lớp sắp diễn ra
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

        const formattedClasses = tutorCourses
          .filter(c => c.status === "active")
          .map((course) => {
            const timeSlot = course.time_slot || "19:00-21:00";
            const scheduleDays = Array.isArray(course.schedule_days) ? course.schedule_days : [];
            
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

            // Lấy danh sách học viên thực tế
            const studentsList = course.students || [];
            const studentNames = studentsList.map(sid => {
              const user = users.find(u => u.user_id === sid);
              return user ? user.full_name : sid;
            });

            return {
              id: course.id || course.course_id,
              tag: dateTag,
              title: course.title || course.class_name || "Lớp học",
              time: timeSlot,
              students: studentsList,
              studentNames: studentNames,
              sortTimestamp: nextClassDate.getTime(),
              isUrgent: diffDays < 1,
              thumbnail: course.thumbnail,
              permanent_room_url: course.permanent_room_url || null,
              status: course.status
            };
          })
          .filter(Boolean);

        formattedClasses.sort((a, b) => a.sortTimestamp - b.sortTimestamp);
        const limitedClasses = formattedClasses.slice(0, 3);
        setClassesList(limitedClasses);

        // Xây dựng biểu đồ thu nhập
        const tutorPaidBookings = bookings.filter(b => 
          b.tutor_id === tutor.tutor_id && 
          (b.status === "confirmed" || b.payment_status === "paid")
        );

        const monthMap = {};
        const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
        
        for (let i = 0; i < 12; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - (11 - i));
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthMap[monthKey] = {
            name: monthNames[date.getMonth()],
            income: 0,
            month: date.getMonth(),
            year: date.getFullYear()
          };
        }

        tutorPaidBookings.forEach(b => {
          const date = new Date(b.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (monthMap[monthKey]) {
            const amount = b.payment_amount || 0;
            const tutorEarning = Math.round(amount * 0.61);
            monthMap[monthKey].income += tutorEarning;
          }
        });

        const chartDataArray = Object.values(monthMap)
          .sort((a, b) => a.year - b.year || a.month - b.month)
          .map(item => ({
            name: item.name,
            income: Math.round(item.income / 1000000)
          }));

        setChartData(chartDataArray);

      } catch (error) {
        console.error("❌ Lỗi xử lý API:", error);
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