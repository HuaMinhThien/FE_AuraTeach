"use client";

import { useState, useEffect } from "react";
import styles from "./management.module.css";

import FilterControl from "./_components/Sec1";
import ClassGrid from "./_components/Sec2";
import ClassDetailModal from "./_components/Sec3";

export default function ClassroomManagementPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [selectedClass, setSelectedClass] = useState(null);

  const getCookie = (name) => {
    if (typeof window === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    const userCookie = getCookie("user_info");
    
    // Nếu không có cookie user_info thì không tải
    if (!userCookie) return; 
    const userData = JSON.parse(decodeURIComponent(userCookie));
    const tutorId = userData.user_id || userData.id;
    console.log("DEBUG: Tutor ID đang gửi lên là:", tutorId);
    const loadData = async () => {
      setLoading(true);
      try {
        // GỌI API VỚI tutor_id
        const res = await fetch(
          `http://localhost:8000/api/courses?tutor_id=${tutorId}&page=${currentPage}&status=${statusFilter}&search=${search}`
        );
        const resData = await res.json();
        console.log("Dữ liệu nhận từ API:", resData);
        
        // Lưu ý: Nếu Laravel trả về mảng trực tiếp không có {success, data}, 
        // bạn chỉ cần setClasses(resData)
        if (isMounted) {
          const data = resData.data || resData; 
          // Dùng toán tử điều kiện để đảm bảo data luôn là mảng
          setClasses(Array.isArray(data) ? data : []); 
        }
      } catch (error) {
        console.error("Lỗi tải lớp học:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [currentPage, statusFilter, search]);

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Trở về trang đầu khi đổi tab
  };

  // Thay thế hàm cũ trong src/app/.../page.jsx (hoặc đường dẫn quản lý lớp học của bạn)
  const handleCloseClass = async (classId) => {
    const confirmClose = window.confirm("Bạn có chắc chắn muốn khóa lớp này (Dừng nhận thêm học viên) không?");
    if (!confirmClose) return;

    try {
      // 1. Gọi tới API Route động xử lý PATCH dữ liệu
      const response = await fetch(`/api/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });

      const result = await response.json();

      if (result.success) {
        // 2. Cập nhật State danh sách lớp học ở client ngay lập tức để UI render lại mượt mà
        setClasses(prev => 
          prev.map(c => c.class_id === classId ? { ...c, status: "closed" } : c)
        );

        // 3. Nếu người dùng đang mở xem Modal chi tiết của chính lớp này, cập nhật trạng thái hiển thị trong Modal luôn
        if (selectedClass && selectedClass.class_id === classId) {
          setSelectedClass(prev => ({ ...prev, status: "closed" }));
        }

        alert("🔒 Đã khóa tuyển sinh lớp học thành công và lưu vào hệ thống!");
      } else {
        alert(`Khóa lớp thất bại: ${result.message}`);
      }
    } catch (error) {
      console.error("Lỗi khi thực hiện khóa lớp phía Client:", error);
      alert("Đã xảy ra lỗi kết nối mạng, không thể khóa lớp học lúc này.");
    }
  };

  // Hàm tạo thẻ màu trạng thái dùng chung cho Grid và Modal
  const getStatusBadge = (status) => {
    switch (status) {
      case "active": return <span className={`${styles.badge} ${styles.badgeActive}`}>Đang tuyển sinh</span>;
      case "closed": return <span className={`${styles.badge} ${styles.badgeClosed}`}>Lớp đã đóng (Đủ chỗ)</span>;
      case "completed": return <span className={`${styles.badge} ${styles.badgeCompleted}`}>Đã hoàn thành</span>;
      default: return null;
    }
  };

  return (
    <div className={styles.mainContainer}>
      {/* 1. Section Bộ lọc và tìm kiếm */}
      <FilterControl 
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        onFilterChange={handleFilterChange}
      />

      {/* 2. Section Danh sách Lưới 3x2 và Phân trang */}
      <ClassGrid 
        classes={classes}
        loading={loading}
        pagination={pagination}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onSelectClass={setSelectedClass}
        onCloseClass={handleCloseClass}
        getStatusBadge={getStatusBadge}
      />

      {/* 3. Section Popup chi tiết thông tin lớp */}
      <ClassDetailModal 
        selectedClass={selectedClass}
        onCloseModal={() => setSelectedClass(null)}
        onCloseClass={handleCloseClass}
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
}