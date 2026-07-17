"use client";

import { useState, useEffect } from "react";
import courseService from "@/services/courseService";
import authService from "@/services/authService"; // 👈 Import authService
import styles from "./management.module.css";

import FilterControl from "./_components/Sec1";
import CourseGrid from "./_components/Sec2";
import CourseDetailModal from "./_components/Sec3";

export default function CourseManagementPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [tutorId, setTutorId] = useState("");

  // 1. Lấy thông tin user hiện tại từ Cookie thông qua getCurrentUser()
  useEffect(() => {
    let isMounted = true;

    const loadDataAndUser = async () => {
      setLoading(true);
      try {
        // 1. Lấy thông tin user hiện tại từ cookie/authService
        const user = await authService.getCurrentUser();
        const currentUserId = user?.id || user?.user_id;

        if (!currentUserId) {
          console.error("Không tìm thấy thông tin đăng nhập.");
          return;
        }

        console.log("Đang gọi API với ID:", currentUserId);

        // 2. Gọi API lấy danh sách khóa học (Backend đã lo việc quy đổi user_id -> tutor_id)
        const resData = await courseService.getAll(currentUserId, {
          page: currentPage,
          limit: 6,
          status: statusFilter,
          search: search
        });
        
        console.log("Kết quả gọi courseService.getAll:", resData);

        if (isMounted && resData) {
          setCourses(resData.data || resData);
          setPagination(resData.pagination || { totalPages: 1 });
        }
      } catch (error) {
        console.error("Lỗi tải danh sách khóa học:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDataAndUser();

    return () => {
      isMounted = false;
    };
  }, [currentPage, statusFilter, search]); // Chỉ cần theo dõi các state phân trang & bộ lọc này

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); 
  };

  const handleCloseCourse = async (courseId) => {
    const confirmClose = window.confirm("Bạn có chắc chắn muốn khóa khóa học này (Dừng nhận thêm học viên) không?");
    if (!confirmClose) return;

    try {
      const result = await courseService.updateStatus(courseId, "closed");

      if (result && result.success) {
        setCourses(prev => 
          prev.map(c => c.course_id === courseId ? { ...c, status: "closed" } : c)
        );

        if (selectedCourse && selectedCourse.course_id === courseId) {
          setSelectedCourse(prev => ({ ...prev, status: "closed" }));
        }

        alert("🔒 Đã khóa tuyển sinh khóa học thành công và lưu vào hệ thống!");
      } else {
        alert(`Khóa khóa học thất bại: ${result?.message || "Lỗi không xác định"}`);
      }
    } catch (error) {
      console.error("Lỗi khi thực hiện khóa khóa học:", error);
      alert("Đã xảy ra lỗi kết nối mạng, không thể khóa khóa học lúc này.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active": return <span className={`${styles.badge} ${styles.badgeActive}`}>Đang tuyển sinh</span>;
      case "closed": return <span className={`${styles.badge} ${styles.badgeClosed}`}>Khóa học đã đóng (Đủ chỗ)</span>;
      case "completed": return <span className={`${styles.badge} ${styles.badgeCompleted}`}>Đã hoàn thành</span>;
      default: return null;
    }
  };

  return (
    <div className={styles.mainContainer}>
      <FilterControl 
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        onFilterChange={handleFilterChange}
      />

      <CourseGrid 
        courses={courses}
        loading={loading}
        pagination={pagination}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onSelectCourse={setSelectedCourse}
        onCloseCourse={handleCloseCourse}
        getStatusBadge={getStatusBadge}
      />

      <CourseDetailModal 
        selectedCourse={selectedCourse}
        onCloseModal={() => setSelectedCourse(null)}
        onCloseCourse={handleCloseCourse}
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
}