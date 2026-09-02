"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { tutorService } from "@/services/tutorService"; // Đường dẫn tuỳ chỉnh theo cấu trúc project của ông em
import { userService } from "@/services/userService";     // Đường dẫn tuỳ chỉnh theo cấu trúc project của ông em

const quickFilters = ["Tất cả", "Toán", "Văn", "Anh", "Lý", "Hóa", "Sinh"];

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5l2.72 5.51 6.08.89-4.4 4.28 1.04 6.05L12 17.38l-5.44 2.85 1.04-6.05-4.4-4.28 6.08-.89L12 3.5z" />
    </svg>
  );
}

export default function TeacherListPage() {
  const [tutors, setTutors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTutors, setTotalTutors] = useState(0);
  const tutorsPerPage = 8;

  // Call API qua Service khi component mount
  useEffect(() => {
    let isMounted = true;

    const fetchFilteredTutors = async () => {
      setIsLoading(true);
      try {
        // Đóng gói các tham số để gửi lên Backend
        const params = {
          search: searchTerm,
          filter: activeFilter,
          sort: sortOption,
          page: currentPage,
          per_page: 8
        };

        // Gọi API qua service (giả sử tutorService.getTutors hỗ trợ nhận params)
        const res = await tutorService.getTutors(params);

        if (isMounted) {
          // Xử lý dữ liệu trả về từ Laravel Paginator
          const responseData = res.data !== undefined ? res : { data: res, last_page: 1, total: res.length };
          
          const tutorsData = responseData.data || [];
          
          // Map dữ liệu hiển thị giống như cũ của ông em
          const formattedTutors = tutorsData.map((tutor) => {
            const user = tutor.user || {}; 

            let avatar = user.avatar || "";
            if (!avatar || avatar.trim() === "") {
              avatar = "https://res.cloudinary.com/ghbrskob/image/upload/v1786685723/aurateach_reports/v09h1kwwsnzbczsggiuy.webp";
            }

            const bioText = tutor.bio || "";
            const expertiseText = tutor.expertise || tutor.qualification || "Gia sư";
            const experienceText = tutor.experience || "Chưa cập nhật KN";

            return {
              id: tutor.tutor_id || tutor.id,
              name: user.full_name || "Gia sư AuraTeach",
              rating: tutor.rating !== null && tutor.rating !== undefined ? Number(tutor.rating) : 0,
              reviewCount: tutor.review_count || tutor.reviews_count || 0,
              desc: bioText.length > 135 ? bioText.substring(0, 132) + "..." : bioText || "Chưa có thông tin giới thiệu.",
              expertise: expertiseText,
              experience: experienceText,
              level: tutor.level || "Giáo viên",
              tags: [expertiseText, experienceText].filter(Boolean),
              avatar: avatar,
            };
          });

          setTutors(formattedTutors);
          setTotalPages(responseData.last_page || 1);
          setTotalTutors(responseData.total || formattedTutors.length);
        }
      } catch (error) {
        console.error("Lỗi khi lọc gia sư từ Backend:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Thêm debounce nhẹ cho ô tìm kiếm để khỏi gọi API liên tục mỗi khi gõ phím
    const timeoutId = setTimeout(() => {
      fetchFilteredTutors();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchTerm, activeFilter, sortOption, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleSortChange = (option) => {
    setSortOption(option);
    setIsSortOpen(false);
    setCurrentPage(1);
  };

  return (
    <main className={styles.teacherListPage}>
      <section className={`container-center ${styles.searchSection}`}>
        <div className={styles.searchCard}>
          <h1>Khám phá Gia sư tài năng</h1>
          <p>
            Tìm kiếm người đồng hành hoàn hảo cho hành trình học tập của bạn.
            Hàng ngàn gia sư chất lượng cao đã sẵn sàng hỗ trợ bạn.
          </p>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.inputWrap}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Tên gia sư, môn học..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Tìm kiếm gia sư"
              />
            </div>
            <button type="submit">Tìm kiếm</button>
          </form>

          <div className={styles.quickFilter}>
            <span>Phổ biến:</span>
            <div>
              {quickFilters.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={activeFilter === item ? styles.activeFilter : ""}
                  onClick={() => {
                    setActiveFilter(item);
                    setCurrentPage(1);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`container-center ${styles.listSection}`}>
        <div className={styles.listHead}>
          <h2>{totalTutors} gia sư phù hợp</h2>

          {/* Dropdown Sort */}
          <div className={styles.sortWrapper}>
            <button
              type="button"
              className={styles.sortBtn}
              onClick={() => setIsSortOpen(!isSortOpen)}
            >
              {sortOption === "newest" ? "Mới nhất" : "Cũ nhất"}
              <span className={isSortOpen ? styles.arrowUp : styles.arrowDown}>
                ▾
              </span>
            </button>

            {isSortOpen && (
              <div className={styles.sortDropdown}>
                <button
                  className={sortOption === "newest" ? styles.activeSort : ""}
                  onClick={() => handleSortChange("newest")}
                >
                  Mới nhất
                </button>
                <button
                  className={sortOption === "oldest" ? styles.activeSort : ""}
                  onClick={() => handleSortChange("oldest")}
                >
                  Cũ nhất
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Danh sách Gia sư */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
            Đang tải danh sách gia sư...
          </div>
        ) : (
          <div className={styles.grid}>
            {tutors.length > 0 ? (
              tutors.map((tutor) => (
                <article className={styles.card} key={tutor.id}>
                  <div className={styles.cardTop}>
                    <img
                      src={tutor.avatar}
                      alt={tutor.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
                      }}
                    />
                    <div className={styles.rating}>
                      <span className={styles.star}>
                        <StarIcon />
                      </span>
                      <span>{tutor.rating.toFixed(1)}</span>
                      <small>({tutor.reviewCount})</small>
                    </div>
                  </div>

                  <h3>{tutor.name}</h3>
                  <p className={styles.desc}>{tutor.desc}</p>
                  <p className={styles.meta}>
                    {tutor.level}
                  </p>
                  <p className={styles.experienceText}>
                    <strong>Kinh nghiệm:</strong> {tutor.experience}
                  </p>
                  <div className={styles.tags}>
                    {tutor.tags.map((tag, index) => (
                      <span key={index}>{tag}</span>
                    ))}
                  </div>

                  <Link href={`/tutorList/${tutor.id}`} className={styles.detailLink}>
                    <button type="button" className={styles.detailBtn}>
                      Xem chi tiết
                    </button>
                  </Link>
                </article>
              ))
            ) : (
              <p
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "40px",
                  color: "#666",
                }}
              >
                Không tìm thấy gia sư nào phù hợp với từ khóa của bạn.
              </p>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Trước
            </button>

            {Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  className={currentPage === pageNum ? styles.activePage : ""}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Sau
            </button>
          </div>
        )}
      </section>
    </main>
  );
}