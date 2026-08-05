"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./create-class.module.css"; 

import { tutorService } from "@/services/tutorService";
import { categoryService } from "@/services/categoryService";
import { courseService } from "@/services/courseService";

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

const PRICE_LIMITS = {
  greaterThan3: { // Lớp >= 3 học sinh
    "Cấp 1": { min: 100000, max: 150000, label: "100.000đ - 150.000đ / giờ" },
    "Cấp 2": { min: 150000, max: 300000, label: "150.000đ - 300.000đ / giờ" },
    "Cấp 3": { min: 250000, max: 500000, label: "250.000đ - 500.000đ / giờ" },
  },
  lessThan3: { // Lớp < 3 học sinh
    "Cấp 1": { min: 200000, max: 350000, label: "200.000đ - 350.000đ / giờ" },
    "Cấp 2": { min: 300000, max: 500000, label: "300.000đ - 500.000đ / giờ" },
    "Cấp 3": { min: 450000, max: 1000000, label: "450.000đ - 1.000.000đ / giờ" },
  },
};

export default function CreateClassPage() {
  const router = useRouter();

  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [allowedCategories, setAllowedCategories] = useState([]);
  const [tutorId, setTutorId] = useState("");

  const [className, setClassName] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Cấp 2");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState(15);
  const [hourlyRate, setHourlyRate] = useState(150000);
  
  const [meetLink, setMeetLink] = useState("");
  const [meetError, setMeetError] = useState("");

  const [categoriesList, setCategoriesList] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [totalWeeks, setTotalWeeks] = useState(12);
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");

  const [selectedImage, setSelectedImage] = useState(DEFAULT_IMAGES[0]);
  const [customImage, setCustomImage] = useState(null);

  const [conflictMessage, setConflictMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateErrorMessage, setDateErrorMessage] = useState("");

  const numStudents = parseInt(maxStudents || 0);
  const currentPriceConfig = numStudents >= 3 
    ? PRICE_LIMITS.greaterThan3[level] 
    : PRICE_LIMITS.lessThan3[level];

  const currentRate = parseInt(hourlyRate || 0);
  const priceError = (currentPriceConfig && (currentRate < currentPriceConfig.min || currentRate > currentPriceConfig.max))
    ? `⚠️ Mức phí cho ${level} (${numStudents >= 3 ? "Lớp ≥ 3 HS" : "Lớp < 3 HS"}) phải nằm trong khoảng: ${currentPriceConfig.label}`
    : "";

  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      try {
        const cookies = document.cookie.split("; ");
        const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));

        if (!userInfoCookie) {
          alert("⚠️ Vui lòng đăng nhập để thực hiện chức năng này!");
          router.push("/login");
          return;
        }

        const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split("=")[1]));

        if (userInfo.role !== "tutor") {
          alert("⚠️ Chỉ tài khoản Giảng viên / Gia sư mới có quyền tạo lớp học!");
          router.push("/classroom-management");
          return;
        }

        const [categoriesData, tutorsData] = await Promise.all([
          categoryService.getCategories(),
          tutorService.getByUserId(userInfo.user_id),
        ]);

        if (isMounted) {
          const categoriesArray = Array.isArray(categoriesData) 
            ? categoriesData 
            : categoriesData?.data || categoriesData?.categories || [];
          setCategoriesList(categoriesArray);
        }

        const tutor = Array.isArray(tutorsData) ? tutorsData[0] : tutorsData;

        if (!tutor || (tutor.verification_status !== "approved" && tutor.verification_status !== "Đã xác minh")) {
          if (isMounted) {
            alert("⚠️ Hồ sơ gia sư của bạn chưa được xét duyệt thành công. Bạn chưa thể tạo lớp học mới!");
            router.push("/classroom-management");
          }
          return;
        }

        if (isMounted) {
          setTutorId(tutor.tutor_id || tutor.id);
          const registeredExpertise = tutor.expertise
            ? tutor.expertise.split(",").map((exp) => exp.trim().toLowerCase())
            : [];
          setAllowedCategories(registeredExpertise);
          setIsAllowed(true);
        }
      } catch (error) {
        console.error("Lỗi khởi tạo trang tạo lớp:", error);
        router.push("/classroom-management");
      } finally {
        if (isMounted) {
          setIsPermissionChecked(true);
        }
      }
    };

    initializePage();

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

  let endDate = "";
  if (startDate && totalWeeks) {
    const start = new Date(startDate);
    const daysToAdd = parseInt(totalWeeks) * 7;
    const end = new Date(start);
    end.setDate(start.getDate() + daysToAdd);
    endDate = end.toISOString().split("T")[0];
  }

  useEffect(() => {
    const checkScheduleConflict = async () => {
      if (!startDate || !endDate || selectedDays.length === 0 || !startTime || !endTime || !tutorId) {
        setConflictMessage("");
        return;
      }

      if (!validateStartDate(startDate)) return;

      try {
        const timeSlot = `${startTime}-${endTime}`;
        const params = {
          start: startDate,
          end: endDate,
          days: selectedDays.join(","),
          slot: timeSlot,
          id_tutor: tutorId,
        };

        const result = await courseService.checkScheduleConflict(params);

        if (result && !result.success && result.isConflict) {
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

  const calculateHoursPerSession = () => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const durationInMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    return durationInMinutes / 60;
  };

  const hoursPerSession = calculateHoursPerSession();

  const getTimeError = () => {
    if (!startTime || !endTime) return "";
    if (startTime < "07:00" || startTime > "23:00" || endTime < "07:00" || endTime > "23:00") {
      return "⚠️ Thời gian học chỉ được phép chọn trong khoảng từ 07:00 sáng đến 23:00 đêm.";
    }
    if (hoursPerSession < 1) {
      return "⚠️ Thời gian buổi học phải kéo dài tối thiểu 1 tiếng (60 phút).";
    }
    return "";
  };

  const timeError = getTimeError();

  const pricePerHour = parseInt(hourlyRate || 0);
  const costPerSession = (hoursPerSession > 0 ? hoursPerSession : 0) * pricePerHour;
  const daysPerWeekCount = selectedDays.length;
  const totalWeeksCount = parseInt(totalWeeks || 0);
  const totalCourseSessions = daysPerWeekCount * totalWeeksCount;
  const totalCourseCost = costPerSession * totalCourseSessions;

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

    if (timeError) {
      alert(timeError);
      return;
    }
    
    if (!validateStartDate(startDate)) {
      alert("⚠️ Vui lòng chọn ngày bắt đầu hợp lệ (từ hôm nay trở đi)!");
      return;
    }

    if (!validateGoogleMeet(meetLink)) return;

    if (conflictMessage) {
      alert("Vui lòng xử lý trùng lịch trước khi tạo lớp học!");
      return;
    }

    let currentUserId = null;
    try {
      const cookies = document.cookie.split("; ");
      const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));
      if (userInfoCookie) {
        const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split("=")[1]));
        currentUserId = userInfo.user_id || userInfo.id;
      }
    } catch (err) {
      console.error("Lỗi đọc cookie user_info:", err);
    }

    if (!currentUserId) {
      alert("⚠️ Không tìm thấy thông tin định danh tài khoản. Vui lòng đăng nhập lại!");
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      user_id: currentUserId,
      tutor_id: tutorId,
      title: className,           
      category_id: category,    
      level,                        
      description,                    
      max_students: parseInt(maxStudents),
      hourly_rate: parseInt(hourlyRate),
      start_date: startDate,
      end_date: endDate,
      total_weeks: parseInt(totalWeeks),
      schedule_days: selectedDays,
      time_slot: `${startTime}-${endTime}`,
      thumbnail: selectedImage,
      permanent_room_url: meetLink.trim(),
    };

    try {
      const data = await courseService.createCourse(payload);
      if (data) {
        alert("🎉 Tạo lớp học thành công! Hệ thống đã hiển thị công khai.");
        router.push("/classroom-management");
      } else {
        alert("Lỗi khi tạo lớp học. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi gửi dữ liệu lên server:", error);
      alert("Đã xảy ra lỗi hệ thống khi kết nối cơ sở dữ liệu.");
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

  const filteredCategories = categoriesList.filter((cat) => {
    const catName = cat.category_name.toLowerCase();

    return allowedCategories.some((allowed) => {
      if (catName.includes(allowed) || allowed.includes(catName)) return true;
      if ((allowed.includes("toán") || catName.includes("toán")) && (allowed.includes("toán") && catName.includes("toán"))) return true;
      if ((allowed.includes("văn") || catName.includes("văn")) && (allowed.includes("văn") && catName.includes("văn"))) return true;
      if ((allowed.includes("anh") || allowed.includes("ngoại ngữ")) && catName.includes("ngoại ngữ")) return true;
      return false;
    });
  });

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
                <label htmlFor="category">Môn học học phần (Chỉ chọn môn đã đăng ký chuyên môn) <span className={styles.required}>*</span></label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">-- Chọn môn học dạy --</option>
                  {filteredCategories && filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))
                  ) : (
                    <option value="no-category" disabled>
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
                <label>Số lượng học sinh tối đa <span className={styles.required}>*</span></label>
                <input 
                  type="number" 
                  min="1" 
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Học phí mong muốn (đ/giờ) <span className={styles.required}>*</span></label>
                <input 
                  type="number" 
                  step="10000"
                  min={currentPriceConfig?.min}
                  max={currentPriceConfig?.max}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                />
                {priceError && (
                  <p className={styles.errorAlert} style={{ marginTop: "6px", fontSize: "13px", padding: "8px 12px" }}>
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
                <input type="number" min="1" value={totalWeeks} onChange={(e) => setTotalWeeks(e.target.value)} required />
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
              <label className={styles.subLabel}>Chọn mốc thời gian bắt đầu và kết thúc (Từ 07:00 đến 23:00, tối thiểu 1 tiếng / buổi)</label>
              
              <div className={styles.timePickerRow}>
                <div className={styles.timeInputWrapper}>
                  <span className={styles.timeInputIcon}>Từ:</span>
                  <input 
                    type="time"
                    min="07:00"
                    max="23:00"
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    className={styles.timeInput}
                  />
                </div>

                <span className={styles.timeArrowDivider}>➔</span>

                <div className={styles.timeInputWrapper}>
                  <span className={styles.timeInputIcon}>Đến:</span>
                  <input 
                    type="time" 
                    min="07:00"
                    max="23:00"
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    className={styles.timeInput}
                  />
                </div>
              </div>
            </div>

            {timeError && (
              <p className={styles.errorAlert} style={{ marginTop: "8px", fontSize: "13px", padding: "8px 12px" }}>
                {timeError}
              </p>
            )}

            {conflictMessage && <div className={styles.errorAlert}>{conflictMessage}</div>}
          </section>
        </div>

        {/* CỘT PHẢI: Đã chỉnh sửa cấu trúc thẻ đóng đúng vị trí */}
        <div className={styles.rightColumn}>
          <div className={styles.stickyWrapper}>
            <div className={styles.feeEstimateCard}>
              <h3>💵 Học phí dự kiến</h3>
              <p className={styles.feeSubHeader}>Mức giá này được hiển thị công khai cho phụ huynh và học sinh khi thực hiện đăng ký tìm kiếm giảng viên.</p>
              
              <div className={styles.feeDisplay}>
                <span className={styles.feeLabel}>Mức phí mỗi giờ:</span>
                <span className={styles.feeValue}>{pricePerHour.toLocaleString("vi-VN")}đ / giờ</span>
              </div>

              {/* KHUNG GIÁ GỢI Ý DỰA THEO CẤP HỌC VÀ SỐ LƯỢNG HỌC SINH */}
              <div className={styles.suggestedBox}>
                <div className={styles.suggestedTitle}>
                  💡 Khung giá cho phép ({level} - {numStudents >= 3 ? "Lớp ≥ 3 học sinh" : "Lớp < 3 học sinh"}):
                </div>
                <div className={styles.suggestedValue}>
                  {currentPriceConfig?.label}
                </div>
              </div>

              {/* TÍNH TOÁN TIỀN TỪNG BUỔI VÀ TỔNG KHÓA HỌC */}
              <div className={styles.calculationSection}>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Thời lượng 1 buổi:</span>
                  <span className={styles.calcValue}>{hoursPerSession >= 1 ? `${hoursPerSession} tiếng` : "Chưa hợp lệ (< 1h)"}</span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Thành tiền / Buổi:</span>
                  <span className={styles.calcValueHighlight}>{costPerSession.toLocaleString("vi-VN")}đ / buổi</span>
                </div>
                
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Tổng số buổi học:</span>
                  <span className={styles.calcValue}>{totalCourseSessions} buổi ({daysPerWeekCount} buổi/tuần × {totalWeeksCount} tuần)</span>
                </div>

                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Tổng tiền cả lớp:</span>
                  <span className={styles.totalValue}>
                    {totalCourseCost > 0 ? `${totalCourseCost.toLocaleString("vi-VN")}đ` : "0đ"}
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
              disabled={isSubmitting || !!conflictMessage || !!meetError || !!dateErrorMessage || !isAllowed || filteredCategories.length === 0 || !!priceError || !!timeError}
            >
              {isSubmitting ? "Đang xử lý tạo lớp..." : "Tạo lớp ➔"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}