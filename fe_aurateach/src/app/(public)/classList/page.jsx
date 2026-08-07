'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { courseService } from '@/services/courseService';
import { categoryService } from '@/services/categoryService';

export default function ClassListPage() {
  const router = useRouter();
  
  // State lưu danh sách dữ liệu hiển thị từ API
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // State phân trang từ Laravel trả về
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // State quản lý trạng thái tải và lỗi
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho bộ lọc (Filters & Sorting)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [priceRange, setPriceRange] = useState('all');
  const [sortOption, setSortOption] = useState('students-desc');

  // Fetch danh mục (categories) một lần khi load trang
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await categoryService.getCategories();

        const categoriesList = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.data || []);

        setCategories(categoriesList);
      } catch (err) {
        console.error('❌ [DEBUG Categories ERROR] Lỗi tải danh mục:', err);
      }
    };
    fetchCategories();
  }, []);

  // Gọi API lấy danh sách khóa học mỗi khi thay đổi bộ lọc hoặc trang
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Chuẩn bị các tham số gửi lên API Laravel CourseController@index
        const params = {
          page: currentPage,
          per_page: 8, // 2 hàng x 4 cột
          search: searchTerm,
          category: selectedCategory,
          price_range: priceRange,
          sort_by: sortOption,
        };

        const response = await courseService.getCourses(params);

        const coursesList = Array.isArray(response) ? response : (response?.data || []);
        console.log('📋 [DEBUG Courses LIST] Số lượng khóa học lấy được:', coursesList.length);

        // Map lại dữ liệu khớp với cấu trúc hiển thị của giao diện
        const formattedCourses = coursesList.map((course, index) => {
          console.log(`🔍 [DEBUG Course Item #${index}] ID: ${course.course_id} - Title: ${course.title}`, {
            schedule_days_raw: course.schedule_days,
            time_slot_raw: course.time_slot,
            tutor: course.tutor
          });

          const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDE4QzE2IDE1LjI0IDguMjQgMTIgMTIgMTJDMTEuNTUyIDIxIDIwIDM2IDI0IDM2QzI4IDM2IDM2LjQ0OCAyMSAzNiAxMkMyOS43NiAxMiAyNCAxNS4yNCAyNCAxOFoiIGZpbGw9IiM5Q0FGRjYiLz48L3N2Zz4=';
          const user = course.tutor?.user;

          // Format thời gian học nếu có
          const formatScheduleDays = (days) => {
            console.log(`🗓️ [DEBUG Format Schedule] Input days:`, days);
            if (!days || !Array.isArray(days) || days.length === 0) return 'Chưa cập nhật';
            return days.join(', ');
          };

          return {
            ...course,
            tutor_name: user?.full_name || 'Gia sư AuraTeach',
            tutor_avatar: (user?.avatar && user.avatar !== '/img/tutors/default.png') ? user.avatar : defaultAvatar,
            experience: course.tutor?.Experience || 'Chưa cập nhật',
            category_name: course.category?.category_name || 'Chưa phân loại',
            students_count: course.current_students || 0,
            schedule_display: formatScheduleDays(course.schedule_days),
            time_slot_display: course.time_slot || 'Chưa cập nhật',
          };
        });

        console.log('✨ [DEBUG Formatted Courses] Dữ liệu sau khi map hoàn chỉnh:', formattedCourses);

        setCourses(formattedCourses);
        setCurrentPage(response?.current_page || 1);
        setTotalPages(response?.last_page || 1);
        setTotalItems(response?.total || formattedCourses.length);

      } catch (err) {
        console.error('❌ [DEBUG Courses ERROR] Lỗi tải danh sách lớp học:', err);
        console.error('❌ [DEBUG Courses ERROR Details]:', err.response || err.message);
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [currentPage, searchTerm, selectedCategory, priceRange, sortOption]);

  // Điều hướng đến trang chi tiết
  const handleCardClick = useCallback((course) => {
    console.log('🖱️ [DEBUG Navigation] Click chuyển sang trang chi tiết course_id:', course.course_id);
    router.push(`/classList/${course.course_id}`);
  }, [router]);

  // Xử lý lỗi ảnh
  const handleImageError = useCallback((e) => {
    console.warn('⚠️ [DEBUG Image Error] Ảnh lỗi, đang chuyển về ảnh mặc định:', e.target.src);
    const img = e.target;
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDE4QzE2IDE1LjI0IDguMjQgMTIgMTIgMTJDMTEuNTUyIDIxIDIwIDM2IDI0IDM2QzI4IDM2IDM2LjQ0OCAyMSAzNiAxMkMyOS43NiAxMiAyNCAxNS4yNCAyNCAxOFoiIGZpbGw9IiM5Q0FGRjYiLz48L3N2Zz4=';
    if (img.src !== defaultAvatar) {
      img.src = defaultAvatar;
      img.onerror = null;
    }
  }, []);

  // Handlers thay đổi bộ lọc (đưa về trang 1 khi đổi điều kiện lọc)
  const handleSearchChange = useCallback((e) => {
    console.log('🔍 [DEBUG Filter Search] Giá trị tìm kiếm thay đổi:', e.target.value);
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePriceChange = useCallback((e) => {
    console.log('💰 [DEBUG Filter Price] Khoảng giá thay đổi:', e.target.value);
    setPriceRange(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((e) => {
    console.log('📊 [DEBUG Filter Sort] Cách sắp xếp thay đổi:', e.target.value);
    setSortOption(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleCategoryClick = useCallback((categoryName) => {
    console.log('🏷️ [DEBUG Filter Category] Danh mục được chọn:', categoryName);
    setSelectedCategory(categoryName);
    setCurrentPage(1);
  }, []);

  // Format giá tiền hiển thị VNĐ
  const formatPrice = useCallback((price) => {
    if (price === undefined || price === null || price === '') return '0';
    const num = Number(price) || 0;
    return num.toLocaleString('vi-VN');
  }, []);

  // Hiển thị lỗi kết nối API
  if (error && courses.length === 0) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😅</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
            Không thể tải dữ liệu
          </div>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              backgroundColor: '#2c5bf2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Tìm gia sư hỗ trợ ôn tập &<br />
            giải đáp bài tập (Cấp 1, 2, 3)
          </h1>
          <p className={styles.heroSubtitle}>
            Kết nối với các chuyên gia để ôn lại bài cũ, sửa bài tập và học theo giá linh hoạt.
          </p>

          <div className={styles.heroTags}>
            <span className={styles.tag}> Gia sư xác thực</span>
            <span className={styles.tag}> Học nhóm nhỏ</span>
          </div>

          <div className={styles.heroButtons}>
            <button className={styles.heroBtnPrimary}>Tìm gia sư ngay</button>
          </div>
        </div>

        <div className={styles.heroImageWrapper}>
          <img 
            src="https://image.plo.vn/w1000/Uploaded/2026/vrwqqxjwp/2021_09_13/hoc-online_opku.jpeg.webp" 
            alt="Gia sư hỗ trợ học online" 
            className={styles.heroImage}
          />
          <div className={styles.badge}>2.5k+<br />HỌC VIÊN ĐĂNG KÝ</div>
        </div>
      </section>

      {/* FILTER SECTION */}
      <section className={styles.filterSection}>
        <div className={styles.filterLeft}>
          <input
            type="text"
            placeholder="Tìm môn học hoặc gia sư..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />

          <select 
            value={priceRange} 
            onChange={handlePriceChange}
            className={styles.filterDropdown}
          >
            <option value="all">Mức phí</option>
            <option value="under200">Dưới 200k</option>
            <option value="200-300">200k - 300k</option>
            <option value="over300">Trên 300k</option>
          </select>

          <select 
            value={sortOption} 
            onChange={handleSortChange}
            className={styles.filterDropdown}
          >
            <option value="students-desc">Học viên giảm dần</option>
            <option value="students-asc">Học viên tăng dần</option>
            <option value="price-low">Giá tăng dần</option>
            <option value="price-high">Giá giảm dần</option>
          </select>
        </div>

        <div className={styles.filterRight}>
          <button
            className={`${styles.filterTag} ${selectedCategory === 'Tất cả' ? styles.active : ''}`}
            onClick={() => handleCategoryClick('Tất cả')}
          >
            Tất cả
          </button>
          {categories.map(cat => (
            <button
              key={cat.category_id}
              className={`${styles.filterTag} ${selectedCategory === cat.category_name ? styles.active : ''}`}
              onClick={() => handleCategoryClick(cat.category_name)}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </section>

      {/* LIST SECTION */}
      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <div>
            <h2 className={styles.listTitle}>Danh Sách Lớp Học</h2>
            <p className={styles.listCount}>
              Tìm thấy <strong>{totalItems}</strong> lớp học phù hợp
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '18px', color: '#666' }}>Đang tải danh sách lớp học...</div>
          </div>
        ) : (
          <div className={styles.tutorGrid}>
            {courses.length > 0 ? (
              courses.map((course) => (
                <div 
                  key={course.course_id} 
                  className={styles.tutorCard}
                  onClick={() => handleCardClick(course)}
                >
                  <div className={styles.cardImage}>
                    <img 
                      src={course.thumbnail || "/img/default-class-1.jpg"} 
                      alt={course.title}
                      className={styles.cardThumbnail}
                      onError={(e) => {
                        e.target.src = "/img/default-class-1.jpg";
                      }}
                    />
                    <span className={styles.cardBadge}>
                      {course.category_name} - {course.level || 'N/A'}
                    </span>
                  </div>

                  <h3 className={styles.tutorSubject}>{course.title}</h3>

                  {/* THÔNG TIN THỜI GIAN HỌC */}
                  <div className={styles.scheduleInfo}>
                    <div className={styles.scheduleItem}>
                      <span className={styles.scheduleText}>
                         {course.schedule_display}
                      </span>
                    </div>
                    <div className={styles.scheduleItem}>
                      <span className={styles.scheduleText}>
                         {course.time_slot_display}
                      </span>
                    </div>
                  </div>

                  <div className={styles.tutorInfo}>
                    <div className={styles.tutorAvatar}>
                      <img 
                        src={course.tutor_avatar} 
                        alt={course.tutor_name}
                        width={40}
                        height={40}
                        onError={handleImageError}
                      />
                    </div>
                    <div className={styles.tutorDetails}>
                      <p className={styles.tutorName}>{course.tutor_name}</p>
                      <p className={styles.tutorStats}>
                        {course.experience}
                      </p>
                    </div>
                  </div>

                  <p className={styles.cardDescription}>{course.description}</p>

                  <div className={styles.tutorFooter}>
                    <div className={styles.tutorPrice}>
                      <span className={styles.priceLabel}>HỌC PHÍ THEO GIỜ</span>
                      <span className={styles.priceValue}>
                        {formatPrice(course.price_per_session)}đ / buổi
                      </span>
                    </div>
                    <div className={styles.studentCount}>
                      <span> {course.current_students || 0}/{course.max_students || 0} HS</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                <div style={{ fontSize: '18px', color: '#666' }}>
                  Không tìm thấy lớp học nào phù hợp với tiêu chí tìm kiếm.
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              className={styles.pageBtn}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className={styles.pageDots}>...</span>
            )}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </button>
            )}

            <button 
              className={styles.pageBtn}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        )}
      </section>

      {/* CTA SECTION */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Bạn là giáo viên hoặc sinh viên giỏi?</h2>
          <p className={styles.ctaSubtitle}>
            Gia nhập đội ngũ gia sư tại AuraTeach để chia sẻ kiến thức các môn học phổ thông<br />
            (Cấp 1, 2, 3) và tạo thêm thu nhập linh hoạt ngay hôm nay.
          </p>
          <div className={styles.ctaButtons}>
            <button className={styles.ctaPrimary}>Đăng ký làm Gia sư</button>
            <button className={styles.ctaSecondary}>Tìm hiểu thêm</button>
          </div>
        </div>
      </section>
    </div>
  );
}