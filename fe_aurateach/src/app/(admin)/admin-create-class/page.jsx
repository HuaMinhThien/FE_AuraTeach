// src/app/(admin)/admin-create-class/page.jsx

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './admin-create-class.module.css';

import { categoryService } from '@/services/categoryService';
import { courseService } from '@/services/courseService';
import { adminService } from '@/services/adminService';

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

const TUTOR_SALARY_LIMITS = {
  "Giáo viên": {
    "Cấp 1": { min: 120000, max: 180000, label: "120.000đ - 180.000đ / buổi" },
    "Cấp 2": { min: 150000, max: 220000, label: "150.000đ - 220.000đ / buổi" },
    "Cấp 3": { min: 180000, max: 280000, label: "180.000đ - 280.000đ / buổi" },
  },
  "Sinh viên": {
    "Cấp 1": { min: 70000, max: 110000, label: "70.000đ - 110.000đ / buổi" },
    "Cấp 2": { min: 80000, max: 130000, label: "80.000đ - 130.000đ / buổi" },
    "Cấp 3": { min: 100000, max: 160000, label: "100.000đ - 160.000đ / buổi" },
  },
};

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const START_TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const hour = 7 + i;
  return `${hour < 10 ? '0' : ''}${hour}:00`;
});

const MAX_SLOTS = 5;

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
    tutor_salary_per_session: '',
    start_date: '',
    total_weeks: 12,
    schedule_days: [],
    start_time: '07:00',
    end_time: '09:00',
    thumbnail: DEFAULT_IMAGES[0],
    min_students: 3,
    course_type: '1_term',
  });

  const [errors, setErrors] = useState({});

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getCategories();
        const data = Array.isArray(res) ? res : (res?.data || []);
        setCategories(data);
        if (data.length > 0) {
          const isCap1 = formData.level === 'Cấp 1';
          setFormData(prev => ({
            ...prev,
            category_id: isCap1 ? 'cap1_homework' : (data[0].category_id || data[0].id)
          }));
        }
      } catch (error) {
        console.error('Lỗi lấy categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Khi level thay đổi, điều chỉnh category_id
  useEffect(() => {
    if (formData.level === 'Cấp 1') {
      setFormData(prev => ({ ...prev, category_id: 'cap1_homework' }));
    } else {
      if (!formData.category_id || formData.category_id === 'cap1_homework') {
        if (categories.length > 0) {
          setFormData(prev => ({ ...prev, category_id: categories[0].category_id || categories[0].id }));
        }
      }
    }
  }, [formData.level, categories]);

  const parsedMaxStudents = parseInt(formData.max_students, 10);
  const numStudents = Math.min(Math.max(isNaN(parsedMaxStudents) ? 5 : parsedMaxStudents, 1), 5);

  // Tự động tính lương tutor: Lương = Học phí HS * 2
  useEffect(() => {
    const tuition = parseInt(formData.price_per_session || 0, 10);
    if (tuition > 0) {
      setFormData(prev => ({ ...prev, tutor_salary_per_session: tuition * 2 }));
    } else {
      const cfgGroup = PRICE_LIMITS[tutorLevel]?.group3to5?.[formData.level];
      if (cfgGroup) {
        const minTuitionPerStudent = roundToThousand(cfgGroup.min / numStudents);
        setFormData(prev => ({ ...prev, tutor_salary_per_session: minTuitionPerStudent * 2 }));
      }
    }
  }, [formData.level, tutorLevel, formData.price_per_session, numStudents]);

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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCourseTypeChange = (type) => {
    let weeks = formData.total_weeks;
    if (type === '1_term') weeks = 18;
    else if (type === '2_terms') weeks = 36;
    else weeks = 2;
    setFormData(prev => ({ ...prev, course_type: type, total_weeks: weeks }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Vui lòng nhập tên lớp';
    if (!formData.category_id) newErrors.category_id = 'Vui lòng chọn môn học';
    if (!formData.price_per_session || Number(formData.price_per_session) <= 0)
      newErrors.price_per_session = 'Vui lòng nhập học phí hợp lệ';
    if (!formData.tutor_salary_per_session || Number(formData.tutor_salary_per_session) <= 0)
      newErrors.tutor_salary_per_session = 'Vui lòng nhập lương Tutor hợp lệ';
    if (!formData.start_date) newErrors.start_date = 'Vui lòng chọn ngày bắt đầu';
    if (formData.schedule_days.length === 0)
      newErrors.schedule_days = 'Vui lòng chọn ít nhất 1 ngày trong tuần';
    if (!formData.description.trim())
      newErrors.description = 'Vui lòng nhập mô tả lớp học';
    if (!formData.total_weeks || Number(formData.total_weeks) <= 0)
      newErrors.total_weeks = 'Vui lòng nhập số tuần học hợp lệ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Tìm gia sư phù hợp qua Next.js API route → proxy sang Laravel BE
  const fetchEligibleTutors = async () => {
    if (formData.schedule_days.length === 0) {
      alert('Vui lòng chọn ngày học trước khi tìm Tutor!');
      return;
    }
    setIsCheckingEligible(true);
    try {
      const courseData = {
        category_id: formData.category_id,
        level: tutorLevel,        // BE đọc field 'level', không phải 'tutor_level'
        tutor_level: tutorLevel,  // giữ lại để backward-compat với classSuggestionService
        schedule_days: formData.schedule_days,
        time_slot: `${formData.start_time}-${formData.end_time}`,
      };

      // Lấy token từ localStorage để truyền lên API route
      const token =
        (typeof window !== 'undefined' && (
          localStorage.getItem('access_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('user_token')
        )) || '';

      const res = await fetch('/api/admin/classes/eligible-tutors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course: courseData }),
      });
      const result = await res.json();

      if (result.success) {
        setEligibleTutors(result.data || []);
        setSelectedTutors((result.data || []).slice(0, MAX_SLOTS).map(t => t.tutor_id));
        setShowTutorList(true);
      } else {
        alert('Không thể tìm tutor phù hợp: ' + (result.message || 'Lỗi không xác định'));
      }
    } catch (error) {
      console.error('Lỗi tìm tutor:', error);
      alert('Có lỗi xảy ra khi tìm tutor phù hợp');
    } finally {
      setIsCheckingEligible(false);
    }
  };

  const toggleTutor = (tutorId) => {
    setSelectedTutors(prev => {
      if (prev.includes(tutorId)) return prev.filter(id => id !== tutorId);
      if (prev.length >= MAX_SLOTS) return prev;
      return [...prev, tutorId];
    });
  };

  const selectAllTutors = () => {
    setSelectedTutors(eligibleTutors.slice(0, MAX_SLOTS).map(t => t.tutor_id));
  };

  const deselectAllTutors = () => setSelectedTutors([]);

  // Tính toán giá
  const currentTutorConfig = PRICE_LIMITS[tutorLevel] || PRICE_LIMITS["Giáo viên"];
  const priceConfigKey = numStudents >= 3 ? 'group3to5' : 'lessThan3';
  const baseConfig = currentTutorConfig[priceConfigKey]?.[formData.level];

  let currentPriceConfig = null;
  if (baseConfig) {
    if (numStudents >= 3) {
      const calculatedMin = roundToThousand(baseConfig.min / numStudents);
      const calculatedMax = roundToThousand(baseConfig.max / numStudents);
      currentPriceConfig = {
        min: calculatedMin,
        max: calculatedMax,
        label: `${calculatedMin.toLocaleString("vi-VN")}đ - ${calculatedMax.toLocaleString("vi-VN")}đ / buổi / HS`,
      };
    } else {
      currentPriceConfig = { min: baseConfig.min, max: baseConfig.max, label: baseConfig.label };
    }
  }

  const currentRate = parseInt(formData.price_per_session || 0, 10);
  const priceError = (currentPriceConfig && currentRate > 0 && (currentRate < currentPriceConfig.min || currentRate > currentPriceConfig.max))
    ? `⚠️ Mức phí cho ${formData.level} (${tutorLevel} - ${numStudents >= 3 ? `Lớp ${numStudents} HS: Giá 1 kèm 1 / ${numStudents}` : "Lớp < 3 HS"}) phải nằm trong khoảng: ${currentPriceConfig.label}`
    : "";

  const tutorSalaryPerSession = parseInt(formData.tutor_salary_per_session || 0, 10);

  const daysPerWeekCount = formData.schedule_days.length;
  const totalWeeksCount = parseInt(formData.total_weeks || 0, 10);
  const totalCourseSessions = daysPerWeekCount * totalWeeksCount;
  const monthlySessionsCount = daysPerWeekCount * 4;
  const monthlyFeePerStudent = currentRate * monthlySessionsCount;
  const totalCourseGrossRevenue = currentRate * totalCourseSessions * numStudents;
  const totalMonthsCount = totalWeeksCount > 0 ? totalWeeksCount / 4 : 1;
  const totalTutorSalary = tutorSalaryPerSession * totalCourseSessions;
  const monthlyTutorSalary = tutorSalaryPerSession * monthlySessionsCount;
  const platformNetProfit = totalCourseGrossRevenue - totalTutorSalary;
  const monthlyPlatformNetProfit = (totalCourseGrossRevenue / (totalMonthsCount || 1)) - monthlyTutorSalary;

  // Submit: tạo class_request chung → gửi suggest qua API route
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
      alert('Vui lòng bấm "Tìm Tutor phù hợp" trước khi tạo lớp');
      return;
    }
    if (selectedTutors.length === 0) {
      alert('👨‍🏫 Vui lòng chọn ít nhất 1 tutor để gửi đề xuất');
      return;
    }

    setLoading(true);
    try {
      const parentCourseId = `course_${Date.now()}`;

      // Tạo đúng MAX_SLOTS (5) course records trên BE
      const createdCourseIds = [];
      for (let slot = 1; slot <= MAX_SLOTS; slot++) {
        const coursePayload = {
          parent_course_id: parentCourseId,
          title: `${formData.title} - Nhóm ${slot}`,
          category_id: formData.category_id,
          level: formData.level,
          description: formData.description,
          max_students: numStudents,
          min_students: 3,
          price_per_session: currentRate,
          tutor_salary_per_session: tutorSalaryPerSession,
          start_date: formData.start_date,
          total_weeks: totalWeeksCount,
          schedule_days: formData.schedule_days,
          time_slot: `${formData.start_time}-${formData.end_time}`,
          start_time: `${formData.start_time}:00`,
          end_time: `${formData.end_time}:00`,
          thumbnail: formData.thumbnail,
          status: 'pending_tutor',
          tutor_id: null,
          slot_number: slot,
          created_by: 'admin_system',
        };

        try {
          const created = await courseService.createCourse(coursePayload);
          const createdData = created?.data || created;
          const newCourseId = createdData?.course_id || createdData?.id;
          if (newCourseId) createdCourseIds.push(newCourseId);
        } catch (err) {
          console.error(`Lỗi tạo slot ${slot}:`, err);
        }
      }

      if (createdCourseIds.length === 0) {
        throw new Error('Không thể tạo mã lớp nào.');
      }

      // Gửi đề xuất cho tất cả tutors được chọn, cho tất cả course IDs
      for (const courseId of createdCourseIds) {
        try {
          await fetch('/api/admin/classes/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, tutorIds: selectedTutors }),
          });
        } catch (err) {
          console.error(`Lỗi gửi đề xuất cho course ${courseId}:`, err);
        }
      }

      alert(
        `✅ Đã tạo thành công ${createdCourseIds.length} mã lớp!\n` +
        `📩 Đã gửi đề xuất đến ${selectedTutors.length} Tutor.\n\n` +
        `Gia sư xác nhận sớm nhất → Nhóm 1, tiếp theo → Nhóm 2…\n` +
        `Từ gia sư thứ 6 trở lên: hệ thống hiện "Lớp đã có đủ gia sư".`
      );
      router.push('/admin-classes-management');
    } catch (error) {
      console.error('Lỗi tạo lớp:', error);
      alert('❌ Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPriceTable = () => {
    const levels = ["Cấp 1", "Cấp 2", "Cấp 3"];
    const divNum = numStudents >= 3 ? numStudents : 5;
    return (
      <div className={styles.priceRegulationTableBox}>
        <div className={styles.priceRegulationHeader}>
          <span>Khung giá quy định hệ thống ({tutorLevel})</span>
        </div>
        <table className={styles.priceTable}>
          <thead>
            <tr>
              <th>Cấp học</th>
              <th>Học phí (3 - 5 HS, chia đều {divNum} HS)</th>
              <th className={styles.salaryCol}>Lương gia sư</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((lvl) => {
              const cfgGroup = PRICE_LIMITS[tutorLevel]?.group3to5?.[lvl];
              let dividedLabel = "-";
              let formulaSalaryLabel = "-";
              if (cfgGroup) {
                const minDiv = roundToThousand(cfgGroup.min / divNum);
                const maxDiv = roundToThousand(cfgGroup.max / divNum);
                dividedLabel = `${minDiv.toLocaleString("vi-VN")}đ - ${maxDiv.toLocaleString("vi-VN")}đ / buổi / HS`;
                formulaSalaryLabel = `${(minDiv * 2).toLocaleString("vi-VN")}đ - ${(maxDiv * 2).toLocaleString("vi-VN")}đ / buổi`;
              }
              return (
                <tr key={lvl} className={formData.level === lvl ? styles.activeTableRow : ""}>
                  <td><strong>{lvl}</strong></td>
                  <td>{dividedLabel}</td>
                  <td className={styles.salaryCol}>{formulaSalaryLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const isFormValid = () => (
    formData.title?.trim() !== '' &&
    formData.category_id !== '' &&
    formData.price_per_session !== '' && Number(formData.price_per_session) > 0 &&
    formData.tutor_salary_per_session !== '' && Number(formData.tutor_salary_per_session) > 0 &&
    formData.start_date !== '' &&
    formData.schedule_days.length > 0 &&
    formData.description?.trim() !== '' &&
    Number(formData.total_weeks) > 0 &&
    !priceError &&
    showTutorList &&
    selectedTutors.length > 0
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerCreate}>
        <h1>Tạo lớp học mới</h1>
        <p>Admin tạo lớp và gửi đề xuất cho Tutor phù hợp</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.formLayout}>
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
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
                  <select value="cap1_homework" disabled className={styles.disabledSelect}>
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
                      <option key={cat.category_id || cat.id} value={cat.category_id || cat.id}>
                        {cat.category_name || cat.name}
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
                <select name="level" value={formData.level} onChange={handleChange}>
                  <option value="Cấp 1">Cấp 1</option>
                  <option value="Cấp 2">Cấp 2</option>
                  <option value="Cấp 3">Cấp 3</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Yêu cầu trình độ Gia sư <span className={styles.required}>*</span></label>
              <select value={tutorLevel} onChange={(e) => setTutorLevel(e.target.value)}>
                <option value="Sinh viên">Sinh viên</option>
                <option value="Giáo viên">Giáo viên</option>
              </select>
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label>Số lượng học sinh tối đa (3 - 5 HS) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  min="3"
                  max="5"
                  value={formData.max_students}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") { setFormData(prev => ({ ...prev, max_students: "" })); return; }
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) setFormData(prev => ({ ...prev, max_students: Math.min(Math.max(num, 3), 5) }));
                  }}
                  onBlur={() => {
                    if (formData.max_students === "" || parseInt(formData.max_students, 10) < 3)
                      setFormData(prev => ({ ...prev, max_students: 3 }));
                  }}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Học phí mong muốn (đ / buổi) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  step="1000"
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

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label>Lương Tutor cố định (đ / buổi) <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  step="10000"
                  min="0"
                  value={formData.tutor_salary_per_session}
                  onChange={(e) => setFormData(prev => ({ ...prev, tutor_salary_per_session: e.target.value }))}
                  className={errors.tutor_salary_per_session ? styles.inputError : ''}
                  required
                />
                {errors.tutor_salary_per_session && <span className={styles.errorText}>{errors.tutor_salary_per_session}</span>}
                <p className={styles.hintText}>Áp dụng công thức: Lương = Học phí 1 HS × 2</p>
              </div>

              <div className={styles.formGroup}>
                <label>Sàn chi trả lương (tổng khoá học)</label>
                <div className={styles.salaryReadonlyBox}>
                  {tutorSalaryPerSession > 0 && totalCourseSessions > 0 ? (
                    <>
                      <span className={styles.salaryReadonlyValue}>
                        {(tutorSalaryPerSession * totalCourseSessions).toLocaleString("vi-VN")}đ
                      </span>
                      <span className={styles.salaryReadonlyNote}>
                        = {tutorSalaryPerSession.toLocaleString("vi-VN")}đ × {totalCourseSessions} buổi
                      </span>
                    </>
                  ) : (
                    <span className={styles.salaryReadonlyPlaceholder}>Tự động tính khi nhập đủ</span>
                  )}
                </div>
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
                placeholder="Chia sẻ mục tiêu lớp học, lộ trình học tập và phương pháp giảng dạy..."
                className={errors.description ? styles.inputError : ''}
              />
              {errors.description && <span className={styles.errorText}>{errors.description}</span>}
              <div className={styles.descriptionSuggestionBox}>
                <div className={styles.suggestionTitle}>Gợi ý cấu trúc 1 buổi học hiệu quả:</div>
                <ul className={styles.suggestionList}>
                  <li><strong>Mở đầu (10 - 15 phút):</strong> Ôn tập kiến thức bài cũ, giải đáp thắc mắc bài tập về nhà.</li>
                  <li><strong>Nội dung chính (60 - 70 phút):</strong> Giảng dạy lý thuyết bài mới, hướng dẫn ví dụ minh họa và cho học sinh thực hành.</li>
                  <li><strong>Tổng kết (10 - 15 phút):</strong> Tóm tắt trọng tâm, giao bài tập về nhà và dặn dò chuẩn bị.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Hình ảnh */}
          <section className={styles.card}>
            <h2>Hình ảnh đại diện lớp học</h2>
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
              <h2>Lịch học dự kiến</h2>
            </div>

            <div className={styles.formGroup}>
              <label>Lựa chọn hình thức / Lộ trình học <span className={styles.required}>*</span></label>
              <select value={formData.course_type} onChange={(e) => handleCourseTypeChange(e.target.value)}>
                <option value="1_term">Dạy theo 1 kỳ (Quy đổi thành 18 tuần học)</option>
                <option value="2_terms">Dạy theo 2 kỳ (Quy đổi thành 36 tuần học)</option>
                <option value="custom">Dạy riêng lẻ (Tùy chọn số tuần)</option>
              </select>
            </div>

            <div className={styles.rowGrid}>
              <div className={styles.formGroup}>
                <label>Ngày bắt đầu <span className={styles.required}>*</span></label>
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
                <label>Số tuần dự kiến <span className={styles.required}>*</span></label>
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
              <label className={styles.subLabel}>Chọn giờ bắt đầu dạy (Cố định 2 tiếng/buổi)</label>
              <div className={styles.timePickerRow}>
                <div className={styles.timeInputWrapper}>
                  <span className={styles.timeInputIcon}>Bắt đầu:</span>
                  <select
                    value={formData.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className={styles.timeInput}
                  >
                    {START_TIME_OPTIONS.map((timeOption) => (
                      <option key={timeOption} value={timeOption}>{timeOption}</option>
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
              <h2>Tutor phù hợp</h2>
              <p className={styles.hint}>
                Hệ thống sẽ tìm các Tutor đã được duyệt, có lịch trống và nhận đề xuất.
              </p>

              <button
                type="button"
                className={styles.checkBtn}
                onClick={fetchEligibleTutors}
                disabled={isCheckingEligible || formData.schedule_days.length === 0}
              >
                {isCheckingEligible ? 'Đang tìm...' : 'Tìm Tutor phù hợp'}
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
                        Chọn tối đa {MAX_SLOTS}
                      </button>
                      <button type="button" onClick={deselectAllTutors} className={styles.deselectAllBtn}>
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div className={styles.slotInfoBanner}>
                    <span className={styles.slotInfoIcon}>ℹ️</span>
                    <span>
                      Hệ thống luôn tạo <strong>5 mã lớp</strong> (Nhóm 1 → 5).
                      Gia sư xác nhận sớm nhất nhận <strong>Nhóm 1</strong>, tiếp theo nhận Nhóm 2… đến Nhóm 5.
                      Từ gia sư thứ 6 trở lên sẽ thấy <em>"Lớp đã có đủ gia sư"</em>.
                    </span>
                  </div>

                  {selectedTutors.length >= MAX_SLOTS && (
                    <div className={styles.maxTutorWarning}>
                      ⚠️ Đã đạt giới hạn {MAX_SLOTS} Tutor. Bỏ chọn để thay thế.
                    </div>
                  )}

                  <div className={styles.tutorList}>
                    {eligibleTutors.length === 0 ? (
                      <p className={styles.noTutor}>Không tìm thấy Tutor phù hợp với lịch học này.</p>
                    ) : (
                      eligibleTutors.map((tutor) => {
                        const isChecked = selectedTutors.includes(tutor.tutor_id);
                        const slotIndex = selectedTutors.indexOf(tutor.tutor_id);
                        const isDisabled = !isChecked && selectedTutors.length >= MAX_SLOTS;
                        return (
                          <label
                            key={tutor.tutor_id}
                            className={`${styles.tutorItem} ${isDisabled ? styles.tutorItemDisabled : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleTutor(tutor.tutor_id)}
                              disabled={isDisabled}
                            />
                            <img
                              src={tutor.avatar || '/img/avt/avt.jpg'}
                              alt={tutor.full_name}
                              className={styles.tutorAvatar}
                              onError={(e) => { e.target.src = '/img/avt/avt.jpg'; }}
                            />
                            <div className={styles.tutorInfo}>
                              <span className={styles.tutorName}>{tutor.full_name || 'Gia sư'}</span>
                              <span className={styles.tutorExpertise}>{tutor.expertise || 'Chưa cập nhật'}</span>
                              <span className={styles.tutorRating}>⭐ {tutor.rating || 0}</span>
                            </div>
                            {isChecked && (
                              <span className={styles.slotBadge}>Nhóm {slotIndex + 1}</span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className={styles.summaryBox}>
                    <p>
                      <strong>Đã chọn:</strong> {selectedTutors.length}/{MAX_SLOTS} Tutor
                      {selectedTutors.length > 0 && (
                        <span className={styles.summaryHighlight}> → Luôn tạo {MAX_SLOTS} mã lớp</span>
                      )}
                    </p>
                    <p className={styles.summaryNote}>
                      Tất cả Tutor được chọn đều nhận đề xuất cho <strong>cả 5 mã lớp</strong>.
                      Ai xác nhận trước sẽ được gán vào Nhóm có số thứ tự thấp nhất còn trống.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Fee Estimate Card */}
            {formData.schedule_days.length > 0 && formData.total_weeks > 0 && formData.price_per_session > 0 && (
              <div className={styles.feeEstimateCard}>
                <h3>Học phí dự kiến</h3>
                <p className={styles.feeSubHeader}>
                  Mức giá này được hiển thị công khai cho phụ huynh và học sinh.
                </p>
                <div className={styles.feeDisplay}>
                  <span className={styles.feeLabel}>Học phí 1 buổi / học sinh:</span>
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
                    <span className={styles.calcLabel}>Số học sinh:</span>
                    <span className={styles.calcValue}>{numStudents} học sinh</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>HS đóng / tháng:</span>
                    <span className={styles.calcValue}>{monthlyFeePerStudent.toLocaleString("vi-VN")}đ</span>
                  </div>
                  <div className={styles.calcRow} style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.25)" }}>
                    <span className={styles.calcLabel}>Tổng doanh thu ({numStudents} HS):</span>
                    <span className={styles.calcValue}>{totalCourseGrossRevenue.toLocaleString("vi-VN")}đ</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span className={styles.feeSubLabel}>Lương Tutor / buổi:</span>
                    <span className={styles.salarySubValue}>
                      {tutorSalaryPerSession > 0 ? tutorSalaryPerSession.toLocaleString("vi-VN") + "đ" : <em style={{ color: "#94a3b8" }}>Chưa nhập</em>}
                    </span>
                  </div>
                  {tutorSalaryPerSession > 0 && (
                    <div className={styles.calcRow}>
                      <span className={styles.feeSubLabel}>Tổng lương Tutor (khoá):</span>
                      <span className={styles.salarySubValue}>-{totalTutorSalary.toLocaleString("vi-VN")}đ</span>
                    </div>
                  )}
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Lợi nhuận sàn (khoá):</span>
                    <span className={styles.totalValue}>
                      {tutorSalaryPerSession > 0 ? platformNetProfit.toLocaleString("vi-VN") + "đ" : "---"}
                    </span>
                  </div>
                  {tutorSalaryPerSession > 0 && (
                    <>
                      <div className={styles.calcRow} style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                        <span className={styles.calcLabel}>Lợi nhuận sàn / tháng:</span>
                        <span className={styles.calcValueHighlight}>{Math.round(monthlyPlatformNetProfit).toLocaleString("vi-VN")}đ</span>
                      </div>
                      <div className={styles.calcRow}>
                        <span className={styles.calcLabel}>Lương Tutor / tháng:</span>
                        <span className={styles.salaryMonthlyValue}>{monthlyTutorSalary.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.feeNote}>
                  <p><em>Sàn thu toàn bộ học phí từ học sinh, sau đó trả lương cố định cho Tutor theo buổi.</em></p>
                </div>
              </div>
            )}

            {/* Tips Card */}
            <div className={styles.tipsCard}>
              <h4>Cơ chế phân slot gia sư</h4>
              <ul>
                <li><strong>5 mã lớp cố định</strong> (Nhóm 1 → 5) được tạo ngay khi admin xác nhận.</li>
                <li><strong>Tất cả gia sư được chọn</strong> đều nhận đề xuất cho cả 5 mã lớp.</li>
                <li>Gia sư <strong>xác nhận sớm nhất</strong> → Nhóm 1, tiếp theo → Nhóm 2…</li>
                <li>Từ gia sư thứ 6 trở lên: hệ thống hiện <em>"Lớp đã có đủ gia sư"</em>.</li>
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !isFormValid()}
            >
              {loading ? 'Đang tạo lớp...'
                : !showTutorList ? 'Vui lòng tìm Tutor trước'
                : selectedTutors.length === 0 ? 'Vui lòng chọn Tutor'
                : `Tạo ${MAX_SLOTS} mã lớp & gửi đề xuất (${selectedTutors.length} Tutor)`}
            </button>

            {!isFormValid() && !loading && (
              <div className={styles.formValidationHint}>
                <p>⚠️ Vui lòng điền đầy đủ thông tin:</p>
                <ul>
                  {!formData.title?.trim() && <li>🔸 Tên lớp học</li>}
                  {!formData.category_id && <li>🔸 Môn học</li>}
                  {(!formData.price_per_session || Number(formData.price_per_session) <= 0) && <li>🔸 Học phí</li>}
                  {(!formData.tutor_salary_per_session || Number(formData.tutor_salary_per_session) <= 0) && <li>🔸 Lương Tutor / buổi</li>}
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
