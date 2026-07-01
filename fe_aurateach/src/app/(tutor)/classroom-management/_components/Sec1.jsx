"use client";

import Link from "next/link";
import styles from "../management.module.css";

export default function FilterControl({ search, setSearch, statusFilter, onFilterChange }) {
  return (
    <>
      <div className={styles.topControl}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm theo tên lớp hoặc tên học viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <a href="/classroom-management/create" className={styles.createBtn}>
          ➕ Tạo lớp học mới
        </a>
      </div>

      {/* Các tab lọc trạng thái lớp học */}
      <div className={styles.filterTabs}>
        <button className={statusFilter === "all" ? styles.tabActive : ""} onClick={() => onFilterChange("all")}>Tất cả</button>
        <button className={statusFilter === "active" ? styles.tabActive : ""} onClick={() => onFilterChange("active")}>Đang tuyển sinh</button>
        <button className={statusFilter === "closed" ? styles.tabActive : ""} onClick={() => onFilterChange("closed")}>Đã đóng (Đủ chỗ)</button>
        <button className={statusFilter === "completed" ? styles.tabActive : ""} onClick={() => onFilterChange("completed")}>Đã hoàn thành</button>
      </div>
    </>
  );
}