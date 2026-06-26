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

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/classes?page=${currentPage}&limit=6&status=${statusFilter}&search=${search}`
        );
        const resData = await res.json();
        
        if (isMounted && resData.success) {
          setClasses(resData.data);
          setPagination(resData.pagination);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách lớp học từ JSON Server:", error);
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

  const handleCloseClass = (classId) => {
    const confirmClose = window.confirm("Bạn có chắc chắn muốn khóa lớp này (Dừng nhận thêm học viên) không?");
    if (confirmClose) {
      setClasses(prev => prev.map(c => c.class_id === classId ? { ...c, status: "closed" } : c));
      if (selectedClass && selectedClass.class_id === classId) {
        setSelectedClass(prev => ({ ...prev, status: "closed" }));
      }
      alert("Đã khóa tuyển sinh lớp học thành công!");
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