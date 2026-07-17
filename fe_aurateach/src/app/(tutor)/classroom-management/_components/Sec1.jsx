"use client";

import Link from "next/link";
import styles from "../management.module.css";
import Image from "next/image";

export default function FilterControl({ search, setSearch, statusFilter, onFilterChange }) {
  return (
    <>
      <div className={styles.topControl}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            <Image src="/img/icons/search.png" alt="Search" width={20} height={20} />
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên khóa học hoặc tên học viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <a href="/classroom-management/create" className={styles.createBtn}>
          ➕ Tạo khóa học mới
        </a>
      </div>

      <div className={styles.filterTabs}>
        <button className={statusFilter === "all" ? styles.tabActive : ""} onClick={() => onFilterChange("all")}>Tất cả</button>
        <button className={statusFilter === "active" ? styles.tabActive : ""} onClick={() => onFilterChange("active")}>Đang tuyển sinh</button>
        <button className={statusFilter === "closed" ? styles.tabActive : ""} onClick={() => onFilterChange("closed")}>Đã đóng (Đủ chỗ)</button>
        <button className={statusFilter === "completed" ? styles.tabActive : ""} onClick={() => onFilterChange("completed")}>Đã hoàn thành</button>
      </div>
    </>
  );
}