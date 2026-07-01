"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./create-class.module.css"; 

const DEFAULT_IMAGES = [
  "/img/class/default-class-1.jpg",
  "/img/class/default-class-2.jpg",
  "/img/class/default-class-3.jpg",
  "/img/class/default-class-4.jpg",
  "/img/class/default-class-5.jpg",
];

export default function CreateClassPage() {
  // --- Các State quản lý dữ liệu Form ---
  const [className, setClassName] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("Cấp 2");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState(15);
  const [hourlyRate, setHourlyRate] = useState(150000);

  // --- State danh mục động nạp từ API ---
  const [categoriesList, setCategoriesList] = useState([]);

  // --- State về Thời gian & Lịch học ---
  const [startDate, setStartDate] = useState("");
  const [totalWeeks, setTotalWeeks] = useState(12);
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");

  // --- State quản lý ảnh đại diện lớp học ---
  const [selectedImage, setSelectedImage] = useState(DEFAULT_IMAGES[0]);
  const [customImage, setCustomImage] = useState(null);

  // --- State trạng thái hệ thống ---
  const [conflictMessage, setConflictMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tự động gọi API lấy danh mục động khi màn hình load thành công
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/categories");
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

  // Tính toán Ngày kết thúc (Derived State)
  let endDate = "";
  if (startDate && totalWeeks) {
    const start = new Date(startDate);
    const daysToAdd = parseInt(totalWeeks) * 7;
    const end = new Date(start);
    end.setDate(start.getDate() + daysToAdd);
    endDate = end.toISOString().split("T")[0];
  }

  // Logic kiểm tra trùng lịch Real-time
  useEffect(() => {
    const checkScheduleConflict = async () => {
      if (!startDate || !endDate || selectedDays.length === 0 || !startTime || !endTime) {
        setConflictMessage("");
        return;
      }

      try {
        const timeSlot = `${startTime}-${endTime}`;
        const queryParams = new URLSearchParams({
          start: startDate,
          end: endDate,
          days: selectedDays.join(","),
          slot: timeSlot,
        });

        const res = await fetch(`/api/classes/check-conflict?${queryParams}`);
        const result = await res.json();

        if (!result.success && result.isConflict) {
          setConflictMessage(`⚠️ ${result.message}`);
        } else {
          setConflictMessage("");
        }
      } catch (err) {
        console.error("Lỗi kiểm tra trùng lịch trùng:", err);
      }
    };

    checkScheduleConflict();
  }, [startDate, endDate, selectedDays, startTime, endTime]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (conflictMessage) {
      alert("Vui lòng xử lý trùng lịch trước khi tạo lớp học!");
      return;
    }

    setIsSubmitting(true);
    
    // Lưu ý: category ở đây nên là category_id nếu DB yêu cầu
    const payload = {
      class_name: className,
      category_id: category, // Đảm bảo trùng với cột trong DB
      description: description,
      max_students: parseInt(maxStudents),
      hourly_rate: parseInt(hourlyRate),
      start_date: startDate,
      end_date: endDate,
      schedule_days: selectedDays,
      time_slot: `${startTime}-${endTime}`,
      thumbnail: selectedImage,
    };

    try {
      const response = await fetch("http://localhost:8000/api/courses", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert("🎉 Tạo lớp học thành công!");
        // Reset form sau khi thành công
        setClassName("");
        setDescription("");
      } else {
        alert(`Lỗi: ${data.message || "Không thể tạo lớp"}`);
      }
    } catch (error) {
      console.error("Lỗi gửi dữ liệu:", error);
      alert("Có lỗi kết nối tới server.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label>Danh mục</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="">Chọn môn học</option>
                  {categoriesList.map((cat) => (
                    // Đã sửa đổi: Sử dụng đúng key cat.category_id và trường dữ liệu cat.category_name từ API JSON Server
                    <option key={cat.category_id || cat.id} value={cat.category_name}>
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
                <label>📅 Ngày bắt đầu dạy (Khai giảng)</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{padding: "12px 16px;", border: "1px solid #cbd5e1", borderRadius: "8px;"}} />
              </div>
              <div className={styles.formGroup}>
                <label>⏳ Số tuần dự kiến hoàn thành</label>
                <input type="number" min="1" value={totalWeeks} onChange={(e) => setTotalWeeks(e.target.value)} required />
              </div>
            </div>

            {endDate && (
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

            <div className={styles.timePickerRow}>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <span>—</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              <span className={styles.durationLabel}>Lớp tối (2 tiếng)</span>
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

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !!conflictMessage}>
              {isSubmitting ? "Đang xử lý tạo lớp..." : "Tiếp tục ➔"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}