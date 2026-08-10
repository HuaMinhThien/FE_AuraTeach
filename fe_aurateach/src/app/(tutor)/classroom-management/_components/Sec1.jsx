"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../management.module.css";
import Image from "next/image";
import { tutorService } from "@/services/tutorService";
import { authService } from "@/services/authService"; // 👈 Import authService vào đây

export default function FilterControl({ search, setSearch, statusFilter, onFilterChange }) {
  const router = useRouter();
  const [isApproved, setIsApproved] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Kiểm tra verification_status của Gia sư thông qua authService & tutorService
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        const userId = currentUser?.id || currentUser?.user_id;

        if (userId) {
          const response = await tutorService.getByUserId(userId);
          console.log("🔍 Dữ liệu tutor trả về từ Laravel:", response);

          // Xử lý linh hoạt mọi cấu trúc dữ liệu trả về (Mảng, Object bọc data, hoặc Object đơn)
          let tutorObj = null;
          if (Array.isArray(response)) {
            tutorObj = response[0];
          } else if (response?.data) {
            tutorObj = Array.isArray(response.data) ? response.data[0] : response.data;
          } else {
            tutorObj = response;
          }

          console.log("📌 Tutor Object sau khi bóc tách:", tutorObj);

          if (tutorObj && tutorObj.verification_status) {
            const status = String(tutorObj.verification_status).toLowerCase().trim();
            console.log("📌 Status thực tế sau khi chuẩn hóa:", status);

            // Chấp nhận tất cả các biến thể trạng thái đã duyệt phổ biến
            if (["approved", "aprroved", "đã xác minh", "da xac minh", "verified", "active"].includes(status)) {
              setIsApproved(true);
            }
          } else {
            console.warn("⚠️ Không tìm thấy trường verification_status trong đối tượng tutor!");
          }
        } else {
          console.warn("⚠️ Không lấy được user_id hiện tại!");
        }
      } catch (error) {
        console.error("Lỗi kiểm tra quyền tạo lớp:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkVerification();
  }, []);

  const handleCreateClick = (e) => {
    if (!isApproved) {
      e.preventDefault();
      alert("⚠️ Hồ sơ Gia sư của bạn chưa được phê duyệt. Bạn không thể thực hiện chức năng tạo lớp học mới!");
    } else {
      router.push("/classroom-management/create");
    }
  };

  return (
    <>
      <div className={styles.topControl}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            <Image src="/img/icons/search.png" alt="Search" width={20} height={20} />
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên lớp hoặc tên học viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Nút Tạo Lớp Học Mới với xử lý kiểm tra quyền */}
        <button 
          onClick={handleCreateClick} 
          className={styles.createBtn}
          style={{
            opacity: !isChecking && !isApproved ? 0.6 : 1,
            cursor: !isChecking && !isApproved ? "not-allowed" : "pointer"
          }}
          title={!isApproved ? "Hồ sơ của bạn cần được phê duyệt trước khi tạo lớp" : ""}
        >
          ➕ Tạo lớp học mới
        </button>
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