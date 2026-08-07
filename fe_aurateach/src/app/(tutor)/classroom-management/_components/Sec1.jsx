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
        // 🚀 Dùng authService để lấy thông tin user hiện tại thay vì đọc cookie thủ công
        const currentUser = await authService.getCurrentUser();
        const userId = currentUser?.id || currentUser?.user_id;

        if (userId) {
          // Gọi qua service chuẩn của dự án để lấy thông tin gia sư
          const data = await tutorService.getByUserId(userId);
          
          console.log("🔍 Dữ liệu tutor trả về từ Laravel:", data);
          
          const tutors = Array.isArray(data) ? data : (data?.data || []);
          console.log("📋 Danh sách tutors sau khi xử lý:", tutors);

          if (tutors.length > 0) {
            console.log("📌 Status thực tế trong DB:", tutors[0].verification_status);
            const status = tutors[0]?.verification_status?.toLowerCase().trim();
            
            // Chuyển về chữ thường để so sánh an toàn tuyệt đối
            if (status === "approved" || status === "đã xác minh" || status === "da xac minh") {
              setIsApproved(true);
            }
          } else {
            console.warn("⚠️ Không tìm thấy bản ghi tutor nào khớp với user_id này!");
          }
        } else {
          console.warn("⚠️ Không lấy được thông tin người dùng hiện tại từ authService!");
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