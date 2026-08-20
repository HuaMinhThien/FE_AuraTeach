"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import "../../css/tutor-style/header.css"; 
import NotificationBell from "@/components/common/NotificationBell";

export default function Header() {
    const [user, setUser] = useState(null);
    const [monthlySalary, setMonthlySalary] = useState(0);

    const getCookie = (name) => {
        if (typeof window === "undefined") return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    useEffect(() => {
        const checkUser = () => {
            const userCookie = getCookie("user_info");
            if (userCookie) {
                try {
                    const userData = JSON.parse(decodeURIComponent(userCookie));
                    setUser(userData);
                } catch (error) {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };

        checkUser();
        const interval = setInterval(checkUser, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchMonthlySalary = async () => {
            try {
                const userId = user.user_id || user.tutor_id || user.id;
                if (!userId) return;

                // 1. Lấy thông tin tutor để có tutor_id chính xác
                const tutorRes = await fetch(`http://localhost:3007/tutors?user_id=${userId}`);
                if (!tutorRes.ok) return;

                const tutorData = await tutorRes.json();
                if (!Array.isArray(tutorData) || tutorData.length === 0) return;

                const tutorInfo = tutorData[0];
                const actualTutorId = tutorInfo.tutor_id;

                // 2. Lấy tất cả buổi học đã hoàn thành
                const sessionsRes = await fetch("http://localhost:3007/class_sessions");
                if (!sessionsRes.ok) return;
                const allSessions = await sessionsRes.json();

                // 3. Lấy tất cả khóa học
                const coursesRes = await fetch("http://localhost:3007/courses");
                if (!coursesRes.ok) return;
                const allCourses = await coursesRes.json();

                // 4. Lọc các buổi học của gia sư này trong tháng hiện tại
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth(); // 0-11

                let totalSalary = 0;

                if (Array.isArray(allSessions) && Array.isArray(allCourses)) {
                    // Lọc các khóa học thuộc gia sư này
                    const tutorCourseIds = allCourses
                        .filter(c => c.tutor_id === actualTutorId)
                        .map(c => c.course_id || c.id);

                    allSessions.forEach(session => {
                        // Chỉ lấy buổi đã hoàn thành
                        if (session.session_status !== "completed") return;

                        // Kiểm tra buổi học thuộc lớp của gia sư này
                        const courseId = session.course_id;
                        if (!tutorCourseIds.includes(courseId)) return;

                        // Kiểm tra thuộc tháng hiện tại
                        const sessionDate = new Date(session.actual_date);
                        if (
                            sessionDate.getFullYear() === currentYear &&
                            sessionDate.getMonth() === currentMonth
                        ) {
                            // Tìm giá tiền 1 buổi của lớp này
                            const course = allCourses.find(
                                c => (c.course_id || c.id) === courseId
                            );
                            if (course && course.price_per_session) {
                                totalSalary += Number(course.price_per_session) || 0;
                            }
                        }
                    });
                }

                setMonthlySalary(totalSalary);
            } catch (error) {
                console.error("Lỗi khi tính tiền lương tháng này:", error);
                setMonthlySalary(0);
            }
        };

        fetchMonthlySalary();
        // Cập nhật mỗi 30 giây (có thể tăng nếu muốn)
        const intervalSalary = setInterval(fetchMonthlySalary, 30000);
        return () => clearInterval(intervalSalary);
    }, [user]);

    const getValidAvatar = (avatar) => {
        if (!avatar) return "/img/avt/avt.jpg";
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }
        if (avatar.startsWith('/')) {
            return avatar;
        }
        return "/img/avt/avt.jpg";
    };

    const userId = user?.user_id || user?.id || null;

    return (
        <>
            <header>
                <div className="header-icons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <NotificationBell 
                        userId={userId}
                        userRole="tutor"
                    />
                </div>

                {/* Tiền lương tháng này */}
                <div className="tutor-wallets" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div className="wallet-item" style={{ background: "#f0fdf4", padding: "4px 10px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                        <span style={{ fontSize: "11px", color: "#16a34a", display: "block", fontWeight: "500" }}>
                            Tiền lương tháng này
                        </span>
                        <strong style={{ color: "#15803d", fontSize: "14px" }}>
                            {monthlySalary.toLocaleString("vi-VN")}đ
                        </strong>
                    </div>
                </div>

                <hr />

                <div className="user-info">
                    <div className="avatar">
                        <Image
                            src={getValidAvatar(user?.avatar)}
                            alt="User Avatar"
                            width={40}
                            height={40}
                            style={{borderRadius: "50%", objectFit: "cover"}}
                        />
                    </div>
                    <div className="user-details">
                        <p>{user?.full_name || user?.name || "Gia sư"}</p> 
                    </div>
                </div>
            </header>
        </>
    );
}