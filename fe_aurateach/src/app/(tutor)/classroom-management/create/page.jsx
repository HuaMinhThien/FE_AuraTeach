"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./create-class.module.css"; 

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

// Bảng giá quy định phân loại theo Level Gia sư, Số học sinh & Cấp học
const PRICE_LIMITS = {
  "Giáo viên": {
    greaterThan3: { // Lớp >= 3 học sinh (3 đến 5 học sinh)
      "Cấp 1": { min: 40000, max: 60000, label: "40.000đ - 60.000đ / buổi" },
      "Cấp 2": { min: 50000, max: 80000, label: "50.000đ - 80.000đ / buổi" },
      "Cấp 3": { min: 70000, max: 100000, label: "70.000đ - 100.000đ / buổi" },
    },
    lessThan3: { // Lớp < 3 học sinh (1 đến 2 học sinh)
      "Cấp 1": { min: 100000, max: 300000, label: "100.000đ - 300.000đ / buổi" },
      "Cấp 2": { min: 120000, max: 400000, label: "120.000đ - 400.000đ / buổi" },
      "Cấp 3": { min: 150000, max: 1000000, label: "150.000đ - 1.000.000đ / buổi" },
    },
  },
  "Sinh viên": {
    greaterThan3: { // Lớp >= 3 học sinh (3 đến 5 học sinh)
      "Cấp 1": { min: 30000, max: 50000, label: "30.000đ - 50.000đ / buổi" },
      "Cấp 2": { min: 40000, max: 60000, label: "40.000đ - 60.000đ / buổi" },
      "Cấp 3": { min: 50000, max: 80000, label: "50.000đ - 80.000đ / buổi" },
    },
    lessThan3: { // Lớp < 3 học sinh (1 đến 2 học sinh)
      "Cấp 1": { min: 80000, max: 200000, label: "80.000đ - 200.000đ / buổi" },
      "Cấp 2": { min: 100000, max: 250000, label: "100.000đ - 250.000đ / buổi" },
      "Cấp 3": { min: 120000, max: 350000, label: "120.000đ - 350.000đ / buổi" },
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

export default function CreateClassPage() {
  const router = useRouter();

  // --- State Kiểm soát Quyền Tạo Lớp & Thông tin Gia sư ---
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [allowedCategories, setAllowedCategories] = useState([]);
  const [tutorLevel, setTutorLevel] = useState("Giáo viên"); // Default: Giáo viên / Sinh viên

  // --- Các State quản lý dữ liệu Form ---
  const [className, setClassName] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Cấp 1");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState(3); // Giới hạn từ 1 đến 5 học sinh
  const [pricePerSession, setPricePerSession] = useState(50000);

  // State quản lý link Google Meet
  const [meetLink, setMeetLink] = useState("");
  const [meetError, setMeetError] = useState("");

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

  // Tự động kiểm tra cấu hình min/max giá dựa trên Level Gia sư, Cấp học và Số lượng HS
  const parsedMaxStudents = parseInt(maxStudents, 10);
  const numStudents = Math.min(Math.max(isNaN(parsedMaxStudents) ? 1 : parsedMaxStudents, 1), 5);
  const currentTutorConfig = PRICE_LIMITS[tutorLevel] || PRICE_LIMITS["Giáo viên"];
  const currentPriceConfig = numStudents >= 3 
    ? currentTutorConfig.greaterThan3[level] 
    : currentTutorConfig.lessThan3[level];

  // Tính toán giá trị lỗi kiểm tra giá
  const currentRate = parseInt(pricePerSession || 0, 10);
  const priceError = (currentPriceConfig && (currentRate < currentPriceConfig.min || currentRate > currentPriceConfig.max))
    ? `⚠️ Mức phí cho ${level} (${tutorLevel} - ${numStudents >= 3 ? "Lớp ≥ 3 HS" : "Lớp < 3 HS"}) phải nằm trong khoảng: ${currentPriceConfig.label}`
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

  const validateStartDate = (dateString) => {
    if (!dateString) return true;
    
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      const todayStr = today.toLocaleDateString("vi-VN");
      setDateErrorMessage(`⚠️ Ngày bắt đầu phải từ hôm nay (${todayStr}) trở đi. Không thể tạo lớp trong quá khứ.`);
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

  const validateGoogleMeet = (url) => {
    if (!url.trim()) {
      setMeetError("Vui lòng nhập đường liên kết lớp học Google Meet.");
      return false;
    }
    const meetRegex = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
    if (!meetRegex.test(url.trim())) {
      setMeetError("Đường liên kết không hợp lệ. Định dạng chuẩn phải là: https://meet.google.com/abc-xxxx-def");
      return false;
    }
    setMeetError("");
    return true;
  };

  const handleMeetChange = (e) => {
    const value = e.target.value;
    setMeetLink(value);
    if (value) validateGoogleMeet(value);
  };

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

  const hoursPerSession = 2; // Cố định 2 tiếng cho 1 buổi dạy

  // CÔNG THỨC TÍNH TIỀN HỌC THEO BUỔI
  const daysPerWeekCount = selectedDays.length;
  const totalWeeksCount = parseInt(totalWeeks || 0, 10);
  const totalCourseSessions = daysPerWeekCount * totalWeeksCount; 
  
  const studentFeeToPay = currentRate * totalCourseSessions;
  const totalCourseEstimateBenefit = studentFeeToPay * numStudents;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAllowed) {
      alert("⚠️ Bạn không có quyền thực hiện chức năng này!");
      return;
    }

    if (!category) {
      alert("⚠️ Vui lòng chọn môn học được phép dạy!");
      return;
    }
    
    if (priceError) {
      alert("⚠️ Học phí nhập vào không nằm trong khoảng giá quy định. Vui lòng kiểm tra lại!");
      return;
    }

    if (!validateStartDate(startDate)) {
      alert("⚠️ Vui lòng chọn ngày bắt đầu hợp lệ (từ hôm nay trở đi)!");
      return;
    }

    const isMeetValid = validateGoogleMeet(meetLink);
    if (!isMeetValid) return;

    if (conflictMessage) {
      alert("Vui lòng xử lý trùng lịch trước khi tạo lớp học!");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      tutor_id: tutorId,
      class_name: className,
      category_id: category,
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
      permanent_room_url: meetLink.trim(),
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

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
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
              <label>Đường liên kết phòng học Google Meet <span className={styles.required}>*</span></label>
              <input 
                type="url" 
                placeholder="Ví dụ: https://meet.google.com/abc-xxxx-def" 
                value={meetLink}
                onChange={handleMeetChange}
                required
              />
              {meetError && <p className={styles.errorAlert} style={{ marginTop: "8px", fontSize: "14px" }}>{meetError}</p>}
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="category">Môn học sẽ dạy <span className={styles.required}>*</span></label>
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
                {filteredCategories.length === 0 && (
                  <p className={styles.errorAlert} style={{ marginTop: "6px", fontSize: "13px" }}>
                    ⚠️ Bạn chưa đăng ký hoặc chưa được duyệt chuyên môn dạy môn nào trong danh mục hệ thống.
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Cấp học</label>
                <div className={styles.segmentedControl}>
                  {["Cấp 1", "Cấp 2", "Cấp 3"].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      className={level === lvl ? styles.activeSegment : ""}
                      onClick={() => setLevel(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
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
                <label>Học phí mong muốn (đ/buổi) <span className={styles.required}>*</span></label>
                <input 
                  type="number" 
                  step="10000"
                  min={currentPriceConfig?.min}
                  max={currentPriceConfig?.max}
                  value={pricePerSession}
                  onChange={(e) => setPricePerSession(e.target.value)}
                  required
                />
                {priceError && (
                  <p className={styles.errorAlert} style={{ marginTop: "16px", fontSize: "13px", padding: "8px 12px" }}>
                    {priceError}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Mô tả nội dung & Phương pháp giảng dạy</label>
              <textarea 
                rows={4}
                placeholder="Chia sẻ mục tiêu lớp học, lộ trình học tập và phương pháp giảng dạy độc đáo của bạn..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
                <option value="custom">Dạy riêng lẻ dành cho các lớp học thêm, lớp củng cố kiến thức,... (Tùy chọn số tuần)</option>
              </select>
            </div>

            <div className={styles.rowGrid} style={{ marginBottom: "20px" }}>
              <div className={styles.formGroup}>
                <label>📅 Ngày bắt đầu dạy (Khai giảng) <span className={styles.required}>*</span></label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={handleStartDateChange}
                  min={getTodayString()}
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
                  min="1" 
                  value={totalWeeks} 
                  onChange={(e) => setTotalWeeks(e.target.value)} 
                  disabled={courseType !== "custom"}
                  required 
                />
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

              {/* KHUNG GIÁ GỢI Ý DỰA THEO CẤP HỌC, LEVEL GIA SƯ VÀ SỐ LƯỢNG HỌC SINH */}
              <div className={styles.suggestedBox}>
                <div className={styles.suggestedTitle}>
                  💡 Khung giá quy định ({tutorLevel} - {level} - {numStudents >= 3 ? "Lớp từ 3 đến 5 HS" : "Lớp dưới 3 HS"}):
                </div>
                <div className={styles.suggestedValue}>
                  {currentPriceConfig?.label}
                </div>
              </div>

              {/* TÍNH TOÁN TIỀN THEO BUỔI & HỌC PHÍ HỌC SINH ĐÓNG & TỔNG TIỀN DỰ ĐIỂN */}
              <div className={styles.calculationSection}>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Thời lượng 1 buổi:</span>
                  <span className={styles.calcValue}>{hoursPerSession} tiếng (Cố định)</span>
                </div>

                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Tổng số buổi học:</span>
                  <span className={styles.calcValue}>{totalCourseSessions} buổi ({daysPerWeekCount} buổi/tuần × {totalWeeksCount} tuần)</span>
                </div>

                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Tiền 1 học sinh đóng:</span>
                  <span className={styles.calcValueHighlight}>
                    {studentFeeToPay > 0 ? `${studentFeeToPay.toLocaleString("vi-VN")}đ` : "0đ"}
                  </span>
                </div>

                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Tổng tiền ước tính sẽ nhận ({numStudents} HS):</span>
                  <span className={styles.totalValue}>
                    {totalCourseEstimateBenefit > 0 ? `${totalCourseEstimateBenefit.toLocaleString("vi-VN")}đ` : "0đ"}
                  </span>
                </div>
              </div>

              <p className={styles.feeFootnote}>
                ℹ️ Mức phí tự điền phải nằm trong khung quy định nhằm đảm bảo cân bằng thị trường gia sư.
              </p>
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
              disabled={isSubmitting || !!conflictMessage || !!meetError || !!dateErrorMessage || !isAllowed || filteredCategories.length === 0 || !!priceError}
            >
              {isSubmitting ? "Đang xử lý tạo lớp..." : "Tạo lớp ➔"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}