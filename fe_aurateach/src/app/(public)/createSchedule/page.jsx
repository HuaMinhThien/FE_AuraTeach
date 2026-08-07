"use client";

import React, { useState, useMemo } from 'react';
// import styles from './CreateClassRequest.module.css';

// Dữ liệu Danh mục mẫu theo yêu cầu
const CATEGORIES = [
  { "category_id": "cat-02", "category_name": "Toán" },
  { "category_id": "cat-03", "category_name": "Ngữ văn" },
  { "category_id": "cat-04", "category_name": "Lý" },
  { "category_id": "cat-05", "category_name": "Hóa" },
  { "category_id": "cat-06", "category_name": "Sinh" },
  { "category_id": "cat-07", "category_name": "Sử" },
  { "category_id": "cat-08", "category_name": "Địa" },
  { "category_id": "cat-09", "category_name": "Ngoại ngữ" },
  { "category_id": "cat-10", "category_name": "Tin học & Lập trình" },
  { "category_id": "cat-11", "category_name": "Năng khiếu" }
];

// Bảng quy định phân loại học phí dựa theo ảnh
const PRICE_LIMITS = {
  "Giáo viên": {
    greaterThan3: {
      "Cấp 1": { min: 40000, max: 60000, label: "40.000đ - 60.000đ / buổi" },
      "Cấp 2": { min: 50000, max: 80000, label: "50.000đ - 80.000đ / buổi" },
      "Cấp 3": { min: 70000, max: 100000, label: "70.000đ - 100.000đ / buổi" },
    },
    lessThan3: {
      "Cấp 1": { min: 100000, max: 300000, label: "100.000đ - 300.000đ / buổi" },
      "Cấp 2": { min: 120000, max: 400000, label: "120.000đ - 400.000đ / buổi" },
      "Cấp 3": { min: 150000, max: 1000000, label: "150.000đ - 1.000.000đ / buổi" },
    }
  },
  "Sinh viên": {
    greaterThan3: {
      "Cấp 1": { min: 30000, max: 50000, label: "30.000đ - 50.000đ / buổi" },
      "Cấp 2": { min: 40000, max: 60000, label: "40.000đ - 60.000đ / buổi" },
      "Cấp 3": { min: 50000, max: 80000, label: "50.000đ - 80.000đ / buổi" },
    },
    lessThan3: {
      "Cấp 1": { min: 80000, max: 200000, label: "80.000đ - 200.000đ / buổi" },
      "Cấp 2": { min: 100000, max: 250000, label: "100.000đ - 250.000đ / buổi" },
      "Cấp 3": { min: 120000, max: 350000, label: "120.000đ - 350.000đ / buổi" },
    }
  }
};

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

// Tạo danh sách giờ từ 07:00 đến 21:00 (để kết thúc là 23:00)
const GENERATE_TIME_SLOTS = () => {
  const slots = [];
  for (let i = 7; i <= 21; i++) {
    const hour = i < 10 ? `0${i}:00` : `${i}:00`;
    slots.push(hour);
  }
  return slots;
};

export default function CreateClassRequest() {
  const [formData, setFormData] = useState({
    title: '',
    category_id: 'cat-02',
    grade_level: 'Cấp 3',
    tutor_level: 'Sinh viên',
    max_students: 1,
    price_per_session: '',
    description: '',
    schedule_type: '1_term',
    total_weeks: 18,
    start_date: '',
    schedule_days: [],
    start_time: '07:00',
    meet_link: ''
  });

  const [loading, setLoading] = useState(false);

  // Tính toán thời gian kết thúc (tự cộng 2 tiếng)
  const endTime = useMemo(() => {
    if (!formData.start_time) return '09:00';
    const hour = parseInt(formData.start_time.split(':')[0], 10);
    const endHour = hour + 2;
    return endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;
  }, [formData.start_time]);

  // Xác định khoảng giá đề xuất dựa trên level, cấp học & số lượng học sinh
  const priceLimitInfo = useMemo(() => {
    const groupKey = formData.max_students >= 3 ? 'greaterThan3' : 'lessThan3';
    return PRICE_LIMITS[formData.tutor_level]?.[groupKey]?.[formData.grade_level] || null;
  }, [formData.tutor_level, formData.max_students, formData.grade_level]);

  // Tính tổng số buổi học và học phí dự kiến
  const { totalSessions, monthlyEstimate, totalCoursePrice } = useMemo(() => {
    const daysPerWeek = formData.schedule_days.length;
    const totalSessions = daysPerWeek * formData.total_weeks;
    const price = Number(formData.price_per_session) || 0;
    
    // Ước tính số buổi trong 1 tháng (4 tuần)
    const monthlySessions = daysPerWeek * 4;
    const monthlyEstimate = monthlySessions * price;
    const totalCoursePrice = totalSessions * price;

    return { totalSessions, monthlyEstimate, totalCoursePrice };
  }, [formData.schedule_days, formData.total_weeks, formData.price_per_session]);

  // Xử lý chuyển đổi thứ trong tuần
  const toggleDay = (day) => {
    setFormData(prev => {
      const exists = prev.schedule_days.includes(day);
      return {
        ...prev,
        schedule_days: exists
          ? prev.schedule_days.filter(d => d !== day)
          : [...prev.schedule_days, day]
      };
    });
  };

  // Xử lý thay đổi lộ trình học
  const handleScheduleTypeChange = (e) => {
    const val = e.target.value;
    let weeks = 18;
    if (val === '2_terms') weeks = 36;
    setFormData(prev => ({
      ...prev,
      schedule_type: val,
      total_weeks: val === 'custom' ? prev.total_weeks : weeks
    }));
  };

  // Tạo link Google Meet demo
  const handleGenerateMeetLink = async () => {
    try {
      const res = await fetch('/api/student-class-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, start_time: formData.start_time, end_time: endTime })
      });
      const result = await res.json();
      if (result.success && result.data?.meet_link) {
        setFormData(prev => ({ ...prev, meet_link: result.data.meet_link }));
      }
    } catch (err) {
      console.error("Lỗi tự động sinh Meet Link:", err);
    }
  };

  // Submit form lên API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.schedule_days.length === 0) {
      alert("Vui lòng chọn ít nhất 1 thứ trong tuần!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3008/api/student-class-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          end_time: endTime
        })
      });

      const resData = await response.json();
      if (response.ok) {
        alert("Đăng yêu cầu tìm gia sư thành công!");
        console.log("Dữ liệu nhận về:", resData);
      } else {
        alert("Lỗi: " + resData.message);
      }
    } catch (error) {
      console.error("Lỗi khi kết nối API:", error);
      alert("Không thể kết nối đến server localhost:3008");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Đăng Yêu Cầu Tìm Gia Sư (Tạo Lớp Học)</h1>

      <div className={styles.layout}>
        {/* Form bên trái */}
        <form onSubmit={handleSubmit} className={styles.formSection}>
          <div className={styles.sectionTitle}>Thông tin lớp học</div>

          <div className={styles.formGroup}>
            <label>Tên lớp học <span>*</span></label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="VD: Lớp ôn thi THPT QG môn Toán"
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})}
              required 
            />
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.formGroup}>
              <label>Môn học <span>*</span></label>
              <select 
                className={styles.select}
                value={formData.category_id}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Cấp học <span>*</span></label>
              <select 
                className={styles.select}
                value={formData.grade_level}
                onChange={e => setFormData({...formData, grade_level: e.target.value})}
              >
                <option value="Cấp 1">Cấp 1</option>
                <option value="Cấp 2">Cấp 2</option>
                <option value="Cấp 3">Cấp 3</option>
              </select>
            </div>
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.formGroup}>
              <label>Yêu cầu trình độ Gia sư <span>*</span></label>
              <select 
                className={styles.select}
                value={formData.tutor_level}
                onChange={e => setFormData({...formData, tutor_level: e.target.value})}
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
                value={formData.max_students}
                onChange={e => setFormData({...formData, max_students: Math.min(5, Math.max(1, parseInt(e.target.value) || 1))})}
                required 
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Học phí chi trả mỗi buổi (VNĐ) <span>*</span></label>
            <input 
              type="number" 
              className={styles.input}
              placeholder="Nhập số tiền..."
              value={formData.price_per_session}
              min={priceLimitInfo?.min}
              max={priceLimitInfo?.max}
              onChange={e => setFormData({...formData, price_per_session: e.target.value})}
              required 
            />
            {priceLimitInfo && (
              <div className={styles.priceHint}>
                Bảng giá đề xuất: <strong>{priceLimitInfo.label}</strong>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Mô tả / Yêu cầu chi tiết</label>
            <textarea 
              className={styles.textarea} 
              rows="3"
              placeholder="Nhập mục tiêu học tập, điểm yếu cần cải thiện..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          {/* Phòng học trực tuyến (Tự động sinh Meet Link) */}
          <div className={styles.formGroup}>
            <label>Link Google Meet (Tự động khởi tạo từ BE)</label>
            <div className={styles.meetBox}>
              <input 
                type="text" 
                className={styles.meetInput} 
                value={formData.meet_link || 'Chưa khởi tạo link...'} 
                readOnly 
              />
              <button type="button" className={styles.genBtn} onClick={handleGenerateMeetLink}>
                {formData.meet_link ? 'Tạo lại link' : 'Lấy link Meet'}
              </button>
            </div>
          </div>

          {/* Lịch học dự kiến */}
          <div className={styles.sectionTitle} style={{ marginTop: '28px' }}>Lịch học dự kiến</div>

          <div className={styles.formGroup}>
            <label>Lựa chọn hình thức / Lộ trình học <span>*</span></label>
            <select className={styles.select} value={formData.schedule_type} onChange={handleScheduleTypeChange}>
              <option value="1_term">Dạy theo 1 kỳ (Quy đổi thành 18 tuần học)</option>
              <option value="2_terms">Dạy theo 2 kỳ (Quy đổi thành 36 tuần học)</option>
              <option value="custom">Dạy riêng lẻ dành cho các lớp học thêm, củng cố kiến thức...</option>
            </select>
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.formGroup}>
              <label>Ngày bắt đầu dạy (Khai giảng) <span>*</span></label>
              <input 
                type="date" 
                className={styles.input} 
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
                required 
              />
            </div>

            <div className={styles.formGroup}>
              <label>Số tuần dự kiến hoàn thành</label>
              <input 
                type="number" 
                className={styles.input} 
                value={formData.total_weeks}
                disabled={formData.schedule_type !== 'custom'}
                onChange={e => setFormData({...formData, total_weeks: parseInt(e.target.value) || 1})}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Chọn các thứ trong tuần <span>*</span></label>
            <div className={styles.daysGrid}>
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  type="button"
                  className={`${styles.dayBtn} ${formData.schedule_days.includes(day) ? styles.dayBtnSelected : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Chọn giờ bắt đầu dạy (Tự động +2 tiếng, từ 07:00 đến 23:00) <span>*</span></label>
            <div className={styles.rowTwo} style={{ alignItems: 'center' }}>
              <select 
                className={styles.select}
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
              >
                {GENERATE_TIME_SLOTS().map(time => (
                  <option key={time} value={time}>Bắt đầu: {time}</option>
                ))}
              </select>
              <span style={{ textAlign: 'center', fontWeight: 'bold' }}>$\rightarrow$</span>
              <input 
                type="text" 
                className={styles.input} 
                value={`Kết thúc: ${endTime}`} 
                disabled 
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Đang gửi yêu cầu...' : 'Tạo Yêu Cầu Lớp Học'}
          </button>
        </form>

        {/* Bảng tóm tắt phía bên phải */}
        <div className={styles.summarySection}>
          <div className={styles.sectionTitle}>Tóm tắt thông tin</div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span>Môn học:</span>
              <strong>{CATEGORIES.find(c => c.category_id === formData.category_id)?.category_name}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Trình độ gia sư:</span>
              <strong>{formData.tutor_level}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Số lượng học sinh:</span>
              <strong>{formData.max_students} HS</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Số buổi / tuần:</span>
              <strong>{formData.schedule_days.length} buổi</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Khung giờ học:</span>
              <strong>{formData.start_time} - {endTime}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Tổng số tuần học:</span>
              <strong>{formData.total_weeks} tuần</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Tổng số buổi dự kiến:</span>
              <strong>{totalSessions} buổi</strong>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span>Đơn giá / buổi:</span>
              <span>{Number(formData.price_per_session).toLocaleString('vi-VN')} VNĐ</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Ước tính / 1 tháng (4 tuần):</span>
              <span>{monthlyEstimate.toLocaleString('vi-VN')} VNĐ</span>
            </div>
            <div className={styles.summaryTotal}>
              <span>Tổng chi phí cả khóa:</span>
              <span>{totalCoursePrice.toLocaleString('vi-VN')} VNĐ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}