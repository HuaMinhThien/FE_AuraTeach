"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./CreateClassRequest.module.css";
import PaymentModal from "@/components/users/PaymentModal";
import paymentService from "@/services/paymentService";

// Helper đọc cookie phía client
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

// Helper parse dữ liệu user_info từ Cookie
const getUserInfoFromCookie = () => {
  try {
    const rawUserInfo = getCookie("user_info");
    if (rawUserInfo) {
      const decoded = decodeURIComponent(rawUserInfo);
      return JSON.parse(decoded);
    }
  } catch (err) {
    console.error("Lỗi parse cookie user_info:", err);
  }
  return null;
};

// Helper lấy ID học sinh đang đăng nhập từ Cookie
const getCurrentStudentId = () => {
  const userInfo = getUserInfoFromCookie();
  if (userInfo && userInfo.user_id) {
    return userInfo.user_id;
  }
  return (
    getCookie("student_id") ||
    getCookie("user_id") ||
    getCookie("id") ||
    null
  );
};

// Sinh link phòng học nội bộ dựa trên courseId
const generateRoomLink = (courseId) => `/room/${courseId}`;

const PRICE_LIMITS = {
  "Giáo viên": {
    lessThan3: {
      "Cấp 1": { min: 200000, max: 250000, label: "200.000đ - 250.000đ / buổi" },
      "Cấp 2": { min: 230000, max: 300000, label: "230.000đ - 300.000đ / buổi" },
      "Cấp 3": { min: 250000, max: 350000, label: "250.000đ - 350.000đ / buổi" },
    },
  },
  "Sinh viên": {
    lessThan3: {
      "Cấp 1": { min: 120000, max: 150000, label: "120.000đ - 150.000đ / buổi" },
      "Cấp 2": { min: 130000, max: 170000, label: "130.000đ - 170.000đ / buổi" },
      "Cấp 3": { min: 150000, max: 200000, label: "150.000đ - 200.000đ / buổi" },
    },
  },
};

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

const GENERATE_TIME_SLOTS = () => {
  const slots = [];
  for (let i = 7; i <= 21; i++) {
    const hour = i < 10 ? `0${i}:00` : `${i}:00`;
    slots.push(hour);
  }
  return slots;
};

const roundToThousand = (amount) => Math.round(amount / 1000) * 1000;

const getMinStartDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toISOString().split("T")[0];
};

export default function CreateClassRequest() {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [existingCourses, setExistingCourses] = useState([]);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  // State cho thanh toán QR sau khi chấp nhận gia sư
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedNewCourse, setSelectedNewCourse] = useState(null);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [paymentStudentId, setPaymentStudentId] = useState(null);

  const getInitialFormData = (defaultCatId = "") => ({
    student_id: getCurrentStudentId(),
    title: "",
    category_id: defaultCatId,
    grade_level: "Cấp 3",
    tutor_level: "Sinh viên",
    max_students: 1, // Cố định 1 học sinh (1-1)
    price_per_session: "",
    description: "",
    schedule_type: "1_term",
    total_weeks: 18,
    start_date: getMinStartDate(),
    schedule_days: [],
    start_time: "07:00",
    meet_link: "",
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [loading, setLoading] = useState(false);
  const [conflictError, setConflictError] = useState("");

  useEffect(() => {
    const currentStudentId = getCurrentStudentId();
    setFormData((prev) => ({ ...prev, student_id: currentStudentId }));
  }, []);

  const checkAuthAndRole = () => {
    const userInfo = getUserInfoFromCookie();
    const token = getCookie("token") || getCookie("user") || getCookie("auth") || userInfo;
    const role = getCookie("role") || getCookie("user_role") || (userInfo && userInfo.role);

    if (!token && !userInfo) {
      alert("Bạn cần đăng nhập để sử dụng tính năng này!");
      router.push("/login");
      return false;
    }

    if (role && role !== "student") {
      alert("Tính năng này chỉ dành cho tài khoản Học sinh (Student)!");
      return false;
    }

    return true;
  };

  const handleOpenCreateModal = () => {
    if (!checkAuthAndRole()) return;
    setEditingRequestId(null);
    const defaultCat = categories.length > 0 ? categories[0].category_id : "";
    setFormData(getInitialFormData(defaultCat));
    setIsModalOpen(true);
  };

  const fetchRequestsAndCourses = async () => {
    try {
      const currentStudentId = getCurrentStudentId();

      if (!currentStudentId) {
        setRequestsList([]);
        setExistingCourses([]);
        return;
      }

      const [resCat, resReq, resCourse, resApp, resTutors, resUsers] = await Promise.all([
        fetch("http://localhost:3007/categories"),
        fetch("http://localhost:3007/class_requests"),
        fetch("http://localhost:3007/courses"),
        fetch("http://localhost:3007/request_applications"),
        fetch("http://localhost:3007/tutors"),
        fetch("http://localhost:3007/users"),
      ]);

      let catList = [];
      if (resCat.ok) {
        const catData = await resCat.json();
        catList = Array.isArray(catData) ? catData : [];
        setCategories(catList);
      }

      let applications = [];
      if (resApp.ok) {
        applications = await resApp.json();
      }

      let tutorsList = [];
      if (resTutors.ok) {
        tutorsList = await resTutors.json();
      }

      let usersList = [];
      if (resUsers.ok) {
        usersList = await resUsers.json();
      }

      if (resReq.ok) {
        const data = await resReq.json();
        if (Array.isArray(data)) {
          const myRequestsMap = new Map();

          data
            .filter((item) => item.student_id === currentStudentId)
            .forEach((req) => {
              const reqId = req.requests_id || req.id;
              
              if (!myRequestsMap.has(reqId)) {
                const matchedApps = applications.filter(
                  (app) => app.requests_id === reqId || app.request_id === reqId
                );

                const appliedTutorsList = matchedApps.map((app) => {
                  const tutorObj = tutorsList.find((t) => t.tutor_id === app.tutor_id) || {};
                  const userObj = usersList.find((u) => u.user_id === tutorObj.user_id) || {};
                  return {
                    tutor_id: app.tutor_id,
                    full_name: userObj.full_name || tutorObj.full_name || "Gia sư",
                    avatar: userObj.avatar || tutorObj.avatar || "/img/avt/avt.jpg",
                    level: tutorObj.level || "Gia sư",
                    experience: tutorObj.experience || "Có kinh nghiệm",
                    rating: tutorObj.rating || 5,
                    app_id: app.id,
                  };
                });

                myRequestsMap.set(reqId, {
                  ...req,
                  applied_tutors: req.applied_tutors && req.applied_tutors.length > 0 
                    ? req.applied_tutors 
                    : appliedTutorsList,
                });
              }
            });

          setRequestsList(Array.from(myRequestsMap.values()));
        } else {
          setRequestsList([]);
        }
      }

      if (resCourse.ok) {
        const courses = await resCourse.json();
        setExistingCourses(courses);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    }
  };

  useEffect(() => {
    fetchRequestsAndCourses();
  }, []);

  // Danh sách môn học hiển thị linh hoạt (Tự động thêm lựa chọn khi Cấp 1)
  const availableCategories = useMemo(() => {
    const list = [...categories];
    if (formData.grade_level === "Cấp 1") {
      const exists = list.some((c) => c.category_id === "cap1_homework");
      if (!exists) {
        list.push({
          category_id: "cap1_homework",
          category_name: "Hỗ trợ bài tập về nhà các môn",
        });
      }
    }
    return list;
  }, [categories, formData.grade_level]);

  // Xử lý khi thay đổi cấp học
  const handleGradeLevelChange = (e) => {
    const newGrade = e.target.value;
    setFormData((prev) => {
      let nextCatId = prev.category_id;
      if (newGrade === "Cấp 1") {
        nextCatId = "cap1_homework";
      } else if (prev.category_id === "cap1_homework") {
        nextCatId = categories.length > 0 ? categories[0].category_id : "";
      }
      return {
        ...prev,
        grade_level: newGrade,
        category_id: nextCatId,
      };
    });
  };

  const endTime = useMemo(() => {
    if (!formData.start_time) return "09:00";
    const hour = parseInt(formData.start_time.split(":")[0], 10);
    const endHour = hour + 2;
    return endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;
  }, [formData.start_time]);

  const priceLimitInfo = useMemo(() => {
    const tutorCfg = PRICE_LIMITS[formData.tutor_level] || PRICE_LIMITS["Giáo viên"];
    return tutorCfg.lessThan3[formData.grade_level];
  }, [formData.tutor_level, formData.grade_level]);

  const isPriceValid = useMemo(() => {
    if (!formData.price_per_session || !priceLimitInfo) return true;
    const price = Number(formData.price_per_session);
    return price >= priceLimitInfo.min && price <= priceLimitInfo.max;
  }, [formData.price_per_session, priceLimitInfo]);

  const { totalSessions, monthlyEstimate, totalCoursePrice } = useMemo(() => {
    const daysPerWeek = formData.schedule_days.length;
    const totalSessions = daysPerWeek * formData.total_weeks;
    const price = Number(formData.price_per_session) || 0;

    const monthlySessions = daysPerWeek * 4;
    const monthlyEstimate = monthlySessions * price;
    const totalCoursePrice = totalSessions * price;

    return { totalSessions, monthlyEstimate, totalCoursePrice };
  }, [formData.schedule_days, formData.total_weeks, formData.price_per_session]);

  const checkConflictSchedule = () => {
    if (!formData.start_date || formData.schedule_days.length === 0) return false;

    const newStartHour = parseInt(formData.start_time.split(":")[0], 10);
    const newEndHour = newStartHour + 2;

    for (const course of existingCourses) {
      if (course.students && course.students.includes(formData.student_id)) {
        const hasCommonDay = course.schedule_days?.some((day) =>
          formData.schedule_days.includes(day)
        );
        if (hasCommonDay) {
          const [cStart, cEnd] = (course.time_slot || "00:00-00:00")
            .split("-")
            .map((t) => parseInt(t.split(":")[0], 10));

          if (
            (newStartHour >= cStart && newStartHour < cEnd) ||
            (newEndHour > cStart && newEndHour <= cEnd)
          ) {
            setConflictError(
              `⚠️ Trùng lịch học với lớp "${course.title}" (${course.time_slot} vào các ngày ${course.schedule_days.join(", ")})`
            );
            return true;
          }
        }
      }
    }

    setConflictError("");
    return false;
  };

  useEffect(() => {
    checkConflictSchedule();
  }, [formData.start_date, formData.schedule_days, formData.start_time]);

  const toggleDay = (day) => {
    setFormData((prev) => {
      const exists = prev.schedule_days.includes(day);
      return {
        ...prev,
        schedule_days: exists
          ? prev.schedule_days.filter((d) => d !== day)
          : [...prev.schedule_days, day],
      };
    });
  };

  const handleScheduleTypeChange = (e) => {
    const val = e.target.value;
    let weeks = 18;
    if (val === "2_terms") weeks = 36;
    if (val === "custom") weeks = 4;

    setFormData((prev) => ({
      ...prev,
      schedule_type: val,
      total_weeks: weeks,
    }));
  };

  // Sinh link phòng học nội bộ — dùng timestamp tạm, sẽ được thay bằng course_id thực khi submit
  const handleGenerateMeetLink = () => {
    if (!checkAuthAndRole()) return;
    const tempId = `room_${Date.now()}`;
    const link = generateRoomLink(tempId);
    setFormData((prev) => ({ ...prev, meet_link: link }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    if (!checkAuthAndRole()) return;

    // Validation giá & ngày học
    const priceEntered = Number(formData.price_per_session);
    if (priceLimitInfo) {
      if (priceEntered < priceLimitInfo.min || priceEntered > priceLimitInfo.max) {
        alert(
          `⚠️ Mức học phí nhập (${priceEntered.toLocaleString("vi-VN")}đ) không hợp lệ!\nChỉ cho phép nhập trong khoảng từ ${priceLimitInfo.min.toLocaleString("vi-VN")} VNĐ đến ${priceLimitInfo.max.toLocaleString("vi-VN")} VNĐ.`
        );
        return;
      }
    }

    const selectedDate = new Date(formData.start_date);
    const minDate = new Date(getMinStartDate());
    selectedDate.setHours(0,0,0,0);
    minDate.setHours(0,0,0,0);

    if (selectedDate < minDate) {
      alert("⚠️ Ngày bắt đầu học phải chọn gần nhất cách ngày tạo ít nhất 5 ngày!");
      return;
    }

    if (formData.schedule_days.length === 0) {
      alert("Vui lòng chọn ít nhất 1 thứ trong tuần!");
      return;
    }

    if (formData.schedule_type === "custom" && formData.total_weeks > 4) {
      alert("⚠️ Lựa chọn lớp riêng lẻ chỉ cho phép tối đa 4 tuần!");
      return;
    }

    if (checkConflictSchedule()) {
      alert("Vui lòng xử lý trùng lịch học trước khi đăng bài!");
      return;
    }

    setLoading(true);
    try {
      const currentStudentId = getCurrentStudentId();

      // Chuẩn hóa payload giống hệt logic trong route.js để tránh lệch kiểu dữ liệu
      const normalizedPayload = {
        student_id: currentStudentId,
        category_id: formData.category_id,
        title: formData.title,
        description: formData.description || "",
        level: formData.grade_level || formData.level,
        price_per_session: Number(formData.price_per_session),
        status: "pending",
        schedule_days: formData.schedule_days || [],
        time_slot: `${formData.start_time}-${endTime}`,
        max_students: 1,
        total_weeks: Number(
          formData.total_weeks ||
            (formData.schedule_type === "2_terms" ? 36 : formData.schedule_type === "custom" ? 4 : 18)
        ),
        start_date: formData.start_date,
        schedule_type: formData.schedule_type || "1_term",
        tutor_level: formData.tutor_level || "Giáo viên",
        start_time: formData.start_time,
        end_time: endTime,
        meet_link: formData.meet_link || generateRoomLink(`room_${Date.now()}`),
      };

      // 1. Nếu đang chọn lộ trình / chỉnh sửa lớp đã có requests_id
      if (editingRequestId || formData.requests_id) {
        const targetId = editingRequestId || formData.requests_id || formData.id;
        await fetch(`http://localhost:3007/class_requests/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...normalizedPayload,
            id: targetId,
            requests_id: targetId,
            updated_at: new Date().toISOString(),
          }),
        });
        alert("Cập nhật lớp thành công!");
      } else {
        // 2. Chỉ POST khi thực sự tạo mới một lớp
        const newId = `req-${Date.now()}`;
        await fetch(`http://localhost:3007/class_requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...normalizedPayload,
            id: newId,
            requests_id: newId,
            created_at: new Date().toISOString(),
          }),
        });
        alert("Tạo yêu cầu lớp học thành công!");
      }

      setIsModalOpen(false);
      setEditingRequestId(null);
      fetchRequestsAndCourses();

    } catch (error) {
      console.error("Lỗi kết nối:", error);
      alert("Không thể kết nối đến hệ thống server!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!checkAuthAndRole()) return;
    if (!confirm("Bạn có chắc chắn muốn xóa yêu cầu tạo lớp này?")) return;
    try {
      const res = await fetch(`http://localhost:3007/class_requests/${requestId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Đã xóa yêu cầu tạo lớp học!");
        fetchRequestsAndCourses();
      }
    } catch (err) {
      console.error("Lỗi xóa yêu cầu:", err);
    }
  };

  const handleEditRequest = (req) => {
    if (!checkAuthAndRole()) return;
    const reqId = req.requests_id || req.id;
    setEditingRequestId(reqId);
    setFormData({
      student_id: req.student_id || getCurrentStudentId(),
      title: req.title,
      category_id: req.category_id,
      grade_level: req.level || req.grade_level,
      tutor_level: req.tutor_level || "Sinh viên",
      max_students: 1,
      price_per_session: req.price_per_session,
      description: req.description,
      schedule_type: req.schedule_type || "1_term",
      total_weeks: req.total_weeks,
      start_date: req.start_date || getMinStartDate(),
      schedule_days: req.schedule_days || [],
      start_time: req.start_time || (req.time_slot ? req.time_slot.split("-")[0] : "07:00"),
      meet_link: req.meet_link || "",
    });
    setIsModalOpen(true);
  };

  const handleAcceptTutor = async (req, tutor) => {
    if (!checkAuthAndRole()) return;
    if (!confirm(`Xác nhận chọn gia sư ${tutor.full_name} dạy lớp này?`)) return;

    const currentStudentId = req.student_id || getCurrentStudentId();
    const newCourseId = `course-${Date.now()}`;

    // Tạo khóa học với students rỗng → để booking API tự thêm học sinh
    const newCoursePayload = {
      course_id: newCourseId,
      tutor_id: tutor.tutor_id,
      title: req.title,
      category_id: req.category_id,
      level: req.level || req.grade_level,
      description: req.description,
      max_students: 1,
      price_per_session: req.price_per_session,
      start_date: req.start_date,
      total_weeks: req.total_weeks,
      schedule_days: req.schedule_days,
      time_slot: req.time_slot || `${req.start_time}-${req.end_time}`,
      thumbnail: "/img/class/default-class-1.jpg",
      status: "active",
      permanent_room_url: generateRoomLink(newCourseId),
      students: []
      
    };

    try {
      const resCourse = await fetch("http://localhost:3007/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoursePayload),
      });

      if (!resCourse.ok) {
        const errData = await resCourse.json().catch(() => ({}));
        alert("Lỗi khi tạo khóa học: " + (errData.message || "Không thể tạo khóa học"));
        return;
      }

      const createdCourse = await resCourse.json();
      const courseWithId = createdCourse.id ? createdCourse : { ...newCoursePayload, id: createdCourse.id };

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: newCourseId,
          studentId: currentStudentId,
          tutorId: tutor.tutor_id,
          notes: "Đăng ký lớp riêng theo yêu cầu tạo lịch học",
          paymentMethod: "qr",
        }),
      });
      const bookingResult = await bookingRes.json();

      if (!bookingResult.success) {
        // Nếu booking thất bại thì xóa khóa học vừa tạo
        await fetch(`http://localhost:3007/courses/${courseWithId.id || newCourseId}`, {
          method: "DELETE",
        });
        alert("Không thể tạo booking: " + (bookingResult.message || "Vui lòng thử lại."));
        return;
      }

      // Xóa yêu cầu tạo lớp sau khi đã tạo khóa học + booking thành công
      const reqId = req.requests_id || req.id;
      await fetch(`http://localhost:3007/class_requests/${reqId}`, {
        method: "DELETE",
      });

      setRequestsList((prev) => prev.filter((r) => (r.requests_id || r.id) !== reqId));

      setSelectedNewCourse({ ...courseWithId, price_per_session: req.price_per_session, total_weeks: req.total_weeks });
      setPaymentBooking(bookingResult.data);
      setPaymentStudentId(currentStudentId);
      setShowPaymentModal(true);
    } catch (err) {
      console.error("Lỗi khi khởi tạo lớp học:", err);
      alert("Đã xảy ra lỗi khi khởi tạo lớp học. Vui lòng thử lại.");
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedNewCourse(null);
    setPaymentBooking(null);
    setPaymentStudentId(null);
    alert("🎉 Thanh toán thành công! Lớp học đã được khởi tạo và bạn đã được thêm vào lớp.");
    fetchRequestsAndCourses();
  };

  const handlePaymentClose = async () => {
    setShowPaymentModal(false);
    if (paymentBooking && paymentBooking.booking_id) {
      try {
        await paymentService.cancelBooking(paymentBooking.booking_id);
      } catch (err) {
        console.error("Hủy booking không thành công:", err);
      }
    }
    setSelectedNewCourse(null);
    setPaymentBooking(null);
    setPaymentStudentId(null);
    fetchRequestsAndCourses();
  };

  const getCategoryName = (catId) => {
    if (catId === "cap1_homework") return "Hỗ trợ bài tập về nhà các môn";
    const found = categories.find((c) => c.category_id === catId);
    return found ? found.category_name : catId;
  };

  const renderPriceTable = () => {
    const activeLevelConfig = PRICE_LIMITS[formData.tutor_level] || PRICE_LIMITS["Giáo viên"];
    const levels = ["Cấp 1", "Cấp 2", "Cấp 3"];

    return (
      <div style={{ marginTop: "15px", marginBottom: "15px" }}>
        <div style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#f8fafc",
          padding: "12px"
        }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#334155" }}>
            Khung giá quy định hệ thống ({formData.tutor_level})
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#edf2f7", borderBottom: "1px solid #cbd5e1" }}>
                <th style={{ padding: "8px" }}>Cấp học</th>
                <th style={{ padding: "8px" }}>Mức học phí lớp 1 kèm 1</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((lvl) => {
                const isSelected = formData.grade_level === lvl;
                const base = activeLevelConfig.lessThan3[lvl];

                return (
                  <tr
                    key={lvl}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      backgroundColor: isSelected ? "#eff6ff" : "transparent",
                      fontWeight: isSelected ? "bold" : "normal",
                      color: isSelected ? "#1d4ed8" : "#475569"
                    }}
                  >
                    <td style={{ padding: "8px" }}>{lvl}</td>
                    <td style={{ padding: "8px" }}>{base.min.toLocaleString("vi-VN")}đ - {base.max.toLocaleString("vi-VN")}đ / buổi</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>Quản Lý Yêu Cầu Tạo Lớp Học (Học Sinh)</h1>
        <button
          className={styles.openModalBtn}
          onClick={handleOpenCreateModal}
        >
          + Đăng Yêu Cầu Tạo Lớp Theo Nhu Cầu
        </button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeModalBtn} onClick={() => setIsModalOpen(false)}>
              ✕
            </button>
            <h2 className={styles.sectionTitle}>
              {editingRequestId ? "Chỉnh Sửa Yêu Cầu Tạo Lớp" : "Đăng Yêu Cầu Tạo Lớp Theo Nhu Cầu"}
            </h2>

            <div className={styles.layout}>
              <form onSubmit={handleSubmit} className={styles.formSection}>
                {conflictError && <div className={styles.errorAlert}>{conflictError}</div>}

                <div className={styles.formGroup}>
                  <label>Tên lớp học <span>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="VD: Lớp ôn thi THPT QG môn Toán"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.rowTwo}>
                  <div className={styles.formGroup}>
                    <label>Cấp học <span>*</span></label>
                    <select
                      className={styles.select}
                      value={formData.grade_level}
                      onChange={handleGradeLevelChange}
                    >
                      <option value="Cấp 1">Cấp 1</option>
                      <option value="Cấp 2">Cấp 2</option>
                      <option value="Cấp 3">Cấp 3</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Môn học <span>*</span></label>
                    <select
                      className={styles.select}
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      {availableCategories.map((cat, idx) => (
                        <option key={cat.category_id || `cat-${idx}`} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.rowTwo}>
                  <div className={styles.formGroup}>
                    <label>Yêu cầu trình độ Gia sư <span>*</span></label>
                    <select
                      className={styles.select}
                      value={formData.tutor_level}
                      onChange={(e) => setFormData({ ...formData, tutor_level: e.target.value })}
                    >
                      <option value="Sinh viên">Sinh viên</option>
                      <option value="Giáo viên">Giáo viên</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Số lượng học sinh</label>
                    <input
                      type="text"
                      className={styles.input}
                      value="1 học sinh (1 kèm 1)"
                      disabled
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Học phí chi trả mỗi buổi (VNĐ) <span>*</span></label>
                  <input
                    type="number"
                    className={`${styles.input} ${!isPriceValid ? styles.inputError : ""}`}
                    placeholder="Nhập số tiền..."
                    value={formData.price_per_session}
                    min={priceLimitInfo?.min}
                    max={priceLimitInfo?.max}
                    onChange={(e) => setFormData({ ...formData, price_per_session: e.target.value })}
                    required
                  />

                  {priceLimitInfo && (
                    <small className={!isPriceValid ? styles.priceHintError : styles.priceHint}>
                      {!isPriceValid
                        ? `⚠️ Bạn chỉ được phép nhập mức giá từ ${priceLimitInfo.min.toLocaleString("vi-VN")}đ đến ${priceLimitInfo.max.toLocaleString("vi-VN")}đ / buổi.`
                        : `* Mức giá cho phép: ${priceLimitInfo.min.toLocaleString("vi-VN")}đ - ${priceLimitInfo.max.toLocaleString("vi-VN")}đ / buổi.`}
                    </small>
                  )}
                </div>

                {renderPriceTable()}

                <div className={styles.formGroup}>
                  <label>Mô tả / Yêu cầu chi tiết</label>
                  <textarea
                    className={styles.textarea}
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  ></textarea>
                </div>

                <div className={styles.formGroup}>
                  <label>Link Google Meet</label>
                  <div className={styles.meetBox}>
                    <input
                      type="text"
                      className={styles.meetInput}
                      value={formData.meet_link || "Chưa khởi tạo..."}
                      readOnly
                    />
                    <button type="button" className={styles.genBtn} onClick={handleGenerateMeetLink}>
                      {formData.meet_link ? "Tạo lại link" : "Lấy link Meet"}
                    </button>
                  </div>
                </div>

                <div className={styles.sectionTitle} style={{ marginTop: "20px" }}>
                  Lịch học dự kiến
                </div>

                <div className={styles.formGroup}>
                  <label>Lộ trình học <span>*</span></label>
                  <select
                    className={styles.select}
                    value={formData.schedule_type}
                    onChange={handleScheduleTypeChange}
                  >
                    <option value="1_term">Dạy theo 1 kỳ (18 tuần)</option>
                    <option value="2_terms">Dạy theo 2 kỳ (36 tuần)</option>
                    <option value="custom">Dạy riêng lẻ (Tối đa 4 tuần)</option>
                  </select>
                </div>

                <div className={styles.rowTwo}>
                  <div className={styles.formGroup}>
                    <label>Ngày khai giảng (Bắt đầu vào lớp) <span>*</span></label>
                    <input
                      type="date"
                      className={styles.input}
                      min={getMinStartDate()}
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                    <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", display: "block" }}>
                      * Yêu cầu chọn ngày gần nhất cách hôm nay 5 ngày.
                    </small>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Số tuần dự kiến</label>
                    <input
                      type="number"
                      max={formData.schedule_type === "custom" ? 4 : 52}
                      className={styles.input}
                      value={formData.total_weeks}
                      disabled={formData.schedule_type !== "custom"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_weeks:
                            formData.schedule_type === "custom"
                              ? Math.min(4, parseInt(e.target.value) || 1)
                              : parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Chọn thứ trong tuần <span>*</span></label>
                  <div className={styles.daysGrid}>
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`${styles.dayBtn} ${
                          formData.schedule_days.includes(day) ? styles.dayBtnSelected : ""
                        }`}
                        onClick={() => toggleDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Giờ bắt đầu dạy<span>*</span></label>
                  <div className={styles.rowTwo}>
                    <select
                      className={styles.select}
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    >
                      {GENERATE_TIME_SLOTS().map((time, idx) => (
                        <option key={`${time}-${idx}`} value={time}>
                          Bắt đầu: {time}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className={styles.input}
                      value={`Kết thúc: ${endTime}`}
                      disabled
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading || !isPriceValid}
                >
                  {loading ? "Đang xử lý..." : editingRequestId ? "Cập Nhật Yêu Cầu" : "Gửi Yêu Cầu"}
                </button>
              </form>

              <div className={styles.summarySection}>
                <div className={styles.sectionTitle}>Tính toán chi phí</div>

                <div className={styles.summaryCard}>
                  <div className={styles.summaryRow}>
                    <span>Số buổi / tuần:</span>
                    <strong>{formData.schedule_days.length} buổi</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Tổng số tuần học:</span>
                    <strong>{formData.total_weeks} tuần</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Tổng số buổi:</span>
                    <strong>{totalSessions} buổi</strong>
                  </div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.summaryRow}>
                    <span>Đơn giá / buổi:</span>
                    <span>{Number(formData.price_per_session).toLocaleString("vi-VN")} VNĐ</span>
                  </div>

                  {formData.schedule_type !== "custom" ? (
                    <div className={styles.summaryRow}>
                      <span>Thanh toán 1 tháng (4 tuần):</span>
                      <strong>{monthlyEstimate.toLocaleString("vi-VN")} VNĐ</strong>
                    </div>
                  ) : (
                    <div className={styles.summaryTotal}>
                      <span>Thanh toán trọn khóa:</span>
                      <span>{totalCoursePrice.toLocaleString("vi-VN")} VNĐ</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.requestsList}>
        <div className={styles.sectionTitle}>Các Yêu Cầu Đã Đăng Của Bạn</div>

        {requestsList.length === 0 ? (
          <p style={{ color: "#64748b" }}>Bạn chưa đăng yêu cầu tạo lớp nào.</p>
        ) : (
          requestsList.map((req, idx) => {
            const reqKey = req.requests_id || req.id || `req-${idx}`;
            return (
              <div key={reqKey} className={styles.requestCard}>
                <div className={styles.requestHeader}>
                  <h3>{req.title}</h3>
                  <span
                    className={`${styles.badge} ${
                      req.status === "approved" ? styles.badgeApproved : styles.badgePending
                    }`}
                  >
                    {req.status === "approved" ? "Đã Chọn Gia Sư" : "Đang Tìm Gia Sư"}
                  </span>
                </div>

                <div className={styles.requestDetails}>
                  <div><strong>Môn học:</strong> {getCategoryName(req.category_id)}</div>
                  <div><strong>Cấp học:</strong> {req.level || req.grade_level}</div>
                  <div><strong>Yêu cầu:</strong> {req.tutor_level || "Sinh viên"}</div>
                  <div><strong>Đơn giá:</strong> {Number(req.price_per_session).toLocaleString()} VNĐ/buổi</div>
                  <div><strong>Lịch học:</strong> {req.schedule_days?.join(", ")} ({req.time_slot || `${req.start_time}-${req.end_time}`})</div>
                  <div><strong>Số tuần:</strong> {req.total_weeks} tuần</div>
                  <div><strong>Ngày bắt đầu:</strong> {req.start_date || "Chưa chọn"}</div>
                </div>

                <div className={styles.actionRow}>
                  <button className={styles.editBtn} onClick={() => handleEditRequest(req)}>
                    Chỉnh Sửa Lớp
                  </button>
                  <button className={styles.deleteBtn} onClick={() => handleDeleteRequest(req.requests_id || req.id)}>
                    Xóa Lớp
                  </button>
                  <button
                    className={styles.viewTutorBtn}
                    onClick={() => {
                      if (!checkAuthAndRole()) return;
                      setExpandedRequestId(expandedRequestId === reqKey ? null : reqKey);
                    }}
                  >
                    {expandedRequestId === reqKey ? "Ẩn Chi Tiết Gia Sư" : "Xem Danh Sách Gia Sư Ứng Tuyển"}
                  </button>
                </div>

                {expandedRequestId === reqKey && (
                  <div className={styles.tutorsSection}>
                    <h4 style={{ margin: "0 0 8px 0" }}>Gia Sư Đã Nhận Dạy:</h4>
                    {(!req.applied_tutors || req.applied_tutors.length === 0) ? (
                      <p style={{ fontSize: "13px", color: "#64748b" }}>Chưa có gia sư nào nhấn nhận dạy lớp này.</p>
                    ) : (
                      <div className={styles.tutorsGrid}>
                        {req.applied_tutors.map((tutor, tIdx) => {
                          const tutorKey = tutor.tutor_id ? `${tutor.tutor_id}-${tIdx}` : `tutor-${tIdx}`;
                          return (
                            <div key={tutorKey} className={styles.tutorCard}>
                              <div className={styles.tutorInfo}>
                                <img
                                  src={tutor.avatar || "/img/avt/avt.jpg"}
                                  alt={tutor.full_name}
                                  className={styles.avatar}
                                />
                                <div className={styles.tutorMeta}>
                                  <h4>{tutor.full_name}</h4>
                                  <p>
                                    {tutor.level} | {tutor.experience} | ⭐ {tutor.rating || 5}
                                  </p>
                                </div>
                              </div>

                              <div className={styles.tutorActions}>
                                <button
                                  className={styles.viewTutorBtn}
                                  onClick={() => {
                                    if (!checkAuthAndRole()) return;
                                    router.push(`/tutorList/${tutor.tutor_id}`);
                                  }}
                                >
                                  Xem Chi Tiết
                                </button>
                                {req.status !== "approved" && (
                                  <button
                                    className={styles.acceptTutorBtn}
                                    onClick={() => handleAcceptTutor(req, tutor)}
                                  >
                                    Chấp Nhận Dạy
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showPaymentModal && selectedNewCourse && paymentBooking && (
        <PaymentModal
          course={selectedNewCourse}
          bookingId={paymentBooking.booking_id}
          studentId={paymentStudentId}
          amount={(Number(selectedNewCourse.price_per_session) || 0) * (Number(selectedNewCourse.total_weeks) || 1)}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          paymentService={paymentService}
        />
      )}
    </div>
  );
}