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

        // 1. Fetch thông tin ví từ tutors
        const tutorRes = await fetch(`http://localhost:3007/tutors?user_id=${tutorId}`);
        let tutorDetail = null;
        if (tutorRes.ok) {
          const tutorData = await tutorRes.json();
          if (tutorData && tutorData.length > 0) tutorDetail = tutorData[0];
        }

        // 2. Fetch danh sách lớp từ courses
        const coursesRes = await fetch(`http://localhost:3007/courses?tutor_id=${tutorId}`);
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();

          const activeClasses = coursesData.filter(c => c.status === "active");
          const totalStudents = coursesData.reduce((sum, c) => sum + (c.students?.length || 0), 0);
          const availableWallet = tutorDetail?.available_balance || 0;
          const pendingWallet = tutorDetail?.pending_balance || 0;
          const calculatedTotalIncome = availableWallet + pendingWallet;
          const rating = tutorDetail?.rating;

          setStats({
            totalIncome: `${calculatedTotalIncome.toLocaleString("vi-VN")}đ`,
            incomeGrowth: pendingWallet > 0 ? `+${((pendingWallet / (calculatedTotalIncome || 1)) * 100).toFixed(0)}% chờ duyệt` : "Ổn định",
            totalStudents: totalStudents,
            studentsGrowth: `+${activeClasses.length} lớp`,
            openClasses: activeClasses.length < 10 ? `0${activeClasses.length}` : activeClasses.length.toString(),
            rating: `${rating}/5.0`
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
              const scheduleDays = Array.isArray(course.schedule_days) ? course.schedule_days : [];
              
              // Lấy giờ bắt đầu dạy (Ví dụ: "19:00-21:00" -> 19 giờ 00 phút)
              const startTimeStr = timeSlot.split("-")[0].trim();
              const [startHour, startMinute] = startTimeStr.split(":").map(Number);

              // Phân tích ngày bắt đầu khóa học (start_date trong DB đang lưu dạng YYYY-MM-DD)
              const startDate = course.start_date ? new Date(course.start_date) : new Date();
              
              // Tính ngày kết thúc dựa vào số tuần dạy (total_weeks)
              const totalWeeks = course.total_weeks || 12;
              const endDate = new Date(startDate.getTime());
              endDate.setDate(endDate.getDate() + (totalWeeks * 7));

              // Nếu khóa học đã kết thúc hoàn toàn hoặc chưa tới ngày bắt đầu, đặt trọng số rất lớn để đẩy xuống cuối
              if (now > endDate) return null;

              let nextClassDate = null;
              
              // Vòng lặp quét từ hôm nay trở đi tối đa 7 ngày để tìm ngày trùng lịch học gần nhất
              for (let i = 0; i <= 7; i++) {
                const checkDate = new Date(now.getTime());
                checkDate.setDate(now.getDate() + i);
                
                // Khóa học phải nằm trong khoảng thời gian đang chạy
                if (checkDate >= startDate && checkDate <= endDate) {
                  const dayNameInJs = checkDate.getDay(); // 0-6

                  // Kiểm tra ngày này có trùng với thứ nào được xếp lịch không
                  const isMatchDay = scheduleDays.some(d => dayMap[d] === dayNameInJs);

                  if (isMatchDay) {
                    // Set giờ học vào ngày tìm được
                    checkDate.setHours(startHour || 0, startMinute || 0, 0, 0);
                    
                    // Nếu ngày là hôm nay (i === 0) nhưng giờ học đã trôi qua rồi, bỏ qua tìm ngày tiếp theo
                    if (i === 0 && now > checkDate) {
                      continue;
                    }
                    
                    nextClassDate = checkDate;
                    break;
                  }
                }
              }

              // Nếu không tìm được ngày nào phù hợp (khóa học chưa bắt đầu), lấy tạm ngày bắt đầu khóa học
              if (!nextClassDate) {
                nextClassDate = startDate;
                nextClassDate.setHours(startHour || 0, startMinute || 0, 0, 0);
              }

              // Định dạng ngày hiển thị dạng trực quan (Ví dụ: "Hôm nay, 29/06" hoặc "Thứ 4, 01/07")
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
                students: `${course.students?.length || 0} học viên`,
                sortTimestamp: nextClassDate.getTime(), // Dùng timestamp chính xác làm trọng số sắp xếp
                isUrgent: false,
                thumbnail: course.thumbnail,
                permanent_room_url: course.permanent_room_url || null
              };
            })
            .filter(Boolean); // Loại bỏ các lớp đã kết thúc (null)

          // Sắp xếp lớp có thời gian diễn ra sớm nhất lên đầu tiên
          formattedClasses.sort((a, b) => a.sortTimestamp - b.sortTimestamp);

          // Gắn trạng thái khẩn cấp cho lớp đầu tiên gần nhất nếu khoảng cách thời gian dưới 1 ngày
          if (formattedClasses.length > 0) {
            const firstClassTime = formattedClasses[0].sortTimestamp;
            const oneDayInMs = 24 * 60 * 60 * 1000;
            
            if (firstClassTime - now.getTime() < oneDayInMs) {
              formattedClasses[0].isUrgent = true;
              // Nếu trùng hôm nay thì đổi chữ cho sinh động
              if (formattedClasses[0].tag.includes("HÔM NAY")) {
                formattedClasses[0].tag = "SẮP DIỄN RA (HÔM NAY)";
              }
            }
          }

          const limitedClasses = formattedClasses.slice(0, 3);
          setClassesList(limitedClasses);

          // Build biểu đồ
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