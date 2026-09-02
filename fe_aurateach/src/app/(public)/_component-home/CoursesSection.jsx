"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import apiClient from '@/services/apiClient';
import { categoryService } from '@/services/categoryService';

function CoursesSection() {
  const [categories, setCategories]   = useState([]);
  // featuredCourses = danh sách admin đã chọn (từ /home/featured-content)
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [activeTabId, setActiveTabId] = useState('All');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catResponse, featuredResponse] = await Promise.all([
          categoryService.getCategories().catch(() => []),
          apiClient.get('/home/featured-content').catch(() => null),
        ]);

        // Categories
        const categoriesData = Array.isArray(catResponse)
          ? catResponse
          : (catResponse?.data || []);
        setCategories(categoriesData);

        // Featured courses từ config admin
        const coursesFromConfig = featuredResponse?.data?.courses || [];
        setFeaturedCourses(coursesFromConfig);
      } catch (error) {
        console.error('Lỗi tải dữ liệu lớp học đề cử:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Lọc theo tab danh mục (client-side, vì dữ liệu đã đủ)
  const displayedCourses = useMemo(() => {
    if (activeTabId === 'All') return featuredCourses;
    return featuredCourses.filter(
      (c) => c.category?.category_id === activeTabId
    );
  }, [featuredCourses, activeTabId]);

  if (loading && featuredCourses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        Đang tải danh sách lớp học...
      </div>
    );
  }

  return (
    <section className="teacher-sec3">
      <div className="teacher-container">
        <div className="teacher-sec3__wrap">
          <div className="teacher-sec3__heading">
            <h2 className="teacher-sec3__title">Danh Sách Lớp Học Đề Cử</h2>
          </div>

          {/* THANH TAB DANH MỤC */}
          <div
            className="teacher-sec3__tabs"
            style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}
          >
            <button
              onClick={() => setActiveTabId('All')}
              style={{
                padding: '10px 20px', borderRadius: '20px', border: '1px solid #00236F',
                backgroundColor: activeTabId === 'All' ? '#00236F' : '#FFFFFF',
                color: activeTabId === 'All' ? '#FFFFFF' : '#00236F',
                cursor: 'pointer', fontWeight: '500',
              }}
            >
              Tất cả
            </button>

            {categories
              .filter((cat) => cat.category_name !== 'Tất cả')
              .map((cat) => {
                const catId   = cat.category_id || cat.id;
                const isActive = activeTabId === catId;
                return (
                  <button
                    key={catId}
                    onClick={() => setActiveTabId(catId)}
                    style={{
                      padding: '10px 20px', borderRadius: '20px', border: '1px solid #00236F',
                      backgroundColor: isActive ? '#00236F' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#00236F',
                      cursor: 'pointer', fontWeight: '500',
                    }}
                  >
                    {cat.category_name}
                  </button>
                );
              })}
          </div>

          {/* DANH SÁCH LỚP HỌC */}
          {displayedCourses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Không có lớp học nào thuộc danh mục này.
            </div>
          ) : (
            <div className="teacher-sec3__grid">
              {displayedCourses.map((course) => {
                const categoryName =
                  course.category?.category_name || 'Chưa phân loại';

                return (
                  <Link
                    key={course.course_id}
                    href={`/classList/${course.course_id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="course-card">
                      <img
                        src={course.thumbnail || '/img/default-class-1.jpg'}
                        alt={course.title}
                        onError={(e) => { e.target.src = '/img/default-class-1.jpg'; }}
                      />
                      <div className="course-card__content">
                        <span className="course-card__tag">
                          {categoryName} - {course.level || 'N/A'}
                        </span>
                        <h3 className="course-card__title">{course.title}</h3>
                        <p className="course-card__description">{course.description}</p>
                        <div className="course-card__footer">
                          <div className="course-card__price">
                            <span className="course-card__price-value">
                              {parseInt(course.price_per_session || 0).toLocaleString('vi-VN')}đ / buổi
                            </span>
                          </div>
                          <div className="course-card__students">
                            <span>
                              👨‍🎓 {course.current_students || 0}/{course.max_students} HS
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CoursesSection;
