"use client";

import { useState, useEffect } from "react";
import styles from "./management.module.css";

import FilterControl from "./_components/Sec1";
import ClassGrid from "./_components/Sec2";
import ClassDetailModal from "./_components/Sec3";
import { courseService } from "@/services/courseService"; // 👈 Sử dụng courseService chuẩn

export default function ClassroomManagementPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        // Gọi qua courseService.getCourses với các tham số lọc
        const resData = await courseService.getCourses({
          page: currentPage,
          limit: 6,
          status: statusFilter,
          search: search
        });
        
        if (isMounted && resData) {
          const classList = Array.isArray(resData) ? resData : (resData.data || []);
          const pageInfo = resData.pagination || { totalPages: resData.last_page || 1 };

          setClasses(classList);
          setPagination(pageInfo);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách lớp học từ Backend:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [currentPage, statusFilter, search]);

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Trở về trang đầu khi đổi tab
  };

  const handleCloseClass = async (classId) => {
    const confirmClose = window.confirm("Bạn có chắc chắn muốn khóa lớp này (Dừng nhận thêm học viên) không?");
    if (!confirmClose) return;

    try {
      // Gọi service cập nhật trạng thái thông qua courseService
      const result = await courseService.updateCourseStatus(classId, { status: "closed" });

      if (result && (result.success !== false)) {
        // Cập nhật State giao diện ngay lập tức
        setClasses(prev => 
          prev.map(c => (c.class_id === classId || c.id === classId) ? { ...c, status: "closed" } : c)
        );

        if (selectedClass && (selectedClass.class_id === classId || selectedClass.id === classId)) {
          setSelectedClass(prev => ({ ...prev, status: "closed" }));
        }

        alert("🔒 Đã khóa tuyển sinh lớp học thành công!");
      } else {
        alert(`Khóa lớp thất bại: ${result?.message || 'Lỗi không xác định'}`);
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

      {/* 2. Section Danh sách Lưới và Phân trang */}
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