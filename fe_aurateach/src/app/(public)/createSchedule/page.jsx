"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./CreateClassRequest.module.css";
import PaymentModal from "@/components/users/PaymentModal";
import paymentService from "@/services/paymentService";
import { categoryService } from "@/services/categoryService";
import { classRequestService } from "@/services/classRequestService";
import { courseService } from "@/services/courseService";
import { tutorService } from "@/services/tutorService";
import { authService } from "@/services/authService";
import { courseSubscriptionService } from "@/services/courseSubscriptionService";

// Helper lấy thông tin user hiện tại thông qua authService (hỗ trợ Promise)
const getUserInfoFromAuth = async () => {
  try {
    let userInfo = null;
    if (typeof authService.getCurrentUser === "function") {
      userInfo = await authService.getCurrentUser();
    } else if (typeof authService.getUserInfo === "function") {
      userInfo = await authService.getUserInfo();
    }
    return userInfo;
  } catch (err) {
    console.error("Lỗi lấy thông tin user từ authService:", err);
  }
  return null;
};

// Helper lấy ID học sinh đang đăng nhập (hỗ trợ async/await)
const getCurrentStudentId = async () => {
  const userInfo = await getUserInfoFromAuth();
  
  if (userInfo) {
    const id = userInfo.user_id || userInfo.id || userInfo._id || userInfo.account_id || userInfo.student_id;
    if (id) return id;
  }

  if (typeof authService.getUserId === "function") {
    const id = await authService.getUserId();
    if (id) return id;
  }

  try {
    const localUser = localStorage.getItem("user") || localStorage.getItem("userInfo");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      const localId = parsed.user_id || parsed.id || parsed._id;
      if (localId) return localId;
    }
  } catch (e) {}

  return null;
};

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

const roundToThousand = (amount) => Math.round(amount / 1000) * 1000;

const GENERATE_TIME_SLOTS = () => {
  const slots = [];
  for (let i = 6; i <= 21; i++) {
    const hour = i < 10 ? `0${i}` : `${i}`;
    slots.push(`${hour}:00`);
  }
  return slots;
};

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
  const [paymentSubscriptionId, setPaymentSubscriptionId] = useState(null);
  
  // State lưu tạm toàn bộ payload cần thiết để tạo course và duyệt sau khi thanh toán thành công
  const [pendingAcceptance, setPendingAcceptance] = useState(null);

  const getInitialFormData = (defaultCatId = "", ) => ({
    user_id: "", 
    tutor_id: null,
    title: "",
    category_id: defaultCatId,
    grade_level: "Cấp 3",
    tutor_level: "Sinh viên",
    max_student: 1,
    price_per_session: "", 
    description: "",       
    schedule_style: "1_term",
    total_weeks: 18,
    start_date: getMinStartDate(),
    schedule_days: [],
    start_time: "07:00",
    meet_link: "",         
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [loading, setLoading] = useState(false);
  const [conflictError, setConflictError] = useState("");

  // Đặt endTime SAU KHI formData đã được khởi tạo xong
  const endTime = useMemo(() => {
    if (!formData.start_time) return "09:00";
    const [h, m] = formData.start_time.split(":").map(Number);
    const endHour = (h + 2) % 24;
    const formattedHour = endHour < 10 ? `0${endHour}` : `${endHour}`;
    return `${formattedHour}:${m < 10 ? "0" + m : m}`;
  }, [formData.start_time]);

  // Hàm kiểm tra trùng lịch học
  const checkConflictSchedule = () => {
    if (!formData.start_time || formData.schedule_days.length === 0 || !formData.start_date) {
      setConflictError("");
      return false;
    }

    const newStartHour = parseInt(formData.start_time.split(":")[0], 10);
    const newEndHour = newStartHour + 2; // Mặc định mỗi buổi kéo dài 2 tiếng
    const newStartDateObj = new Date(formData.start_date);
    const totalWeeks = Number(formData.total_weeks || 1);
    const newEndDateObj = new Date(newStartDateObj);
    newEndDateObj.setDate(newEndDateObj.getDate() + totalWeeks * 7);

    for (const course of existingCourses) {
      if (!course.start_date || !course.end_date || !course.schedule_days || !course.time_slot) continue;

      const cStartDate = new Date(course.start_date);
      const cEndDate = new Date(course.end_date);

      // Kiểm tra xem khoảng thời gian có bị giao nhau không
      const isDateOverlap = newStartDateObj <= cEndDate && newEndDateObj >= cStartDate;

      if (isDateOverlap) {
        // Kiểm tra xem có trùng ngày trong tuần không
        let courseDays = course.schedule_days;
        if (typeof courseDays === "string") {
          try {
            courseDays = JSON.parse(courseDays);
          } catch (e) {
            courseDays = course.schedule_days.split(",").map(s => s.trim());
          }
        }

        const hasCommonDay = formData.schedule_days.some(day => courseDays.includes(day));

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

  useEffect(() => {
    const initData = async () => {
      const currentUserId = await getCurrentStudentId();
      setFormData((prev) => ({ ...prev, user_id: currentUserId || "" }));
      await fetchRequestsAndCourses();
    };
    initData();
  }, []);

  const checkAuthAndRole = async () => {
    const userInfo = await getUserInfoFromAuth();
    const isLoggedIn = authService.isAuthenticated ? authService.isAuthenticated() : !!userInfo;

    if (!isLoggedIn) {
      alert("Bạn cần đăng nhập để sử dụng tính năng này!");
      router.push("/login");
      return false;
    }

    const role = userInfo?.role || (typeof authService.getUserRole === "function" ? authService.getUserRole() : null);
    if (role && role !== "student") {
      alert("Tính năng này chỉ dành cho tài khoản Học sinh (Student)!");
      return false;
    }

    return true;
  };

  const handleOpenCreateModal = async () => {
    if (!(await checkAuthAndRole())) return;
    setEditingRequestId(null);
    const defaultCat = categories.length > 0 ? (categories[0].category_id || categories[0].id) : "";
    const currentUserId = await getCurrentStudentId(); // Lấy trực tiếp ID ở đây
    
    setFormData({
      ...getInitialFormData(defaultCat),
      user_id: currentUserId || "" // Gán user_id khi mở modal tạo mới
    });
    setIsModalOpen(true);
  };

  const fetchRequestsAndCourses = async () => {
    try {
      const currentStudentId = await getCurrentStudentId();
      if (!currentStudentId) {
        setRequestsList([]);
        setExistingCourses([]);
        return;
      }

      const [resCat, resReq, resCourse, resApp, resTutors] = await Promise.all([
        categoryService.getCategories().catch(() => null),
        classRequestService.getClassRequests().catch(() => null),
        courseService.getCourses().catch(() => null),
        classRequestService.getRequestApplications().catch((err) => {
          console.error("Lỗi lấy danh sách ứng tuyển:", err);
          return null; // Trả về null để không làm sập toàn bộ Promise.all
        }),
        tutorService.getTutors().catch(() => []),
      ]);

      if (resCat) {
        const catData = resCat.data !== undefined ? resCat.data : resCat;
        if (Array.isArray(catData)) setCategories(catData);
      }

      // Lưu trữ các khóa học hiện tại để check trùng lịch
      if (resCourse) {
        const courseData = resCourse.data !== undefined ? resCourse.data : resCourse;
        if (Array.isArray(courseData)) setExistingCourses(courseData);
      }

      let applications = [];
      const rawApp = resApp?.data !== undefined ? resApp.data : resApp;
      if (Array.isArray(rawApp)) {
        applications = rawApp;
      } else if (rawApp && Array.isArray(rawApp.data)) {
        applications = rawApp.data;
      }

      let reqData = [];
      const rawReq = resReq?.data !== undefined ? resReq.data : resReq;
      if (Array.isArray(rawReq)) {
        reqData = rawReq;
      } else if (rawReq && Array.isArray(rawReq.data)) {
        reqData = rawReq.data;
      }

      let tutorsList = [];
      const rawTutors = resTutors?.data !== undefined ? resTutors.data : resTutors;
      if (Array.isArray(rawTutors)) {
        tutorsList = rawTutors;
      } else if (rawTutors && Array.isArray(rawTutors.data)) {
        tutorsList = rawTutors.data;
      }

      const myRequestsMap = new Map();
      reqData.forEach((req) => {
        const reqId = req.request_id || req.requests_id || req.id || req.class_request_id;
        if (req && reqId) {
          if (!myRequestsMap.has(reqId)) {
            const matchedApps = applications.filter((app) => {
              const appReqId = app.requests_id || app.request_id || app.class_request_id;
              return String(appReqId) === String(reqId);
            });

            const appliedTutorsList = matchedApps.map((app) => {
              const tutorObj = tutorsList.log || tutorsList.find((t) => String(t.tutor_id || t.id) === String(app.tutor_id)) || {};
              const userObj = tutorObj.user || tutorObj.users || {};

              return {
                tutor_id: app.tutor_id,
                full_name: userObj.full_name || tutorObj.full_name || "Gia sư",
                avatar: userObj.avatar || tutorObj.avatar || "/img/avt/avt.jpg",
                level: tutorObj.level || "Gia sư",
                experience: tutorObj.experience || "Có kinh nghiệm",
                rating: tutorObj.rating || 5,
                app_id: app.application_id || app.id || app.app_id,
              };
            });

            myRequestsMap.set(reqId, {
              ...req,
              applied_tutors: appliedTutorsList,
            });
          }
        }
      });

      setRequestsList(Array.from(myRequestsMap.values()));
    } catch (err) {
      console.error("❌ Lỗi trong fetchRequestsAndCourses:", err);
    }
  };

  const availableCategories = useMemo(() => {
    const list = [...categories];
    if (formData.grade_level === "Cấp 1") {
      const exists = list.some((c) => (c.category_id || c.id) === "cap1_homework");
      if (!exists) {
        list.push({
          category_id: "cap1_homework",
          category_name: "Hỗ trợ bài tập về nhà các môn",
        });
      }
    }
    return list;
  }, [categories, formData.grade_level]);

  const handleGradeLevelChange = (e) => {
    const newGrade = e.target.value;
    setFormData((prev) => {
      let nextCatId = prev.category_id;
      if (newGrade === "Cấp 1") {
        nextCatId = "cap1_homework";
      } else if (prev.category_id === "cap1_homework") {
        nextCatId = categories.length > 0 ? (categories[0].category_id || categories[0].id) : "";
      }
      return {
        ...prev,
        grade_level: newGrade,
        category_id: nextCatId,
      };
    });
  };

  const priceLimitInfo = useMemo(() => {
    const tutorCfg = PRICE_LIMITS[formData.tutor_level] || PRICE_LIMITS["Giáo viên"];
    const base1On1 = tutorCfg.lessThan3[formData.grade_level];
    const numStudents = Number(formData.max_student) || 1;

    if (numStudents >= 3 && base1On1) {
      const minCalculated = roundToThousand(base1On1.min / numStudents);
      const maxCalculated = roundToThousand(base1On1.max / numStudents);
      return {
        min: minCalculated,
        max: maxCalculated,
        label: `${minCalculated.toLocaleString("vi-VN")}đ - ${maxCalculated.toLocaleString("vi-VN")}đ / buổi / HS`,
      };
    }
    return base1On1;
  }, [formData.tutor_level, formData.grade_level, formData.max_student]);

  const isPriceValid = useMemo(() => {
    if (formData.price_per_session === "" || !priceLimitInfo) return true;
    const price = Number(formData.price_per_session);
    return price >= priceLimitInfo.min && price <= priceLimitInfo.max;
  }, [formData.price_per_session, priceLimitInfo]);

  const { totalSessions, totalCoursePrice } = useMemo(() => {
    const daysPerWeek = formData.schedule_days.length;
    const totalSessions = daysPerWeek * formData.total_weeks;
    const price = Number(formData.price_per_session) || 0;
    const totalCoursePrice = totalSessions * price;
    return { totalSessions, totalCoursePrice };
  }, [formData.schedule_days, formData.total_weeks, formData.price_per_session]);

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

  const handleGenerateMeetLink = async () => {
    if (!(await checkAuthAndRole())) return;
    try {
      const generatedLink = `https://meet.google.com/abc-xyz-${Math.floor(Math.random() * 899 + 100)}`;
      setFormData((prev) => ({ ...prev, meet_link: generatedLink }));
    } catch (err) {
      console.error("Lỗi tự động sinh Meet Link:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!(await checkAuthAndRole())) return;

    // 🛠️ Lấy user_id hiện tại và kiểm tra xem có tồn tại không
    const currentUserId = await getCurrentStudentId();
    if (!currentUserId) {
      alert("⚠️ Không tìm thấy thông tin tài khoản đăng nhập. Vui lòng đăng nhập lại!");
      router.push("/login");
      return;
    }

    if (checkConflictSchedule()) {
      alert("⚠️ Lịch học bị trùng với khóa học hiện có. Vui lòng chọn thời gian khác!");
      return;
    }

    const priceEntered = Number(formData.price_per_session);

    if (priceLimitInfo && (priceEntered < priceLimitInfo.min || priceEntered > priceLimitInfo.max)) {
      alert(`⚠️ Mức học phí không hợp lệ!`);
      return;
    }

    setLoading(true);
    try {
      const parsedMaxStudents = parseInt(formData.max_student, 10);
      const validMaxStudents = isNaN(parsedMaxStudents) ? 1 : Math.min(5, Math.max(1, parsedMaxStudents));

      if (editingRequestId) {
        const updatePayload = { 
          ...formData,
          max_student: validMaxStudents,
          schedule_style: formData.schedule_style || '1_term',
        };
        delete updatePayload.user_id; 
        updatePayload.updated_at = new Date().toISOString();
        
        await classRequestService.updateClassRequestStatus(editingRequestId, updatePayload);
        alert("Cập nhật lớp thành công!");
      } else {
        const createPayload = {
          ...formData,
          max_student: validMaxStudents,
          user_id: currentUserId, // 🛠️ Đảm bảo truyền chính xác string/ID user không bị rỗng
          tutor_id: null,         // Ban đầu để null theo yêu cầu
          schedule_style: formData.schedule_style || '1_term',
          created_at: new Date().toISOString()
        };
        await classRequestService.createClassRequest(createPayload);
        alert("Tạo yêu cầu lớp học thành công!");
      }

      setIsModalOpen(false);
      setEditingRequestId(null);
      fetchRequestsAndCourses();
    } catch (error) {
      console.error("❌ Lỗi khi gửi form:", error);
      alert("Không thể kết nối đến hệ thống server!");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (pendingAcceptance) {
      try {
        const { reqId, appId, coursePayload, subscriptionId, tutorId } = pendingAcceptance;

        // 1. Tạo course sau khi thanh toán thành công
        const createdCourseRes = await courseService.createCourse(coursePayload);
        const createdCourse = createdCourseRes.data !== undefined ? createdCourseRes.data : createdCourseRes;
        const newCourseId = createdCourse?.course_id || createdCourse?.id;

        // 2. Cập nhật course_id vào bảng course_subscriptions
        if (subscriptionId && newCourseId) {
          await courseSubscriptionService.updateSubscriptionCourse(subscriptionId, { course_id: newCourseId });
        }

        // 3. Cập nhật trạng thái class request: chuyển sang approved và gán tutor_id[cite: 1]
        await classRequestService.updateClassRequestStatus(reqId, { 
          status: "approved",
          tutor_id: tutorId // Cập nhật tutor_id của gia sư được chấp nhận vào lại request_class[cite: 1]
        });

        // 4. Cập nhật trạng thái application của gia sư thành accepted
        if (appId) {
          await classRequestService.updateApplicationStatus(appId, { status: "accepted" });
        }

        setRequestsList((prev) => prev.filter((r) => (r.requests_id || r.id) !== reqId));
        alert("🎉 Thanh toán thành công! Lớp học đã được khởi tạo và gán gia sư thành công.");
      } catch (error) {
        console.error("⚠️ Lỗi khi khởi tạo lớp học sau thanh toán thành công:", error);
        alert("Thanh toán thành công nhưng có lỗi khi cập nhật thông tin lớp. Vui lòng liên hệ hỗ trợ!");
      }
    }

    // Reset các state thanh toán
    setShowPaymentModal(false);
    setSelectedNewCourse(null);
    setPaymentBooking(null);
    setPaymentStudentId(null);
    setPaymentSubscriptionId(null);
    setPendingAcceptance(null);
    fetchRequestsAndCourses();
  };

  const handleDeleteRequest = async (req) => {
    if (!(await checkAuthAndRole())) return;
    if (!confirm("Bạn có chắc chắn muốn xóa yêu cầu tạo lớp này không?")) return;
    
    const requestId = req.request_id || req.requests_id || req.id;
    if (!requestId) return;

    try {
      await classRequestService.deleteClassRequest(requestId);
      alert("Đã xóa yêu cầu tạo lớp học!");
      await fetchRequestsAndCourses();
    } catch (err) {
      console.error("❌ Lỗi khi xóa yêu cầu:", err);
    }
  };

  const handleEditRequest = async (req) => {
    if (!(await checkAuthAndRole())) return;
    const reqId = req.request_id || req.requests_id || req.id;
    const currentStudentId = await getCurrentStudentId();
    setEditingRequestId(reqId);
    
    let rawStartTime = req.start_time || (req.time_slot ? req.time_slot.split("-")[0] : "07:00");
    const formattedStartTime = rawStartTime ? rawStartTime.substring(0, 5) : "07:00";

    let parsedScheduleDays = [];
    if (Array.isArray(req.schedule_days)) {
      parsedScheduleDays = req.schedule_days;
    } else if (typeof req.schedule_days === "string") {
      try {
        parsedScheduleDays = JSON.parse(req.schedule_days);
      } catch (e) {
        parsedScheduleDays = [];
      }
    }

    setFormData({
      student_id: req.student_id || currentStudentId,
      title: req.title || "",
      category_id: req.category_id || "",
      grade_level: req.level || req.grade_level || "Cấp 3",
      tutor_level: req.tutor_level || "Sinh viên",
      max_student: req.max_student ?? 1,
      price_per_session: req.price_per_session || "",
      description: req.description || "",
      schedule_style: req.schedule_style || "1_term",
      total_weeks: req.total_weeks ?? 18,
      start_date: req.start_date ? req.start_date.split("T")[0] : getMinStartDate(),
      schedule_days: parsedScheduleDays,
      start_time: formattedStartTime,
      meet_link: req.meet_link || "",
    });
    setIsModalOpen(true);
  };

  const handleAcceptTutor = async (req, tutor) => {
    if (!(await checkAuthAndRole())) return;
    if (!confirm(`Xác nhận chọn gia sư ${tutor.full_name} dạy lớp này?`)) return;

    const currentStudentId = req.student_id || (await getUserInfoFromAuth());
    const reqId = req.request_id || req.requests_id || req.id || req.class_request_id;

    const startDateObj = new Date(req.start_date || Date.now());
    const totalWeeks = Number(req.total_weeks || 1);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + totalWeeks * 7);
    const calculatedEndDate = endDateObj.toISOString().split('T')[0];

    let scheduleDaysArray = req.schedule_days;
    if (typeof scheduleDaysArray === 'string') {
      scheduleDaysArray = scheduleDaysArray.split(',').map(s => s.trim());
    } else if (!Array.isArray(scheduleDaysArray)) {
      scheduleDaysArray = ["Thứ 2", "Thứ 4", "Thứ 6"];
    }

    let rawStart = req.start_time || "18:00:00";
    if (rawStart.includes("T")) {
      rawStart = rawStart.split("T")[1].replace("Z", "");
    }
    const formattedStartTime = rawStart.length === 5 ? `${rawStart}:00` : rawStart;

    let calculatedEndTime = "20:00:00";
    if (rawStart) {
      const hour = parseInt(rawStart.split(":")[0], 10) + 2;
      calculatedEndTime = `${hour < 10 ? "0" + hour : hour}:00:00`;
    }

    const coursePayload = {
      tutor_id: tutor.tutor_id,
      title: req.title || "Lớp học gia sư",
      category_id: req.category_id || 1, 
      level: req.level || req.grade_level || "Cơ bản",
      description: req.description || "Không có mô tả",
      max_students: Number(req.max_student || 1),
      price_per_session: Number(req.price_per_session || 0),
      start_date: req.start_date ? req.start_date.split("T")[0] : new Date().toISOString().split('T')[0],
      end_date: calculatedEndDate,
      total_weeks: totalWeeks,
      schedule_days: scheduleDaysArray,
      time_slot: `${formattedStartTime.substring(0, 5)}-${calculatedEndTime.substring(0, 5)}`,
      start_time: formattedStartTime,
      end_time: calculatedEndTime,
      thumbnail: "/img/class/default-class-1.jpg",
      status: "closed",
      permanent_room_url: req.meet_link || "https://meet.google.com/abc-xyz-123",
    };

    try {
      const subscriptionPayload = {
        courseId: null, 
        studentId: currentStudentId,
        status: 'pending', 
        total_amount: (Number(req.price_per_session) || 0) * totalWeeks,
        paymentMethod: 'qr'
      };

      const subscriptionRes = await courseSubscriptionService.createBooking(subscriptionPayload);
      const subscriptionData = subscriptionRes.data !== undefined ? subscriptionRes.data : subscriptionRes;

      const subscriptionId = 
        subscriptionData?.subscription_id || 
        subscriptionData?.id || 
        subscriptionData?.booking_id ||
        subscriptionData?.data?.subscription_id || 
        subscriptionData?.data?.id;

      if (!subscriptionId) {
        alert("Lỗi: Không lấy được mã đăng ký khóa học từ hệ thống!");
        return;
      }

      setPaymentSubscriptionId(subscriptionId);

      // 🛠️ FIX LỖI: Lấy trực tiếp app_id từ object tutor được truyền vào
      const currentAppId = tutor.app_id || tutor.application_id || tutor.id;

      setPendingAcceptance({
        reqId,
        appId: currentAppId, // Gán chính xác giá trị app_id
        coursePayload,
        subscriptionId: subscriptionId // Sửa lại biến response thành subscriptionId đã lấy ở trên
      });

      const paymentRes = await paymentService.createQR(
        subscriptionId, 
        currentStudentId, 
        subscriptionPayload.total_amount
      );
      
      const paymentData = paymentRes.data !== undefined ? paymentRes.data : paymentRes;

      setSelectedNewCourse({ 
        ...coursePayload, 
        price_per_session: req.price_per_session, 
        total_weeks: req.total_weeks 
      });
      setPaymentBooking(paymentData);
      setPaymentStudentId(currentStudentId);
      setShowPaymentModal(true);

    } catch (err) {
      console.error("❌ Lỗi khi khởi tạo thanh toán chọn gia sư:", err);
      alert("Không thể khởi tạo thanh toán. Vui lòng thử lại!");
    }
  };

  const handlePaymentClose = async () => {
    setShowPaymentModal(false);
    if (paymentBooking && paymentBooking.payment_id) {
      try {
        await paymentService.cancelPayment(paymentBooking.payment_id);
      } catch (err) {}
    }
    setSelectedNewCourse(null);
    setPaymentBooking(null);
    setPaymentStudentId(null);
    setPaymentSubscriptionId(null);
    setPendingAcceptance(null);
    fetchRequestsAndCourses();
  };

  const getCategoryName = (catId) => {
    if (!catId) return "Chưa phân loại";
    if (catId === "cap1_homework") return "Hỗ trợ bài tập về nhà các môn";
    
    const found = categories.find((c) => {
      const cId = c.category_id || c.id || c.cat_id;
      return String(cId) === String(catId);
    });

    if (found) {
      return found.category_name || found.name || found.title || catId;
    }
    return catId;
  };

  const renderPriceTable = () => {
    const activeLevelConfig = PRICE_LIMITS[formData.tutor_level] || PRICE_LIMITS["Giáo viên"];
    const levels = ["Cấp 1", "Cấp 2", "Cấp 3"];
    const numStudents = Number(formData.max_student) || 1;

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
                <th style={{ padding: "8px" }}>Lớp 1 - 2 học sinh (1-1)</th>
                <th style={{ padding: "8px" }}>Lớp 3 - 5 học sinh</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((lvl) => {
                const isSelected = formData.grade_level === lvl;
                const base = activeLevelConfig.lessThan3[lvl];
                const divisor = numStudents >= 3 ? numStudents : 3;
                const minDiv = roundToThousand(base.min / divisor);
                const maxDiv = roundToThousand(base.max / divisor);

                return (
                  <tr
                    key={lvl}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      backgroundColor: isSelected ? "#eff6ff" : "transparent",
                    }}
                  >
                    <td style={{ padding: "8px" }}>{lvl}</td>
                    <td style={{ padding: "8px" }}>{base.min.toLocaleString("vi-VN")}đ - {base.max.toLocaleString("vi-VN")}đ</td>
                    <td style={{ padding: "8px" }}>{minDiv.toLocaleString("vi-VN")}đ - {maxDiv.toLocaleString("vi-VN")}đ</td>
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
        <button className={styles.openModalBtn} onClick={handleOpenCreateModal}>
          + Đăng Yêu Cầu Tạo Lớp Theo Nhu Cầu
        </button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeModalBtn} onClick={() => setIsModalOpen(false)}>✕</button>
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
                      <option value="">-- Chọn môn học --</option>
                      {availableCategories.map((cat, idx) => {
                        const catId = cat.category_id || cat.id || cat.cat_id;
                        const catName = cat.category_name || cat.name || cat.title;
                        return (
                          <option key={catId || `cat-${idx}`} value={catId}>
                            {catName}
                          </option>
                        );
                      })}
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
                    <label>Số lượng học sinh (1 - 5 HS) <span>*</span></label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      className={styles.input}
                      value={formData.max_student}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          max_student: val === "" ? "" : Math.min(5, Math.max(1, parseInt(val, 10) || 1)),
                        });
                      }}
                      required
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
                    value={formData.description ?? ""}
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

                <div className={styles.sectionTitle} style={{ marginTop: "20px" }}>Lịch học dự kiến</div>

                <div className={styles.rowTwo}>
                  <div className={styles.formGroup}>
                    <label>Ngày khai giảng <span>*</span></label>
                    <input
                      type="date"
                      className={styles.input}
                      min={getMinStartDate()}
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Số tuần dự kiến</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={formData.total_weeks}
                      disabled={formData.schedule_style !== "custom"}
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
                        className={`${styles.dayBtn} ${formData.schedule_days.includes(day) ? styles.dayBtnSelected : ""}`}
                        onClick={() => toggleDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Giờ bắt đầu dạy (Tự động +2 tiếng) <span>*</span></label>
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

                <button type="submit" className={styles.submitBtn} disabled={loading || !isPriceValid || !!conflictError}>
                  {loading ? "Đang xử lý..." : editingRequestId ? "Cập Nhật Yêu Cầu" : "Gửi Yêu Cầu"}
                </button>
              </form>

              <div className={styles.summarySection}>
                <div className={styles.sectionTitle}>Tính toán chi phí</div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryRow}>
                    <span>Tổng số buổi:</span>
                    <strong>{totalSessions} buổi</strong>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span>Thanh toán trọn khóa:</span>
                    <span>{totalCoursePrice.toLocaleString("vi-VN")} VNĐ</span>
                  </div>
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
            const reqKey = req.request_id || req.requests_id || req.id || `req-${idx}`;
            return (
              <div key={reqKey} className={styles.requestCard}>
                <div className={styles.requestHeader}>
                  <h3>{req.title}</h3>
                  <span className={`${styles.badge} ${req.status === "approved" ? styles.badgeApproved : styles.badgePending}`}>
                    {req.status === "approved" ? "Đã Chọn Gia Sư" : "Đang Tìm Gia Sư"}
                  </span>
                </div>

                <div className={styles.requestDetails}>
                  <div><strong>Môn học:</strong> {getCategoryName(req.category_id)}</div>
                  <div><strong>Cấp học:</strong> {req.level || req.grade_level}</div>
                  <div><strong>Yêu cầu:</strong> {req.tutor_level || "Sinh viên"}</div>
                  <div><strong>Đơn giá:</strong> {Number(req.price_per_session || 0).toLocaleString()} VNĐ/buổi</div>
                  <div>
                    <strong>Lịch học:</strong> {
                      Array.isArray(req.schedule_days) 
                      ? req.schedule_days.join(", ") 
                      : (typeof req.schedule_days === "string" 
                      ? (() => {
                        try {
                          const parsed = JSON.parse(req.schedule_days);
                          return Array.isArray(parsed) ? parsed.join(", ") : req.schedule_days;
                        } catch (e) {
                          return req.schedule_days;
                        }
                      })() 
                      : "Chưa cập nhật")
                    }
                  </div>
                  <div><strong>Số tuần:</strong> {req.total_weeks} tuần</div>
                  <div><strong>Số lượng học sinh:</strong> {req.max_student || 1} học sinh</div>
                </div>

                <div className={styles.actionRow}>
                  <button className={styles.editBtn} onClick={() => handleEditRequest(req)}>Chỉnh Sửa</button>
                  <button className={styles.deleteBtn} onClick={() => handleDeleteRequest(req)}>Xóa</button>
                  <button
                    className={styles.viewTutorBtn}
                    onClick={async () => {
                      if (!(await checkAuthAndRole())) return;
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
                      <p style={{ fontSize: "13px", color: "#64748b" }}>Chưa có gia sư nào nhận lớp này.</p>
                    ) : (
                      <div className={styles.tutorsGrid}>
                        {req.applied_tutors.map((tutor, tIdx) => (
                          <div key={tutor.tutor_id || tIdx} className={styles.tutorCard}>
                            <div className={styles.tutorInfo}>
                              <img src={tutor.avatar || "/img/avt/avt.jpg"} alt="" className={styles.avatar} />
                              <div className={styles.tutorMeta}>
                                <h4>{tutor.full_name}</h4>
                                {tutor.level} | {tutor.experience} | ⭐ {tutor.rating || 5}
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
                        ))}
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
          subscriptionId={paymentSubscriptionId}
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