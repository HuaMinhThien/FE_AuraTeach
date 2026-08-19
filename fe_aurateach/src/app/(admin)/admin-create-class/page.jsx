// src/app/(admin)/admin-create-class/page.jsx

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './admin-create-class.module.css';

const API_BASE = 'http://localhost:3007';
const DEFAULT_IMAGES = [
  '/img/class/default-class-1.jpg',
  '/img/class/default-class-2.png',
  '/img/class/default-class-3.png',
  '/img/class/default-class-4.png',
  '/img/class/default-class-5.png',
  '/img/class/default-class-6.png',
  '/img/class/default-class-7.png',
  '/img/class/default-class-8.png',
  '/img/class/default-class-9.png',
  '/img/class/default-class-10.png',
];

// Bảng giá tham khảo
const PRICE_LIMITS = {
  "Giáo viên": {
    lessThan3: {
      "Cấp 1": { min: 200000, max: 250000, label: "200.000đ - 250.000đ / buổi" },
      "Cấp 2": { min: 230000, max: 300000, label: "230.000đ - 300.000đ / buổi" },
      "Cấp 3": { min: 250000, max: 350000, label: "250.000đ - 350.000đ / buổi" },
    },
    group3to5: {
      "Cấp 1": { min: 200000, max: 250000, label: "200.000đ - 250.000đ / buổi" },
      "Cấp 2": { min: 230000, max: 300000, label: "230.000đ - 300.000đ / buổi" },
      "Cấp 3": { min: 250000, max: 350000, label: "250.000đ - 350.000đ / buổi" },
    }
  },
  "Sinh viên": {
    lessThan3: {
      "Cấp 1": { min: 120000, max: 150000, label: "120.000đ - 150.000đ / buổi" },
      "Cấp 2": { min: 130000, max: 170000, label: "130.000đ - 170.000đ / buổi" },
      "Cấp 3": { min: 150000, max: 200000, label: "150.000đ - 200.000đ / buổi" },
    },
    group3to5: {
      "Cấp 1": { min: 120000, max: 150000, label: "120.000đ - 150.000đ / buổi" },
      "Cấp 2": { min: 130000, max: 170000, label: "130.000đ - 170.000đ / buổi" },
      "Cấp 3": { min: 150000, max: 200000, label: "150.000đ - 200.000đ / buổi" },
    }
  },
};

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const START_TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const hour = 7 + i;
  return `${hour < 10 ? '0' : ''}${hour}:00`;
});

const roundToThousand = (amount) => Math.round(amount / 1000) * 1000;

export default function AdminCreateClass() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [eligibleTutors, setEligibleTutors] = useState([]);
  const [selectedTutors, setSelectedTutors] = useState([]);
  const [showTutorList, setShowTutorList] = useState(false);
  const [isCheckingEligible, setIsCheckingEligible] = useState(false);
  const [tutorLevel, setTutorLevel] = useState('Giáo viên');

  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    level: 'Cấp 1',
    description: '',
    max_students: 5,
    price_per_session: '',
    start_date: '',
    total_weeks: 12,
    schedule_days: [],
    start_time: '07:00',
    end_time: '09:00',
    thumbnail: DEFAULT_IMAGES[0],
    min_students: 2,
    course_type: '1_term',
  });

  const [errors, setErrors] = useState({});

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`);
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) {
          const isCap1 = formData.level === 'Cấp 1';
          setFormData(prev => ({ 
            ...prev, 
            category_id: isCap1 ? 'cap1_homework' : data[0].category_id 
          }));
        }
      } catch (error) {
        console.error('Lỗi lấy categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Khi level thay đổi, tự động điều chỉnh category_id
  useEffect(() => {
    if (formData.level === 'Cấp 1') {
      setFormData(prev => ({ ...prev, category_id: 'cap1_homework' }));
    } else {
      if (!formData.category_id || formData.category_id === 'cap1_homework') {
        if (categories.length > 0) {
          setFormData(prev => ({ ...prev, category_id: categories[0].category_id }));
        }
      }
    }
  }, [formData.level, categories]);

  const handleStartTimeChange = (startTime) => {
    const [h] = startTime.split(':').map(Number);
    const endHour = h + 2;
    const endTime = `${endHour < 10 ? '0' : ''}${endHour}:00`;
    setFormData(prev => ({ ...prev, start_time: startTime, end_time: endTime }));
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCourseTypeChange = (type) => {
    setFormData(prev => ({ ...prev, course_type: type }));
    if (type === '1_term') {
      setFormData(prev => ({ ...prev, total_weeks: 18 }));
    } else if (type === '2_terms') {
      setFormData(prev => ({ ...prev, total_weeks: 36 }));
    } else {
      setFormData(prev => ({ ...prev, total_weeks: 2 }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Vui lòng nhập tên lớp';
    if (!formData.category_id) newErrors.category_id = 'Vui lòng chọn môn học';
    if (!formData.price_per_session || Number(formData.price_per_session) <= 0) {
      newErrors.price_per_session = 'Vui lòng nhập học phí hợp lệ';
    }
    if (!formData.start_date) newErrors.start_date = 'Vui lòng chọn ngày bắt đầu';
    if (formData.schedule_days.length === 0) {
      newErrors.schedule_days = 'Vui lòng chọn ít nhất 1 ngày trong tuần';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Vui lòng nhập mô tả lớp học';
    }
    if (!formData.total_weeks || Number(formData.total_weeks) <= 0) {
      newErrors.total_weeks = 'Vui lòng nhập số tuần học hợp lệ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get eligible tutors
  const fetchEligibleTutors = async () => {
    setIsCheckingEligible(true);
    try {
      const courseData = {
        category_id: formData.category_id,
        tutor_level: tutorLevel, // "Sinh viên" hoặc "Giáo viên"
        schedule_days: formData.schedule_days,
        time_slot: `${formData.start_time}-${formData.end_time}`,
      };
      
      const res = await fetch('/api/admin/classes/eligible-tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: courseData })
      });
      const result = await res.json();
      if (result.success) {
        setEligibleTutors(result.data);
        setSelectedTutors(result.data.map(t => t.tutor_id));
        setShowTutorList(true);
      } else {
        alert('Không thể tìm tutor phù hợp: ' + result.message);
      }
    } catch (error) {
      console.error('Lỗi tìm tutor:', error);
      alert('Có lỗi xảy ra khi tìm tutor phù hợp');
    } finally {
      setIsCheckingEligible(false);
    }
  };

  const toggleTutor = (tutorId) => {
    setSelectedTutors(prev =>
      prev.includes(tutorId)
        ? prev.filter(id => id !== tutorId)
        : [...prev, tutorId]
    );
  };

  const selectAllTutors = () => {
    setSelectedTutors(eligibleTutors.map(t => t.tutor_id));
  };

  const deselectAllTutors = () => {
    setSelectedTutors([]);
  };

  // ===== TÍNH TOÁN HỌC PHÍ =====
  const parsedMaxStudents = parseInt(formData.max_students, 10);
  const numStudents = Math.min(Math.max(isNaN(parsedMaxStudents) ? 5 : parsedMaxStudents, 1), 5);
  
  const currentTutorConfig = PRICE_LIMITS[tutorLevel] || PRICE_LIMITS["Giáo viên"];
  
  // ✅ QUAN TRỌNG: Xác định đúng config dựa trên số học sinh
  let priceConfigKey = 'lessThan3';
  let divNum = 1;
  
  if (numStudents >= 3 && numStudents <= 5) {
    priceConfigKey = 'group3to5';
    divNum = numStudents;
  } else {
    priceConfigKey = 'lessThan3';
    divNum = 1;
  }
  
  // Lấy config gốc
  const baseConfig = currentTutorConfig[priceConfigKey]?.[formData.level];
  
  let currentPriceConfig = null;
  if (baseConfig) {
    if (numStudents >= 3) {
      // Chia đều cho số học sinh
      const calculatedMin = roundToThousand(baseConfig.min / numStudents);
      const calculatedMax = roundToThousand(baseConfig.max / numStudents);
      currentPriceConfig = {
        min: calculatedMin,
        max: calculatedMax,
        label: `${calculatedMin.toLocaleString("vi-VN")}đ - ${calculatedMax.toLocaleString("vi-VN")}đ / buổi / HS`,
      };
    } else {
      currentPriceConfig = {
        min: baseConfig.min,
        max: baseConfig.max,
        label: baseConfig.label,
      };
    }
  }

  const currentRate = parseInt(formData.price_per_session || 0, 10);
  const priceError = (currentPriceConfig && (currentRate < currentPriceConfig.min || currentRate > currentPriceConfig.max))
    ? `⚠️ Mức phí cho ${formData.level} (${tutorLevel} - ${numStudents >= 3 ? `Lớp ${numStudents} HS: Giá 1 kèm 1 / ${numStudents}` : "Lớp < 3 HS"}) phải nằm trong khoảng: ${currentPriceConfig.label}`
    : "";

  // Tính toán chi phí
  const daysPerWeekCount = formData.schedule_days.length;
  const totalWeeksCount = parseInt(formData.total_weeks || 0, 10);
  const totalCourseSessions = daysPerWeekCount * totalWeeksCount;
  const monthlySessionsCount = daysPerWeekCount * 4;
  
  const monthlyFeePerStudent = currentRate * monthlySessionsCount;
  const totalFeePerStudent = currentRate * totalCourseSessions;
  const totalCourseGrossRevenue = currentRate * totalCourseSessions * numStudents;
  const platformFeeAmount = totalCourseGrossRevenue * 0.35;
  const totalCourseNetEstimateBenefit = totalCourseGrossRevenue * 0.65;
  const totalMonthsCount = totalWeeksCount > 0 ? totalWeeksCount / 4 : 1;
  const monthlyNetEarnings = totalCourseNetEstimateBenefit / totalMonthsCount;
  const minMonthlyNetPerStudent = (monthlyFeePerStudent * 0.65);
  const hoursPerSession = 2;

  // Create class: mỗi tutor được chọn → 1 mã lớp riêng (1-1 assignment)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    if (priceError) {
      alert(`⚠️ ${priceError}`);
      return;
    }

    if (!showTutorList) {
      alert('🔍 Vui lòng bấm "Tìm Tutor phù hợp" trước khi tạo lớp');
      return;
    }

    if (selectedTutors.length === 0) {
      alert('👨‍🏫 Vui lòng chọn ít nhất 1 tutor để gửi đề xuất');
      return;
    }

    setLoading(true);
    try {
      const numSections = selectedTutors.length; // Số mã lớp = số tutor đã chọn
      const parentCourseId = `course_${Date.now()}`;

      let successCount = 0;

      // Mỗi tutor được chỉ định 1 mã lớp riêng theo thứ tự
      for (let i = 0; i < numSections; i++) {
        const assignedTutorId = selectedTutors[i];
        const sectionSuffix = numSections > 1 ? ` - Nhóm ${i + 1}` : '';

        const coursePayload = {
          course_id: `${parentCourseId}_sec${i + 1}`,
          parent_course_id: parentCourseId,
          class_name: `${formData.title}${sectionSuffix}`,
          title: `${formData.title}${sectionSuffix}`,
          category_id: formData.category_id,
          level: formData.level,
          description: formData.description,
          max_students: numStudents,
          min_students: 2,
          price_per_session: currentRate,
          start_date: formData.start_date,
          total_weeks: totalWeeksCount,
          schedule_days: formData.schedule_days,
          time_slot: `${formData.start_time}-${formData.end_time}`,
          thumbnail: formData.thumbnail,
          status: 'pending_tutor',
          created_by: 'admin_01',
          tutor_id: null,
          tutor_assigned_at: null,
          students: [],
          permanent_room_url: `/room/${parentCourseId}_sec${i + 1}`,
          created_at: new Date().toISOString(),
        };

        const createRes = await fetch(`${API_BASE}/courses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(coursePayload),
        });

        if (createRes.ok) {
          const createdCourse = await createRes.json();

          // Gửi đề xuất chỉ đến đúng 1 tutor được chỉ định cho mã lớp này
          await fetch('/api/admin/classes/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: createdCourse.course_id,
              tutorIds: [assignedTutorId],
            }),
          });

          successCount++;
        }
      }

      if (successCount === numSections) {
        alert(`✅ Đã tạo thành công ${numSections} mã lớp!\nMỗi mã lớp đã được gửi đề xuất đến 1 Tutor riêng.`);
        router.push('/admin-classes-management');
      } else if (successCount > 0) {
        alert(`⚠️ Chỉ tạo được ${successCount}/${numSections} mã lớp.`);
        router.push('/admin-classes-management');
      } else {
        throw new Error('Không thể tạo mã lớp nào.');
      }
    } catch (error) {
      console.error('Lỗi tạo lớp:', error);
      alert('❌ Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render bảng giá
  const renderPriceTable = () => {
    const levels = ["Cấp 1", "Cấp 2", "Cấp 3"];
    const divNum = numStudents >= 3 ? numStudents : 2;

    return (
      <div className={styles.priceRegulationTableBox}>
        <div className={styles.priceRegulationHeader}>
          <span>Khung giá quy định hệ thống ({tutorLevel})</span>
        </div>
        <table className={styles.priceTable}>
          <thead>
            <tr>
              <th>Cấp học</th>
              <th>Lớp 1 - 2 học sinh (1-1)</th>
              <th>Lớp 3 - 5 học sinh (Chia đều {divNum} HS)</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((lvl) => {
              const cfgLess = PRICE_LIMITS[tutorLevel]?.lessThan3?.[lvl];
              const cfgGroup = PRICE_LIMITS[tutorLevel]?.group3to5?.[lvl];
              
              let dividedLabel = "-";
              if (cfgGroup) {
                const minDiv = roundToThousand(cfgGroup.min / divNum);
                const maxDiv = roundToThousand(cfgGroup.max / divNum);
                dividedLabel = `${minDiv.toLocaleString("vi-VN")}đ - ${maxDiv.toLocaleString("vi-VN")}đ / buổi / HS`;
              }
              
              const isCurrentLvl = formData.level === lvl;
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
    );
  };

  // Kiểm tra form có đủ điều kiện để submit
  const isFormValid = () => {
    return (
      formData.title?.trim() !== '' &&
      formData.category_id !== '' &&
      formData.price_per_session !== '' && Number(formData.price_per_session) > 0 &&
      formData.start_date !== '' &&
      formData.schedule_days.length > 0 &&
      formData.description?.trim() !== '' &&
      Number(formData.total_weeks) > 0 &&
      !priceError &&
      showTutorList &&
      selectedTutors.length > 0
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerCreate}>
        <h1>📚 Tạo lớp học mới</h1>
        <p>Admin tạo lớp và gửi đề xuất cho Tutor phù hợp</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.formLayout}>
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
          {/* Thông tin chung */}
          <section className={styles.card}>
            <h2>Thông tin lớp học</h2>

            <div className={styles.formGroup}>
              <label>Tên lớp học <span className={styles.required}>*</span></label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="VD: Lớp ôn thi THPT QG môn Toán"
                className={errors.title ? styles.inputError : ''}
              />
              {errors.title && <span className={styles.errorText}>{errors.title}</span>}
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label>Môn học <span className={styles.required}>*</span></label>
                {formData.level === "Cấp 1" ? (
                  <select 
                    value="cap1_homework" 
                    disabled 
                    className={styles.disabledSelect}
                  >
                    <option value="cap1_homework">Hỗ trợ bài tập về nhà các môn học</option>
                  </select>
                ) : (
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    className={errors.category_id ? styles.inputError : ''}
                  >
                    {categories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.category_id && <span className={styles.errorText}>{errors.category_id}</span>}
                {formData.level === "Cấp 1" && (
                  <p className={styles.hintText}>📌 Cấp 1: Chỉ hỗ trợ bài tập về nhà các môn học</p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Cấp học <span className={styles.required}>*</span></label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                >
                  <option value="Cấp 1">Cấp 1</option>
                  <option value="Cấp 2">Cấp 2</option>
                  <option value="Cấp 3">Cấp 3</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Yêu cầu trình độ Gia sư <span className={styles.required}>*</span></label>
              <select
                value={tutorLevel}
                onChange={(e) => setTutorLevel(e.target.value)}
                className={styles.select}
              >
                <option value="Sinh viên">Sinh viên</option>
                <option value="Giáo viên">Giáo viên</option>
              </select>
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label>Số lượng học sinh tối đa (1 - 5 HS) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.max_students}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setFormData(prev => ({ ...prev, max_students: "" }));
                      return;
                    }
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) {
                      setFormData(prev => ({ ...prev, max_students: Math.min(num, 5) }));
                    }
                  }}
                  onBlur={() => {
                    if (formData.max_students === "" || parseInt(formData.max_students, 10) < 1) {
                      setFormData(prev => ({ ...prev, max_students: 1 }));
                    }
                  }}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Học phí mong muốn (đ / buổi) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  step="10000"
                  min={currentPriceConfig?.min || 0}
                  max={currentPriceConfig?.max || 999999999}
                  value={formData.price_per_session}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_per_session: e.target.value }))}
                  required
                />
                {priceError && (
                  <p className={styles.errorAlert} style={{ marginTop: "8px", fontSize: "13px", padding: "8px 12px" }}>
                    {priceError}
                  </p>
                )}
              </div>
            </div>

            {renderPriceTable()}

            <div className={styles.formGroup}>
              <label>Mô tả nội dung & Phương pháp giảng dạy <span className={styles.required}>*</span></label>
              <textarea
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Chia sẻ mục tiêu lớp học, lộ trình học tập và phương pháp giảng dạy độc đáo của bạn..."
                className={errors.description ? styles.inputError : ''}
              />
              {errors.description && <span className={styles.errorText}>{errors.description}</span>}

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

          {/* Hình ảnh */}
          <section className={styles.card}>
            <h2>🖼️ Hình ảnh đại diện lớp học</h2>
            <p className={styles.subText}>Chọn một hình nền có sẵn để thu hút học sinh.</p>
            
            <div className={styles.imageSelectionArea}>
              <div className={styles.defaultGrid}>
                {DEFAULT_IMAGES.map((imgSrc, index) => (
                  <div 
                    key={index} 
                    className={`${styles.imgWrapper} ${formData.thumbnail === imgSrc ? styles.selectedImg : ""}`}
                    onClick={() => setFormData(prev => ({ ...prev, thumbnail: imgSrc }))}
                  >
                    <Image src={imgSrc} alt={`Mẫu ${index + 1}`} width={90} height={60} style={{ objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Lịch học */}
          <section className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <h2>📅 Lịch học dự kiến</h2>
            </div>

            <div className={styles.formGroup}>
              <label>Lựa chọn hình thức / Lộ trình học <span className={styles.required}>*</span></label>
              <select
                value={formData.course_type}
                onChange={(e) => handleCourseTypeChange(e.target.value)}
              >
                <option value="1_term">Dạy theo 1 kỳ (Quy đổi thành 18 tuần học)</option>
                <option value="2_terms">Dạy theo 2 kỳ (Quy đổi thành 36 tuần học)</option>
                <option value="custom">Dạy riêng lẻ (Tùy chọn số tuần)</option>
              </select>
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label>📅 Ngày bắt đầu <span className={styles.required}>*</span></label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={errors.start_date ? styles.inputError : ''}
                />
                {errors.start_date && <span className={styles.errorText}>{errors.start_date}</span>}
              </div>

              <div className={styles.formGroup}>
                <label>⏳ Số tuần dự kiến <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  min="1"
                  value={formData.total_weeks}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_weeks: parseInt(e.target.value) || 1 }))}
                  disabled={formData.course_type !== "custom"}
                  className={errors.total_weeks ? styles.inputError : ''}
                  required
                />
                {errors.total_weeks && <span className={styles.errorText}>{errors.total_weeks}</span>}
              </div>
            </div>

            <div className={styles.daysSelector}>
              {DAYS_OF_WEEK.map((day) => (
                <button
                  type="button"
                  key={day}
                  className={formData.schedule_days.includes(day) ? styles.activeDay : ""}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className={styles.timePickerContainer}>
              <label className={styles.subLabel}>
                Chọn giờ bắt đầu dạy (Cố định 2 tiếng/buổi)
              </label>
              
              <div className={styles.timePickerRow}>
                <div className={styles.timeInputWrapper}>
                  <span className={styles.timeInputIcon}>Bắt đầu:</span>
                  <select
                    value={formData.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className={styles.timeInput}
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
                    value={formData.end_time}
                    readOnly
                    className={styles.timeInput}
                    style={{ fontWeight: "700", color: "#1e293b", width: "70px", background: "transparent", border: "none" }}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightColumn}>
          <div className={styles.stickyWrapper}>
            {/* Card Tutor Selection */}
            <div className={styles.card}>
              <h2>👨‍🏫 Tutor phù hợp</h2>
              <p className={styles.hint}>
                Hệ thống sẽ tìm các Tutor đã được duyệt, có lịch trống và nhận đề xuất.
              </p>

              <button
                type="button"
                className={styles.checkBtn}
                onClick={fetchEligibleTutors}
                disabled={isCheckingEligible || formData.schedule_days.length === 0}
              >
                {isCheckingEligible ? '⏳ Đang tìm...' : '🔍 Tìm Tutor phù hợp'}
              </button>

              {isCheckingEligible && (
                <div className={styles.loadingState}>Đang kiểm tra lịch trống của Tutor...</div>
              )}

              {showTutorList && (
                <>
                  <div className={styles.tutorStats}>
                    <span>Tìm thấy <strong>{eligibleTutors.length}</strong> Tutor phù hợp</span>
                    <div className={styles.tutorActions}>
                      <button type="button" onClick={selectAllTutors} className={styles.selectAllBtn}>
                        Chọn tất cả
                      </button>
                      <button type="button" onClick={deselectAllTutors} className={styles.deselectAllBtn}>
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div className={styles.tutorList}>
                    {eligibleTutors.length === 0 ? (
                      <p className={styles.noTutor}>Không tìm thấy Tutor phù hợp với lịch học này.</p>
                    ) : (
                      eligibleTutors.map(tutor => (
                        <label key={tutor.tutor_id} className={styles.tutorItem}>
                          <input
                            type="checkbox"
                            checked={selectedTutors.includes(tutor.tutor_id)}
                            onChange={() => toggleTutor(tutor.tutor_id)}
                          />
                          <img
                            src={tutor.avatar || '/img/avt/avt.jpg'}
                            alt={tutor.full_name}
                            className={styles.tutorAvatar}
                          />
                          <div className={styles.tutorInfo}>
                            <span className={styles.tutorName}>{tutor.full_name}</span>
                            <span className={styles.tutorExpertise}>{tutor.expertise || 'Chưa cập nhật'}</span>
                            <span className={styles.tutorRating}>⭐ {tutor.rating || 0}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  <div className={styles.summaryBox}>
                    <p>
                      <strong>Đã chọn:</strong> {selectedTutors.length} Tutor
                      {selectedTutors.length > 0 && (
                        <span className={styles.summaryHighlight}> → Sẽ tạo {selectedTutors.length} mã lớp</span>
                      )}
                    </p>
                    <p className={styles.summaryNote}>
                      💡 Mỗi Tutor được chỉ định <strong>1 mã lớp riêng</strong>.
                      Tutor nhận đề xuất và xác nhận để lớp được kích hoạt.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Bảng tính số tiền */}
            {formData.schedule_days.length > 0 && formData.total_weeks > 0 && formData.price_per_session > 0 && (
              <div className={styles.feeEstimateCard}>
                <h3>💵 Học phí dự kiến</h3>
                <p className={styles.feeSubHeader}>
                  Mức giá này được hiển thị công khai cho phụ huynh và học sinh.
                </p>
                
                <div className={styles.feeDisplay}>
                  <span className={styles.feeLabel}>Học phí 1 buổi:</span>
                  <span className={styles.feeValue}>
                    {currentRate > 0 ? currentRate.toLocaleString("vi-VN") + "đ" : "---"}
                  </span>
                </div>

                <div className={styles.calculationSection}>
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>Số buổi / tuần:</span>
                    <span className={styles.calcValue}>{daysPerWeekCount} buổi</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>Tổng số buổi:</span>
                    <span className={styles.calcValue}>{totalCourseSessions} buổi</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>Số lượng học sinh:</span>
                    <span className={styles.calcValue}>{numStudents} học sinh</span>
                  </div>

                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>Học sinh đóng / tháng:</span>
                    <span className={styles.calcValue}>
                      {monthlyFeePerStudent.toLocaleString("vi-VN") + "đ"}
                    </span>
                  </div>

                  <div className={styles.calcRow} style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed rgba(255, 255, 255, 0.25)" }}>
                    <span className={styles.calcLabel}>Tổng doanh thu ({numStudents} HS):</span>
                    <span className={styles.calcValue}>
                      {totalCourseGrossRevenue.toLocaleString("vi-VN") + "đ"}
                    </span>
                  </div>

                  <div className={styles.calcRow}>
                    <span className={styles.feeSubLabel}>Phí sàn 35%:</span>
                    <span className={styles.feeSubValue}>
                      -{platformFeeAmount.toLocaleString("vi-VN") + "đ"}
                    </span>
                  </div>

                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Tổng tiền thực nhận:</span>
                    <span className={styles.totalValue}>
                      {totalCourseNetEstimateBenefit.toLocaleString("vi-VN") + "đ"}
                    </span>
                  </div>

                  {totalCourseNetEstimateBenefit > 0 && (
                    <div className={styles.calcRow} style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                      <span className={styles.calcLabel}>Thu nhập TB / tháng:</span>
                      <span className={styles.calcValueHighlight}>
                        {Math.round(monthlyNetEarnings).toLocaleString("vi-VN") + "đ"}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.feeNote}>
                  <p>💡 <em>Phí sàn 35% được áp dụng cho toàn bộ doanh thu của khóa học.</em></p>
                </div>
              </div>
            )}

            {/* Tips Card */}
            <div className={styles.tipsCard}>
              <h4>💡 Mẹo dành cho bạn</h4>
              <ul>
                <li><strong>Mỗi Tutor được chọn</strong> sẽ nhận đề xuất và dạy 1 mã lớp riêng biệt.</li>
                <li><strong>Tên lớp rõ ràng</strong> sẽ thu hút học sinh đăng ký tham gia cao gấp 2 lần.</li>
                <li><strong>Mô tả chi tiết</strong> phương pháp dạy học cụ thể giúp phụ huynh an tâm hơn.</li>
              </ul>
            </div>

            {/* Nút submit */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !isFormValid()}
            >
              {loading
                ? '⏳ Đang tạo lớp...'
                : !showTutorList
                  ? '🔍 Vui lòng tìm Tutor trước'
                  : selectedTutors.length === 0
                    ? '⚠️ Vui lòng chọn Tutor'
                    : `✅ Tạo ${selectedTutors.length} mã lớp & gửi đề xuất`
              }
            </button>

            {/* Hiển thị lý do disabled */}
            {!isFormValid() && !loading && (
              <div className={styles.formValidationHint}>
                <p>⚠️ Vui lòng điền đầy đủ thông tin:</p>
                <ul>
                  {!formData.title?.trim() && <li>🔸 Tên lớp học</li>}
                  {!formData.category_id && <li>🔸 Môn học</li>}
                  {(!formData.price_per_session || Number(formData.price_per_session) <= 0) && <li>🔸 Học phí</li>}
                  {!formData.start_date && <li>🔸 Ngày bắt đầu</li>}
                  {formData.schedule_days.length === 0 && <li>🔸 Ngày trong tuần</li>}
                  {!formData.description?.trim() && <li>🔸 Mô tả lớp học</li>}
                  {(!formData.total_weeks || Number(formData.total_weeks) <= 0) && <li>🔸 Số tuần học</li>}
                  {!showTutorList && <li>🔸 Tìm Tutor phù hợp</li>}
                  {showTutorList && selectedTutors.length === 0 && <li>🔸 Chọn ít nhất 1 Tutor</li>}
                  {priceError && <li>🔸 {priceError.substring(0, 50)}...</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}