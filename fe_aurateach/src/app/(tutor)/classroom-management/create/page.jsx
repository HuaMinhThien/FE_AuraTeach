"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./create-class.module.css"; 

// Import các service đã chuẩn hóa
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

export default function CreateClassPage() {
  const router = useRouter();

  // --- State Kiểm soát Quyền Tạo Lớp ---
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);

  // --- Các State quản lý dữ liệu Form ---
  const [className, setClassName] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Cấp 2");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState(15);
  const [hourlyRate, setHourlyRate] = useState(150000);
  
  // State quản lý link Google Meet
  const [meetLink, setMeetLink] = useState("");
  const [meetError, setMeetError] = useState("");

  // State danh mục động nạp từ API
  const [categoriesList, setCategoriesList] = useState([]);

  // State về Thời gian & Lịch học
  const [startDate, setStartDate] = useState("");
  const [totalWeeks, setTotalWeeks] = useState(12);
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");

  // State quản lý ảnh đại diện lớp học
  const [selectedImage, setSelectedImage] = useState(DEFAULT_IMAGES[0]);
  const [customImage, setCustomImage] = useState(null);

  // State trạng thái hệ thống
  const [conflictMessage, setConflictMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateErrorMessage, setDateErrorMessage] = useState("");

  // Kiểm tra quyền hạn gia sư
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

        const tutors = await tutorService.getByUserId(userInfo.user_id);
        const tutor = Array.isArray(tutors) ? tutors[0] : tutors;

        if (!tutor || (tutor.verification_status !== "approved" && tutor.verification_status !== "Đã xác minh")) {
          if (isMounted) {
            alert("⚠️ Hồ sơ gia sư của bạn chưa được xét duyệt thành công. Bạn chưa thể tạo lớp học mới!");
            router.push("/classroom-management");
          }
          return;
        }

        if (isMounted) {
          setIsAllowed(true);
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

  // Lấy danh mục động thông qua categoryService
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getCategories();
        if (data) {
          setCategoriesList(data);
        }
      } catch (error) {
        console.error("Lỗi lấy danh mục môn học:", error);
      }
    };
    fetchCategories();
  }, []);

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

// Kiểm tra trùng lịch Real-time
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
        const params = {
          start: startDate,
          end: endDate,
          days: selectedDays.join(","),
          slot: timeSlot,
        };

        // 💡 Gọi trực tiếp qua courseService thay vì dùng fetch thô dẫn đến sai đường dẫn API
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
  }, [startDate, endDate, selectedDays, startTime, endTime]);

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

  // Submit tạo khóa học / lớp học qua courseService
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAllowed) {
      alert("⚠️ Bạn không có quyền thực hiện chức năng này!");
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

    // ➕ Lấy user_id từ cookie user_info để gửi kèm lên backend
    let currentUserId = null;
    try {
      const cookies = document.cookie.split("; ");
      const userInfoCookie = cookies.find((row) => row.startsWith("user_info="));
      if (userInfoCookie) {
        const cookieValue = decodeURIComponent(userInfoCookie.split("=")[1]);
        const userInfo = JSON.parse(cookieValue);
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
    
    // Gói dữ liệu kèm theo user_id để backend nhận diện chính xác gia sư
    const payload = {
      user_id: currentUserId, // 👈 Bổ sung user_id vào đây
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
        alert("🎉 Tạo lớp học (khóa học) thành công! Hệ thống đã hiển thị công khai.");
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

  return (
    <div className={styles.container} style={{marginTop: "80px"}}>
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
              {meetError && <p className={styles.errorAlert} style={{marginTop: "8px", fontSize: "14px"}}>{meetError}</p>}
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="category">Môn học học phần <span className={styles.required}>*</span></label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">-- Chọn môn học dạy --</option>
                  {categoriesList
                    .filter(cat => cat.category_name !== "Tất cả")
                    .map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                </select>
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
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                />
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
                  <p className={styles.errorAlert} style={{marginTop: "8px", fontSize: "14px"}}>
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
              <label className={styles.subLabel}>Chọn mốc thời gian bắt đầu và kết thúc (Tối thiểu 2 tiếng / buổi)</label>
              
              <div className={styles.timePickerRow}>
                <div className={styles.timeInputWrapper}>
                  <span className={styles.timeInputIcon}>Từ:</span>
                  <input 
                    type="time" 
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
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    className={styles.timeInput}
                  />
                </div>
              </div>
            </div>

            {conflictMessage && <div className={styles.errorAlert}>{conflictMessage}</div>}
          </section>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.stickyWrapper}>
            <div className={styles.feeEstimateCard}>
              <h3>💵 Học phí dự kiến</h3>
              <p>Mức giá này được hiển thị công khai cho phụ huynh và học sinh khi thực hiện đăng ký tìm kiếm giảng viên.</p>
              <div className={styles.feeDisplay}>
                <span className={styles.feeLabel}>Mức phí mỗi giờ:</span>
                <span className={styles.feeValue}>{parseInt(hourlyRate || 0).toLocaleString("vi-VN")}đ/ giờ</span>
              </div>
              <p className={styles.feeFootnote}>ℹ️ Mức phí tự điền này đảm bảo tính chủ động và tối ưu thu nhập theo đúng năng lực kinh nghiệm.</p>
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
              disabled={isSubmitting || !!conflictMessage || !!meetError || !!dateErrorMessage || !isAllowed}
            >
              {isSubmitting ? "Đang xử lý tạo lớp..." : "Tiếp tục ➔"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}