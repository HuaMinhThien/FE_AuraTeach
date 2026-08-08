"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./create-class.module.css"; 
import { getClassroomBasePath } from "@/utils/roomUtils";

const DEFAULT_IMAGES = [
  "/img/class/default-class-1.jpg",
  "/img/class/default-class-2.png",
  "/img/class/default-class-3.png",
  "/img/class/default-class-4.png",
  "/img/class/default-class-5.png",
  "/img/class/default-class-6.png",
  "/img/class/default-class-7.png",
  "/img/class/default-class-8.png",
  "/img/class/default-class-9.png",
  "/img/class/default-class-10.png",
];

// Bảng giá tham khảo (Giá lớp kèm 1-1 cơ sở)
const PRICE_LIMITS = {
  "Giáo viên": {
    lessThan3: { // Lớp < 3 học sinh (1 đến 2 học sinh) - Giá 1 kèm 1
      "Cấp 1": { min: 200000, max: 250000, label: "200.000đ - 250.000đ / buổi" },
      "Cấp 2": { min: 230000, max: 300000, label: "230.000đ - 300.000đ / buổi" },
      "Cấp 3": { min: 250000, max: 350000, label: "250.000đ - 350.000đ / buổi" },
    },
  },
  "Sinh viên": {
    lessThan3: { // Lớp < 3 học sinh (1 đến 2 học sinh) - Giá 1 kèm 1
      "Cấp 1": { min: 120000, max: 150000, label: "120.000đ - 150.000đ / buổi " },
      "Cấp 2": { min: 130000, max: 170000, label: "130.000đ - 170.000đ / buổi" },
      "Cấp 3": { min: 150000, max: 200000, label: "150.000đ - 200.000đ / buổi" },
    },
  },
};

// Danh sách các mốc giờ bắt đầu từ 07:00 đến 23:00 (Định dạng 24h)
const START_TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const hour = 7 + i;
  return `${hour < 10 ? "0" : ""}${hour}:00`;
});

// Bản đồ ánh xạ tên thứ sang chỉ số getDay() của JS
const DAY_MAP = {
  "Chủ Nhật": 0,
  "Thứ 2": 1,
  "Thứ 3": 2,
  "Thứ 4": 3,
  "Thứ 5": 4,
  "Thứ 6": 5,
  "Thứ 7": 6,
};

// Hàm bổ trợ làm tròn số tiền đến hàng nghìn gần nhất (ví dụ: 66.667 -> 67.000)
const roundToThousand = (amount) => Math.round(amount / 1000) * 1000;

export default function CreateClassPage() {
  const router = useRouter();

  // --- State Kiểm soát Quyền Tạo Lớp & Thông tin Gia sư ---
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [allowedCategories, setAllowedCategories] = useState([]);
  const [tutorLevel, setTutorLevel] = useState("Giáo viên"); // Default: Giáo viên / Sinh viên
  const [teachingLevels, setTeachingLevels] = useState([]); // Lưu danh sách cấp học gia sư được dạy

  // --- Các State quản lý dữ liệu Form ---
  const [className, setClassName] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Cấp 1");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState(3); // Giới hạn từ 1 đến 5 học sinh
  const [pricePerSession, setPricePerSession] = useState(50000);

  // State quản lý link Google Meet & đường dẫn phòng học AuraTeach
  const [meetLink, setMeetLink] = useState("");
  const [meetError, setMeetError] = useState("");
  const [roomPreviewPath, setRoomPreviewPath] = useState(getClassroomBasePath() || "");

  // State danh mục động nạp từ API
  const [categoriesList, setCategoriesList] = useState([]);

  // State về Lộ trình hoàn thành & Thời gian
  const [courseType, setCourseType] = useState("1_term"); // "1_term", "2_terms", "custom"
  const [startDate, setStartDate] = useState("");
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [selectedDays, setSelectedDays] = useState([]);
  
  // State giờ bắt đầu & tự động cộng 2 tiếng cho giờ kết thúc
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("09:00");

  // State quản lý ảnh đại diện lớp học
  const [selectedImage, setSelectedImage] = useState(DEFAULT_IMAGES[0]);
  const [customImage, setCustomImage] = useState(null);

  // State trạng thái hệ thống
  const [conflictMessage, setConflictMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateErrorMessage, setDateErrorMessage] = useState("");
  const [tutorId, setTutorId] = useState("");

  // Xử lý tự động tính giờ kết thúc khi đổi giờ bắt đầu (+2 tiếng cố định)
  const handleStartTimeChange = (newStartTime) => {
    setStartTime(newStartTime);
    if (!newStartTime) return;
    const [h, m] = newStartTime.split(":").map(Number);
    const endHour = h + 2;
    const formattedEndH = endHour < 10 ? `0${endHour}` : `${endHour}`;
    const formattedEndM = m < 10 ? `0${m}` : `${m}`;
    setEndTime(`${formattedEndH}:${formattedEndM}`);
  };

  // Xử lý khi đổi Option chọn kỳ/tuần
  const handleCourseTypeChange = (type) => {
    setCourseType(type);
    if (type === "1_term") {
      setTotalWeeks(18);
    } else if (type === "2_terms") {
      setTotalWeeks(36);
    } else {
      setTotalWeeks(4);
    }
  };

  // Xử lý thay đổi số tuần khi ở chế độ dạy riêng lẻ (Custom)
  const handleWeeksChange = (value) => {
    if (courseType === "custom") {
      if (value === "") {
        setTotalWeeks("");
        return;
      }
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        setTotalWeeks(1);
      } else {
        // Giới hạn số tuần trong khoảng từ 1 đến 4
        const clamped = Math.min(4, Math.max(1, parsed));
        setTotalWeeks(clamped);
      }
    } else {
      setTotalWeeks(value);
    }
  };

  // Tự động kiểm tra cấu hình min/max giá dựa trên Level Gia sư, Cấp học và Số lượng HS
  const parsedMaxStudents = parseInt(maxStudents, 10);
  const numStudents = Math.min(Math.max(isNaN(parsedMaxStudents) ? 1 : parsedMaxStudents, 1), 5);
  const currentTutorConfig = PRICE_LIMITS[tutorLevel] || PRICE_LIMITS["Giáo viên"];

  // LOGIC SỬA ĐỔI: Nếu số học sinh >= 3, lấy giá 1 kèm 1 chia cho số lượng học sinh & LÀM TRÒN ĐẾN HÀNG NGHÌN
  let currentPriceConfig = null;
  if (numStudents >= 3) {
    const base1On1Config = currentTutorConfig.lessThan3[level];
    if (base1On1Config) {
      const calculatedMin = roundToThousand(base1On1Config.min / numStudents);
      const calculatedMax = roundToThousand(base1On1Config.max / numStudents);
      currentPriceConfig = {
        min: calculatedMin,
        max: calculatedMax,
        label: `${calculatedMin.toLocaleString("vi-VN")}đ - ${calculatedMax.toLocaleString("vi-VN")}đ / buổi`,
      };
    }
  } else {
    currentPriceConfig = currentTutorConfig.lessThan3[level];
  }

  // Tính toán giá trị lỗi kiểm tra giá
  const currentRate = parseInt(pricePerSession || 0, 10);
  const priceError = (currentPriceConfig && (currentRate < currentPriceConfig.min || currentRate > currentPriceConfig.max))
    ? `⚠️ Mức phí cho ${level} (${tutorLevel} - ${numStudents >= 3 ? `Lớp ${numStudents} HS: Giá 1 kèm 1 / ${numStudents}` : "Lớp < 3 HS"}) phải nằm trong khoảng: ${currentPriceConfig.label}`
    : "";

  // 1. Tự động gọi API lấy toàn bộ danh mục môn học
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://localhost:3007/categories");
        if (res.ok) {
          const data = await res.json();
          setCategoriesList(data);
        }
      } catch (error) {
        console.error("Lỗi lấy danh mục môn học từ JSON Server:", error);
      }
    };
    fetchCategories();
  }, []);

  // 2. HÀM NGĂN CHẶN BẢO VỆ TRANG & LỌC CHUYÊN MÔN GIA SƯ & KIỂM TRA LEVEL GIA SƯ
  useEffect(() => {
    let isMounted = true;

    const checkTutorPermission = async () => {
      try {
        const cookies = document.cookie.split("; ");
        const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));

        if (!userInfoCookie) {
          alert("⚠️ Vui lòng đăng nhập để thực hiện chức năng này!");
          router.push("/login");
          return;
        }

        const cookieValue = decodeURIComponent(userInfoCookie.split("=")[1]);
        const userInfo = JSON.parse(cookieValue);

        if (userInfo.role !== "tutor") {
          alert("⚠️ Chỉ tài khoản Giảng viên / Gia sư mới có quyền tạo lớp học!");
          router.push("/classroom-management");
          return;
        }

        // Gọi API lấy hồ sơ gia sư
        const res = await fetch(`http://localhost:3007/tutors?user_id=${userInfo.user_id}`);
        if (res.ok) {
          const data = await res.json();
          const tutor = data[0];

          if (!tutor || (tutor.verification_status !== "approved" && tutor.verification_status !== "Đã xác minh")) {
            if (isMounted) {
              alert("⚠️ Hồ sơ gia sư của bạn chưa được xét duyệt. Bạn chưa thể tạo lớp học mới!");
              router.push("/classroom-management");
            }
            return;
          }

          if (isMounted) {
            setTutorId(tutor.tutor_id);
            // Kiểm tra Level Gia sư ("Giáo viên" hay "Sinh viên")
            if (tutor.level && (tutor.level === "Sinh viên" || tutor.level === "Giáo viên")) {
              setTutorLevel(tutor.level);
            } else {
              setTutorLevel("Giáo viên");
            }

            // Lưu danh sách Cấp học gia sư được phép dạy
            const tLevels = Array.isArray(tutor.teaching_levels) ? tutor.teaching_levels : [];
            setTeachingLevels(tLevels);

            // Mặc định chọn cấp học hợp lệ đầu tiên nếu có
            if (tLevels.length > 0 && !tLevels.includes(level)) {
              setLevel(tLevels[0]);
            }

            const registeredExpertise = tutor.expertise
              ? tutor.expertise.split(",").map((exp) => exp.trim().toLowerCase())
              : [];

            setAllowedCategories(registeredExpertise);
            setIsAllowed(true);
          }
        }
      } catch (error) {
        console.error("Lỗi kiểm tra quyền hạn gia sư:", error);
        router.push("/classroom-management");
      } finally {
        if (isMounted) {
          setIsPermissionChecked(true);
        }
      }
    };

    checkTutorPermission();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // LOGIC NGÀY BẮT ĐẦU: TỐI THIỂU CÁCH NGÀY HIỆN TẠI 5 NGÀY
  const getMinStartDateString = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 5);
    return minDate.toISOString().split("T")[0];
  };

  const validateStartDate = (dateString) => {
    if (!dateString) return true;
    
    const selectedDate = new Date(dateString);
    const minAllowedDate = new Date();
    minAllowedDate.setDate(minAllowedDate.getDate() + 5);
    
    minAllowedDate.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < minAllowedDate) {
      const minDateStr = minAllowedDate.toLocaleDateString("vi-VN");
      setDateErrorMessage(`⚠️ Ngày bắt đầu phải cách hôm nay tối thiểu 5 ngày (từ ngày ${minDateStr} trở đi).`);
      return false;
    }
    
    setDateErrorMessage("");
    return true;
  };

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    setStartDate(value);
    validateStartDate(value);
  };

  // LOGIC TÍNH NGÀY KẾT THÚC
  let endDate = "";
  if (startDate && totalWeeks) {
    const start = new Date(startDate);
    const weeks = parseInt(totalWeeks, 10);
    
    const targetDayIndexes = selectedDays
      .map((day) => DAY_MAP[day])
      .filter((index) => index !== undefined);

    if (targetDayIndexes.length > 0) {
      let lastClassDate = null;
      const totalDaysToScan = weeks * 7;

      for (let i = 0; i < totalDaysToScan; i++) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);

        if (targetDayIndexes.includes(current.getDay())) {
          lastClassDate = current;
        }
      }

      if (lastClassDate) {
        const year = lastClassDate.getFullYear();
        const month = String(lastClassDate.getMonth() + 1).padStart(2, "0");
        const day = String(lastClassDate.getDate()).padStart(2, "0");
        endDate = `${year}-${month}-${day}`;
      }
    } else {
      const daysToAdd = weeks * 7 - 1;
      const end = new Date(start);
      end.setDate(start.getDate() + daysToAdd);
      
      const year = end.getFullYear();
      const month = String(end.getMonth() + 1).padStart(2, "0");
      const day = String(end.getDate()).padStart(2, "0");
      endDate = `${year}-${month}-${day}`;
    }
  }

  useEffect(() => {
    const checkScheduleConflict = async () => {
      if (!startDate || !endDate || selectedDays.length === 0 || !startTime || !endTime) {
        setConflictMessage("");
        return;
      }

      if (!validateStartDate(startDate)) {
        return;
      }

      try {
        const timeSlot = `${startTime}-${endTime}`;
        const queryParams = new URLSearchParams({
          start: startDate,
          end: endDate,
          days: selectedDays.join(","),
          slot: timeSlot,
          id_tutor: tutorId,
        });

        const res = await fetch(`/api/classes/check-conflict?${queryParams}`);
        const result = await res.json();

        if (!result.success && result.isConflict) {
          setConflictMessage(`⚠️ ${result.message}`);
        } else {
          setConflictMessage("");
        }
      } catch (err) {
        console.error("Lỗi kiểm tra trùng lịch:", err);
      }
    };

    checkScheduleConflict();
  }, [startDate, endDate, selectedDays, startTime, endTime, tutorId]);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCustomImage(imageUrl);
      setSelectedImage(imageUrl);
    }
  };

  // Click vào nút chọn Cấp học
  const handleLevelSelect = (selectedLvl) => {
    if (!teachingLevels.includes(selectedLvl)) {
      alert("Hồ sơ của bạn chưa đạt yêu cầu giảng dạy vui lòng liên hệ với admin để biết thêm chi tiết");
      return;
    }
    setLevel(selectedLvl);
  };

  const hoursPerSession = 2; // Cố định 2 tiếng cho 1 buổi dạy

  // CÔNG THỨC TÍNH TIỀN HỌC THEO BUỔI & THEO THÁNG & TRỪ PHÍ VÍ SÀN 35%
  const daysPerWeekCount = selectedDays.length;
  const totalWeeksCount = parseInt(totalWeeks || 0, 10);
  const totalCourseSessions = daysPerWeekCount * totalWeeksCount; 

  // Tính số buổi trong 1 tháng (quy ước chuẩn 4 tuần/tháng)
  const monthlySessionsCount = daysPerWeekCount * 4;

  // Tổng tiền học sinh (mỗi HS) phải đóng trong 1 tháng (dành cho khóa học dài kỳ)
  const monthlyFeePerStudent = currentRate * monthlySessionsCount;

  // Tổng tiền 1 học sinh đóng trọn gói toàn bộ khóa học
  const totalFeePerStudent = currentRate * totalCourseSessions;

  // Tổng tiền tất cả học sinh đóng trong 1 tháng (chưa trừ phí)
  const monthlyGrossRevenue = monthlyFeePerStudent * numStudents;

  // Tổng tiền của nguyên khóa học cho toàn bộ học sinh (chưa trừ phí)
  const totalCourseGrossRevenue = currentRate * totalCourseSessions * numStudents;
  
  // Giá trị 35% Phí sàn trừ ra
  const platformFeeAmount = totalCourseGrossRevenue * 0.35;

  // Tổng tiền nhận được của nguyên khóa học đã trừ 35% (nhận 65%)
  const totalCourseNetEstimateBenefit = totalCourseGrossRevenue * 0.65;

  // Tiền 1 tháng gia sư nhận được = tổng tiền tháng chưa trừ phí x 65% (hoặc tổng tiền nguyên khóa đã trừ phí / số tháng)
  const totalMonthsCount = totalWeeksCount > 0 ? totalWeeksCount / 4 : 1;
  const monthlyNetEarnings = totalCourseNetEstimateBenefit / totalMonthsCount;

  // Tiền thực nhận tối thiểu từ 1 HS trong 1 tháng (sau khi trừ 35% phí sàn)
  const minMonthlyNetPerStudent = (monthlyFeePerStudent * 0.65);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAllowed) {
      alert("⚠️ Bạn không có quyền thực hiện chức năng này!");
      return;
    }

    if (!description.trim()) {
      alert("⚠️ Vui lòng nhập mô tả nội dung & phương pháp giảng dạy!");
      return;
    }

    if (level !== "Cấp 1" && !category) {
      alert("⚠️ Vui lòng chọn môn học được phép dạy!");
      return;
    }
    
    if (priceError) {
      alert("⚠️ Học phí nhập vào không nằm trong khoảng giá quy định. Vui lòng kiểm tra lại!");
      return;
    }

    if (courseType === "custom" && (parseInt(totalWeeks, 10) < 1 || parseInt(totalWeeks, 10) > 4)) {
      alert("⚠️ Lựa chọn lộ trình dạy riêng lẻ chỉ cho phép số tuần từ 1 đến 4 tuần!");
      return;
    }

    if (!validateStartDate(startDate)) {
      alert("⚠️ Vui lòng chọn ngày bắt đầu hợp lệ (cách hôm nay tối thiểu 5 ngày)!");
      return;
    }

    if (conflictMessage) {
      alert("Vui lòng xử lý trùng lịch trước khi tạo lớp học!");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      tutor_id: tutorId,
      class_name: className,
      category_id: level === "Cấp 1" ? "cap1_homework" : category,
      level,
      description,
      max_students: numStudents,
      price_per_session: currentRate,
      start_date: startDate,
      end_date: endDate,
      total_weeks: parseInt(totalWeeks, 10),
      schedule_days: selectedDays,
      time_slot: `${startTime}-${endTime}`,
      thumbnail: selectedImage,
    };

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        alert("🎉 Tạo lớp học thành công! Hệ thống đã hiển thị công khai để học sinh tuyển sinh.");
        router.push("/classroom-management");
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch (error) {
      console.error("Lỗi gửi dữ liệu lên server:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPermissionChecked) {
    return (
      <div style={{ textAlign: "center", padding: "120px 20px", fontSize: "16px", color: "#666" }}>
        Đang kiểm tra quyền hạn tài khoản gia sư...
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  const filteredCategories = categoriesList.filter((cat) =>
    allowedCategories.some((allowed) => allowed === cat.category_name.toLowerCase())
  );

  return (
    <div className={styles.container} style={{ marginTop: "80px" }}>
      <div className={styles.headerCreate}>
        <h1>Tạo lớp học mới</h1>
        <p>Bắt đầu hành trình chia sẻ kiến thức của bạn bằng cách thiết lập thông tin lớp học.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.formLayout}>
        <div className={styles.leftColumn}>
          <section className={styles.card}>
            <h2>Thông tin chung</h2>
            
            <div className={styles.formGroup}>
              <label>Tên lớp học <span className={styles.required}>*</span></label>
              <input 
                type="text" 
                placeholder="Ví dụ: Ôn tập Toán lớp 9 thi vào 10" 
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Đường liên kết phòng học AuraTeach</label>
              <input 
                type="text"
                value={roomPreviewPath}
                readOnly
              />
              {meetError && <p className={styles.errorAlert} style={{ marginTop: "8px", fontSize: "14px" }}>{meetError}</p>}
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="category">Môn học sẽ dạy <span className={styles.required}>*</span></label>
                {level === "Cấp 1" ? (
                  <select id="category" value="cap1_homework" disabled className={styles.disabledSelect}>
                    <option value="cap1_homework">Hỗ trợ bài tập về nhà các môn học</option>
                  </select>
                ) : (
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn môn học dạy --</option>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        Chưa có chuyên môn hợp lệ được phê duyệt
                      </option>
                    )}
                  </select>
                )}
                {level !== "Cấp 1" && filteredCategories.length === 0 && (
                  <p className={styles.errorAlert} style={{ marginTop: "6px", fontSize: "13px" }}>
                    ⚠️ Bạn chưa đăng ký hoặc chưa được duyệt chuyên môn dạy môn nào trong danh mục hệ thống.
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Cấp học</label>
                <div className={styles.segmentedControl}>
                  {["Cấp 1", "Cấp 2", "Cấp 3"].map((lvl) => {
                    const isAllowedLevel = teachingLevels.includes(lvl);
                    return (
                      <button
                        type="button"
                        key={lvl}
                        className={`${level === lvl ? styles.activeSegment : ""} ${!isAllowedLevel ? styles.disabledSegment : ""}`}
                        onClick={() => handleLevelSelect(lvl)}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label>Số lượng học sinh trong 1 lớp (Tối thiểu 1 - Tối đa 5 HS) <span className={styles.required}>*</span></label>
                <input 
                  type="number" 
                  min="1" 
                  max="5"
                  value={maxStudents}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setMaxStudents("");
                      return;
                    }
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) {
                      setMaxStudents(Math.min(num, 5));
                    }
                  }}
                  onBlur={() => {
                    if (maxStudents === "" || parseInt(maxStudents, 10) < 1) {
                      setMaxStudents(1);
                    }
                  }}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Học phí mong muốn (đ / buổi ) <span className={styles.required}>*</span></label>
                <input 
                  type="number" 
                  step="10000"
                  value={pricePerSession}
                  onChange={(e) => setPricePerSession(e.target.value)}
                  required
                  style={{marginTop: "16px"}}
                />
                {priceError && (
                  <p className={styles.errorAlert} style={{ marginTop: "16px", fontSize: "13px", padding: "8px 12px" }}>
                    {priceError}
                  </p>
                )}
              </div>
            </div>

            {/* BẢNG KHUNG GIÁ QUY ĐỊNH HIỂN THỊ DƯỚI Ô SỐ LƯỢNG HỌC SINH VÀ HỌC PHÍ */}
            <div className={styles.priceRegulationTableBox}>
              <div className={styles.priceRegulationHeader}>
                <span>Khung giá quy định hệ thống ({tutorLevel})</span>
              </div>
              <table className={styles.priceTable}>
                <thead>
                  <tr>
                    <th>Cấp học</th>
                    <th>Lớp 1 - 2 học sinh (1-1)</th>
                    <th>Lớp 3 - 5 học sinh (Chia đều {numStudents >= 3 ? numStudents : "N"} HS)</th>
                  </tr>
                </thead>
                <tbody>
                  {["Cấp 1", "Cấp 2", "Cấp 3"].map((lvl) => {
                    const cfgLess = PRICE_LIMITS[tutorLevel]?.lessThan3[lvl];
                    
                    // Tính mức chia thực tế cho lớp >= 3 sinh dựa trên 1-1 và LÀM TRÒN ĐẾN HÀNG NGHÌN
                    let dividedLabel = "-";
                    if (cfgLess) {
                      const divNum = numStudents >= 3 ? numStudents : 3;
                      const minDiv = roundToThousand(cfgLess.min / divNum);
                      const maxDiv = roundToThousand(cfgLess.max / divNum);
                      dividedLabel = `${minDiv.toLocaleString("vi-VN")}đ - ${maxDiv.toLocaleString("vi-VN")}đ / buổi / HS`;
                    }

                    const isCurrentLvl = level === lvl;
                    return (
                      <tr key={lvl} className={isCurrentLvl ? styles.activeTableRow : ""}>
                        <td><strong>{lvl}</strong></td>
                        <td>{cfgLess?.label || "-"}</td>
                        <td>{dividedLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.formGroup} style={{ marginTop: "20px" }}>
              <label>Mô tả nội dung & Phương pháp giảng dạy <span className={styles.required}>*</span></label>
              <textarea 
                rows={4}
                placeholder="Chia sẻ mục tiêu lớp học, lộ trình học tập và phương pháp giảng dạy độc đáo của bạn..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              {/* KHUNG GỢI Ý MÔ TẢ CẤU TRÚC BUỔI HỌC */}
              <div className={styles.descriptionSuggestionBox}>
                <div className={styles.suggestionTitle}>💡 Gợi ý cấu trúc 1 buổi học hiệu quả:</div>
                <ul className={styles.suggestionList}>
                  <li><strong>Mở đầu (10 - 15 phút):</strong> Ôn tập kiến thức bài cũ, giải đáp thắc mắc bài tập về nhà.</li>
                  <li><strong>Nội dung chính (60 - 70 phút):</strong> Giảng dạy lý thuyết bài mới, hướng dẫn ví dụ minh họa và cho học sinh thực hành làm bài tại chỗ.</li>
                  <li><strong>Tổng kết (10 - 15 phút):</strong> Tóm tắt lại trọng tâm kiến thức, giao bài tập về nhà và dặn dò chuẩn bị cho buổi sau.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Hình ảnh đại diện lớp học</h2>
            <p className={styles.subText}>Chọn một hình nền có sẵn hoặc tải ảnh của riêng bạn lên để thu hút học sinh.</p>
            
            <div className={styles.imageSelectionArea}>
              <div className={styles.defaultGrid}>
                {DEFAULT_IMAGES.map((imgSrc, index) => (
                  <div 
                    key={index} 
                    className={`${styles.imgWrapper} ${selectedImage === imgSrc ? styles.selectedImg : ""}`}
                    onClick={() => setSelectedImage(imgSrc)}
                  >
                    <Image src={imgSrc} alt={`Mẫu ${index + 1}`} width={90} height={60} style={{ objectFit: "cover" }} />
                  </div>
                ))}
              </div>

              <div className={styles.uploadBox}>
                <label htmlFor="file-upload" className={styles.uploadLabel}>
                  <span>📤 Tải ảnh lên</span>
                </label>
                <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                
                {customImage && (
                  <div className={`${styles.imgWrapper} ${selectedImage === customImage ? styles.selectedImg : ""}`} onClick={() => setSelectedImage(customImage)}>
                    <Image src={customImage} alt="Ảnh tải lên" width={90} height={60} style={{ objectFit: "cover" }} />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <h2>Lịch học dự kiến</h2>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: "20px" }}>
              <label>Lựa chọn hình thức / Lộ trình học <span className={styles.required}>*</span></label>
              <select
                value={courseType}
                onChange={(e) => handleCourseTypeChange(e.target.value)}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              >
                <option value="1_term">Dạy theo 1 kỳ (Quy đổi thành 18 tuần học)</option>
                <option value="2_terms">Dạy theo 2 kỳ (Quy đổi thành 36 tuần học)</option>
                <option value="custom">Dạy riêng lẻ dành cho các lớp học thêm, lớp củng cố kiến thức,... (1 - 4 tuần)</option>
              </select>
            </div>

            <div className={styles.rowGrid} style={{ marginBottom: "20px" }}>
              <div className={styles.formGroup}>
                <label>📅 Ngày bắt đầu dạy (Khai giảng) <span className={styles.required}>*</span></label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={handleStartDateChange}
                  min={getMinStartDateString()}
                  required 
                />
                {dateErrorMessage && (
                  <p className={styles.errorAlert} style={{ marginTop: "8px", fontSize: "14px" }}>
                    {dateErrorMessage}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>⏳ Số tuần dự kiến hoàn thành</label>
                <input 
                  type="number" 
                  min={courseType === "custom" ? "1" : "1"} 
                  max={courseType === "custom" ? "4" : undefined}
                  value={totalWeeks} 
                  onChange={(e) => handleWeeksChange(e.target.value)} 
                  onBlur={() => {
                    if (courseType === "custom") {
                      const val = parseInt(totalWeeks, 10);
                      if (isNaN(val) || val < 1) setTotalWeeks(1);
                      else if (val > 4) setTotalWeeks(4);
                    }
                  }}
                  disabled={courseType !== "custom"}
                  required 
                />
                {courseType === "custom" && (
                  <small style={{ color: "#64748b", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    * Lớp dạy riêng lẻ cho phép chọn từ 1 đến 4 tuần.
                  </small>
                )}
              </div>
            </div>

            {endDate && !dateErrorMessage && (
              <div className={styles.endDateNotification}>
                🗓️ Lớp học sẽ tự động kết thúc tuyển sinh và bế giảng vào ngày: <strong>{new Date(endDate).toLocaleDateString("vi-VN")}</strong>
              </div>
            )}

            <div className={styles.daysSelector} style={{ marginTop: "15px" }}>
              {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"].map((day) => (
                <button
                  type="button"
                  key={day}
                  className={selectedDays.includes(day) ? styles.activeDay : ""}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className={styles.timePickerContainer}>
              <label className={styles.subLabel}>
                Chọn giờ bắt đầu dạy (Cố định 2 tiếng/buổi, từ 07:00 đến 23:00)
              </label>
              
              <div className={styles.timePickerRow}>
                <div className={styles.timeInputWrapper}>
                  <span className={styles.timeInputIcon}>Bắt đầu:</span>
                  <select
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className={styles.timeInput}
                    style={{ border: "none", outline: "none", background: "transparent", cursor: "pointer", fontWeight: "600" }}
                  >
                    {START_TIME_OPTIONS.map((timeOption) => (
                      <option key={timeOption} value={timeOption}>
                        {timeOption}
                      </option>
                    ))}
                  </select>
                </div>

                <span className={styles.timeArrowDivider}>➔</span>

                <div className={styles.timeInputWrapper} style={{ backgroundColor: "#e2e8f0" }}>
                  <span className={styles.timeInputIcon}>Kết thúc:</span>
                  <input 
                    type="text" 
                    value={endTime} 
                    readOnly
                    className={styles.timeInput}
                    style={{ fontWeight: "700", color: "#1e293b", width: "70px", border: "none", background: "transparent" }}
                  />
                </div>
              </div>
            </div>

            {conflictMessage && <div className={styles.errorAlert}>{conflictMessage}</div>}
          </section>
        </div>

        {/* CỘT BÊN PHẢI HỌC PHÍ DỰ KIẾN */}
        <div className={styles.rightColumn}>
          <div className={styles.stickyWrapper}>
            <div className={styles.feeEstimateCard}>
              <h3>💵 Học phí dự kiến</h3>
              <p className={styles.feeSubHeader}>Mức giá này được hiển thị công khai cho phụ huynh và học sinh khi thực hiện đăng ký tìm kiếm giảng viên.</p>
              
              <div className={styles.feeDisplay}>
                <span className={styles.feeLabel}>Học phí 1 buổi:</span>
                <span className={styles.feeValue}>{currentRate.toLocaleString("vi-VN")}đ / Buổi</span>
              </div>

              {/* TÍNH TOÁN TIỀN THEO THÁNG / THEO KHÓA & TRỪ PHÍ VÍ SÀN 35% */}
              <div className={styles.calculationSection}>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Tổng số buổi dạy:</span>
                  <span className={styles.calcValue}>{totalCourseSessions} buổi</span>
                </div>

                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Thời lượng 1 buổi:</span>
                  <span className={styles.calcValue}>{hoursPerSession} tiếng </span>
                </div>

                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Số buổi học / tuần:</span>
                  <span className={styles.calcValue}>{daysPerWeekCount} buổi/tuần</span>
                </div>

                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Số lượng học sinh:</span>
                  <span className={styles.calcValue}>{numStudents} học sinh</span>
                </div>

                {/* KIỂM TRA HÌNH THỨC HỌC CÓ PHẢI TÙY CHỌN SỐ TUẦN (CUSTOM) HAY KHÔNG */}
                {courseType === "custom" ? (
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>Học sinh đóng toàn khóa (1 HS):</span>
                    <span className={styles.calcValueHighlight}>
                      {totalFeePerStudent > 0 ? `${totalFeePerStudent.toLocaleString("vi-VN")}đ` : "0đ"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className={styles.calcRow}>
                      <span className={styles.calcLabel}>Học sinh đóng / tháng:</span>
                      <span className={styles.calcValue}>
                        {monthlyFeePerStudent > 0 ? `${monthlyFeePerStudent.toLocaleString("vi-VN")}đ` : "0đ"}
                      </span>
                    </div>

                    <div className={styles.calcRow}>
                      <span className={styles.calcLabel}>Tổng tiền 1 tháng nhận được:</span>
                      <span className={styles.calcValueHighlight}>
                        {minMonthlyNetPerStudent > 0 ? `${Math.round(minMonthlyNetPerStudent).toLocaleString("vi-VN")}đ / tháng` : "0đ"} ~ {monthlyNetEarnings > 0 ? `${Math.round(monthlyNetEarnings).toLocaleString("vi-VN")}đ / tháng` : "0đ"}
                      </span>
                    </div>
                  </>
                )}

                {/* TỔNG TIỀN TOÀN KHÓA */}
                <div className={styles.calcRow} style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed rgba(255, 255, 255, 0.25)" }}>
                  <span className={styles.calcLabel}>Tổng tiền toàn khóa (Toàn bộ HS):</span>
                  <span className={styles.calcValue}>
                    {totalCourseGrossRevenue.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {/* DÒNG PHÍ SÀN 35% */}
                <div className={styles.calcRow}>
                  <span className={styles.feeSubLabel}>Phí sàn 35%:</span>
                  <span className={styles.feeSubValue}>
                    -{platformFeeAmount > 0 ? platformFeeAmount.toLocaleString("vi-VN") : 0}đ
                  </span>
                </div>

                {/* TỔNG TIỀN THỰC NHẬN */}
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>
                    Tổng tiền thực nhận của nguyên khóa này:
                  </span>
                  <span className={styles.totalValue}>
                    {totalCourseNetEstimateBenefit > 0 ? `${Math.round(totalCourseNetEstimateBenefit).toLocaleString("vi-VN")}đ` : "0đ"}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.tipsCard}>
              <h4>💡 Mẹo dành cho bạn</h4>
              <ul>
                <li><strong>Tên lớp rõ ràng</strong> sẽ thu hút học sinh đăng ký tham gia cao gấp 2 lần.</li>
                <li><strong>Mô tả chi tiết</strong> phương pháp dạy học cụ thể giúp phụ huynh an tâm, tin tưởng gửi gắm hơn.</li>
              </ul>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isSubmitting || !!conflictMessage || !!meetError || !!dateErrorMessage || !isAllowed || (level !== "Cấp 1" && filteredCategories.length === 0) || !!priceError}
            >
              {isSubmitting ? "Đang xử lý tạo lớp..." : "Tạo lớp ➔"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}