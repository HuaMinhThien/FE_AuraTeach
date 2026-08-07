"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const API_BASE = "http://localhost:3007";

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

export default function AdminCreateClass() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    category_id: "",
    level: "Cấp 1",
    description: "",
    price_per_session: 150000,
    schedule_days: [],
    time_slot: "18:00-20:00",
    start_date: "",
    total_weeks: 12,
    min_students: 2,
    max_students: 5,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`);
        const data = await res.json();
        setCategories(data || []);
      } catch (error) {
        console.error("Lỗi lấy danh mục:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Vui lòng nhập tên lớp học");
      setLoading(false);
      return;
    }

    if (!formData.category_id) {
      setError("Vui lòng chọn môn học");
      setLoading(false);
      return;
    }

    if (!formData.start_date) {
      setError("Vui lòng chọn ngày bắt đầu");
      setLoading(false);
      return;
    }

    if (formData.schedule_days.length === 0) {
      setError("Vui lòng chọn ít nhất 1 ngày học trong tuần");
      setLoading(false);
      return;
    }

    if (formData.min_students > formData.max_students) {
      setError("Số học sinh tối thiểu không được lớn hơn tối đa");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price_per_session: Number(formData.price_per_session),
          total_weeks: Number(formData.total_weeks),
          min_students: Number(formData.min_students),
          max_students: Number(formData.max_students),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess("Tạo lớp thành công! Đang chuyển hướng...");
        setTimeout(() => {
          router.push(`/admin-create-proposal/${result.data.course_id}`);
        }, 1500);
      } else {
        setError(result.message || "Tạo lớp thất bại");
      }
    } catch (error) {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter((d) => d !== day)
        : [...prev.schedule_days, day],
    }));
  };

  const getTodayString = () => {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 7);
    return minDate.toISOString().split("T")[0];
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📚 Tạo lớp học mới</h1>
        <p>Tạo lớp học draft để gửi đề xuất cho Tutor và Student</p>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {success && <div className={styles.alertSuccess}>{success}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.card}>
          <h2>Thông tin lớp học</h2>

          <div className={styles.formGroup}>
            <label>
              Tên lớp học <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="VD: Ôn thi Toán vào 10"
              required
            />
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.formGroup}>
              <label>
                Môn học <span className={styles.required}>*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                required
              >
                <option value="">-- Chọn môn học --</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>
                Cấp học <span className={styles.required}>*</span>
              </label>
              <select
                value={formData.level}
                onChange={(e) =>
                  setFormData({ ...formData, level: e.target.value })
                }
                required
              >
                <option value="Cấp 1">Cấp 1</option>
                <option value="Cấp 2">Cấp 2</option>
                <option value="Cấp 3">Cấp 3</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>
              Học phí (đ/buổi) <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              value={formData.price_per_session}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price_per_session: Number(e.target.value),
                })
              }
              placeholder="150000"
              min="10000"
              step="10000"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Mô tả lớp học</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Mô tả chi tiết về lớp học, mục tiêu, phương pháp giảng dạy..."
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2>📅 Lịch học</h2>

          <div className={styles.formGroup}>
            <label>
              Ngày bắt đầu <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              value={formData.start_date}
              min={getTodayString()}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
              required
            />
            <p className={styles.hint}>
              ⚠️ Phải cách ngày hiện tại ít nhất 7 ngày
            </p>
          </div>

          <div className={styles.formGroup}>
            <label>
              Chọn các ngày trong tuần <span className={styles.required}>*</span>
            </label>
            <div className={styles.daysSelector}>
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={
                    formData.schedule_days.includes(day) ? styles.activeDay : ""
                  }
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.formGroup}>
              <label>
                Giờ bắt đầu <span className={styles.required}>*</span>
              </label>
              <input
                type="time"
                value={formData.time_slot.split("-")[0] || "18:00"}
                onChange={(e) => {
                  const end = formData.time_slot.split("-")[1] || "20:00";
                  setFormData({
                    ...formData,
                    time_slot: `${e.target.value}-${end}`,
                  });
                }}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                Giờ kết thúc <span className={styles.required}>*</span>
              </label>
              <input
                type="time"
                value={formData.time_slot.split("-")[1] || "20:00"}
                onChange={(e) => {
                  const start = formData.time_slot.split("-")[0] || "18:00";
                  setFormData({
                    ...formData,
                    time_slot: `${start}-${e.target.value}`,
                  });
                }}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Số tuần học</label>
            <input
              type="number"
              value={formData.total_weeks}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  total_weeks: Number(e.target.value),
                })
              }
              min="1"
              max="52"
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2>👥 Số lượng học sinh</h2>

          <div className={styles.rowTwo}>
            <div className={styles.formGroup}>
              <label>
                Tối thiểu <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                value={formData.min_students}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_students: Number(e.target.value),
                  })
                }
                min="1"
                max={formData.max_students}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                Tối đa <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                value={formData.max_students}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_students: Number(e.target.value),
                  })
                }
                min={formData.min_students}
                max="20"
                required
              />
            </div>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? "Đang tạo..." : "📤 Tạo lớp và gửi đề xuất"}
        </button>
      </form>
    </div>
  );
}