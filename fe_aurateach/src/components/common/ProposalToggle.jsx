"use client";

import { useState, useEffect } from "react";
import styles from "./ProposalToggle.module.css";

export default function ProposalToggle({ userId, initialValue = true }) {
  const [isOn, setIsOn] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsOn(initialValue);
  }, [initialValue]);

  const handleToggle = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          accept_proposals: !isOn,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsOn(!isOn);
      } else {
        setError(result.message || "Cập nhật thất bại");
      }
    } catch (error) {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.toggleWrapper}>
        <div className={styles.toggleInfo}>
          <span className={styles.toggleIcon}>📨</span>
          <div>
            <p className={styles.toggleLabel}>Nhận đề xuất xếp lớp từ Admin</p>
            <p className={styles.toggleDesc}>
              Khi bật, Admin có thể gửi đề xuất lớp học phù hợp với bạn
            </p>
            {error && <p className={styles.toggleError}>{error}</p>}
          </div>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={isOn}
            onChange={handleToggle}
            disabled={loading}
          />
          <span className={`${styles.slider} ${styles.round}`}></span>
        </label>
      </div>
      {loading && <span className={styles.loadingSpinner}></span>}
    </div>
  );
}