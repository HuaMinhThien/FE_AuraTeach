// src/services/adminService.js

class AdminService {
  constructor() {
    this.useApi = process.env.NEXT_PUBLIC_USE_API === 'true';
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    this.jsonServerUrl = 'http://localhost:3007';
  }

  async getStats() {
    if (this.useApi) {
      return this.getStatsWithApi();
    } else {
      return this.getStatsWithJson();
    }
  }

  async getStatsWithJson() {
    try {
      const [usersRes, coursesRes, paymentsRes, tutorsRes] = await Promise.all([
        fetch(`${this.jsonServerUrl}/users`),
        fetch(`${this.jsonServerUrl}/courses`),
        fetch(`${this.jsonServerUrl}/payments`),
        fetch(`${this.jsonServerUrl}/tutors`)
      ]);

      const users = await usersRes.json();
      const courses = await coursesRes.json();
      const payments = await paymentsRes.json();
      const tutors = await tutorsRes.json();

      const students = users.filter(u => u.role === 'student');
      const activeCourses = courses.filter(c => c.status === 'active');
      const paidPayments = payments.filter(p => p.payment_status === 'paid');
      const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount * 0.35), 0);
      const pendingWithdrawals = tutors.reduce((sum, t) => sum + (t.pending_balance || 0), 0);

      return {
        success: true,
        data: {
          totalStudents: students.length,
          totalTutors: tutors.length,
          totalCourses: activeCourses.length,
          totalRevenue: totalRevenue,
          pendingWithdrawals: pendingWithdrawals,
        }
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return { success: true, data: { totalStudents: 0, totalTutors: 0, totalCourses: 0, totalRevenue: 0, pendingWithdrawals: 0 } };
    }
  }

  async getStatsWithApi() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/dashboard/stats`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats from API:', error);
      return { success: true, data: { totalStudents: 0, totalTutors: 0, totalCourses: 0, totalRevenue: 0, pendingWithdrawals: 0 } };
    }
  }

  // ===== REGISTRATION STATS =====
  async getRegistrationStats(period = 'week', customRange = null) {
    if (this.useApi) {
      return this.getRegistrationStatsWithApi(period, customRange);
    } else {
      return this.getRegistrationStatsWithJson(period, customRange);
    }
  }

  async getRegistrationStatsWithJson(period = 'week', customRange = null) {
    try {
      const response = await fetch(`${this.jsonServerUrl}/users`);
      const users = await response.json();

      const result = [];

      if (period === 'custom' && customRange && customRange.startDate && customRange.endDate) {
        const start = new Date(customRange.startDate);
        const end = new Date(customRange.endDate);
        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          const dayStudents = users.filter(u => u.role === 'student' && u.created_at?.startsWith(dateStr)).length;
          const dayTutors = users.filter(u => u.role === 'tutor' && u.created_at?.startsWith(dateStr)).length;
          result.push({ date: dateStr, students: dayStudents, tutors: dayTutors });
          current.setDate(current.getDate() + 1);
        }
      } else if (period === 'year') {
        const monthMap = {};
        users.forEach(u => {
          if (!u.created_at) return;
          const month = u.created_at.substring(0, 7);
          if (!monthMap[month]) monthMap[month] = { students: 0, tutors: 0 };
          if (u.role === 'student') monthMap[month].students++;
          if (u.role === 'tutor') monthMap[month].tutors++;
        });
        Object.keys(monthMap).sort().forEach(month => {
          result.push({ date: month, students: monthMap[month].students, tutors: monthMap[month].tutors });
        });
      } else {
        const now = new Date();
        const days = period === 'week' ? 7 : 30;
        for (let i = days; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayStudents = users.filter(u => u.role === 'student' && u.created_at?.startsWith(dateStr)).length;
          const dayTutors = users.filter(u => u.role === 'tutor' && u.created_at?.startsWith(dateStr)).length;
          result.push({ date: dateStr, students: dayStudents, tutors: dayTutors });
        }
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error fetching registration stats:', error);
      return { success: true, data: [] };
    }
  }

  async getRegistrationStatsWithApi(period = 'week', customRange = null) {
    try {
      let url = `${this.apiBaseUrl}/admin/dashboard/registrations?period=${period}`;
      if (period === 'custom' && customRange) {
        url += `&startDate=${customRange.startDate}&endDate=${customRange.endDate}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error fetching registration stats from API:', error);
      return { success: true, data: [] };
    }
  }

  // ===== REVENUE STATS =====
  async getRevenueStats(period = 'week', customRange = null) {
    if (this.useApi) {
      return this.getRevenueStatsWithApi(period, customRange);
    } else {
      return this.getRevenueStatsWithJson(period, customRange);
    }
  }

  async getRevenueStatsWithJson(period = 'week', customRange = null) {
    try {
      const response = await fetch(`${this.jsonServerUrl}/payments`);
      const payments = await response.json();

      const result = [];

      if (period === 'custom' && customRange && customRange.startDate && customRange.endDate) {
        const start = new Date(customRange.startDate);
        const end = new Date(customRange.endDate);
        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          const dayRevenue = payments
            .filter(p => p.payment_status === 'paid' && p.paid_at?.startsWith(dateStr))
            .reduce((sum, p) => sum + (p.amount * 0.35), 0);
          result.push({ date: dateStr, revenue: dayRevenue });
          current.setDate(current.getDate() + 1);
        }
      } else if (period === 'year') {
        const monthMap = {};
        payments.forEach(p => {
          if (p.payment_status === 'paid' && p.paid_at) {
            const month = p.paid_at.substring(0, 7);
            if (!monthMap[month]) monthMap[month] = 0;
            monthMap[month] += p.amount * 0.35;
          }
        });
        Object.keys(monthMap).sort().forEach(month => {
          result.push({ date: month, revenue: monthMap[month] });
        });
      } else {
        const now = new Date();
        const days = period === 'week' ? 7 : 30;
        for (let i = days; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayRevenue = payments
            .filter(p => p.payment_status === 'paid' && p.paid_at?.startsWith(dateStr))
            .reduce((sum, p) => sum + (p.amount * 0.35), 0);
          result.push({ date: dateStr, revenue: dayRevenue });
        }
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error fetching revenue stats:', error);
      return { success: true, data: [] };
    }
  }

  async getRevenueStatsWithApi(period = 'week', customRange = null) {
    try {
      let url = `${this.apiBaseUrl}/admin/dashboard/revenue?period=${period}`;
      if (period === 'custom' && customRange) {
        url += `&startDate=${customRange.startDate}&endDate=${customRange.endDate}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error fetching revenue stats from API:', error);
      return { success: true, data: [] };
    }
  }

  // ===== TOP COURSES =====
  async getTopCourses() {
    if (this.useApi) {
      return this.getTopCoursesWithApi();
    } else {
      return this.getTopCoursesWithJson();
    }
  }

  async getTopCoursesWithJson() {
    try {
      const [coursesRes, subsRes] = await Promise.all([
        fetch(`${this.jsonServerUrl}/courses`),
        fetch(`${this.jsonServerUrl}/course-subscriptions`)
      ]);

      const courses = await coursesRes.json();
      const subscriptions = await subsRes.json();

      const topCourses = courses.map(c => ({
        ...c,
        students_count: subscriptions.filter(s => s.course_id === c.course_id).length
      })).sort((a, b) => b.students_count - a.students_count).slice(0, 5);

      return { success: true, data: topCourses };
    } catch (error) {
      return { success: true, data: [] };
    }
  }

  async getTopCoursesWithApi() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/dashboard/top-courses`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: true, data: [] };
    }
  }

  // ===== PAYMENT STATS =====
  async getPaymentStats() {
    if (this.useApi) {
      return this.getPaymentStatsWithApi();
    } else {
      return this.getPaymentStatsWithJson();
    }
  }

  async getPaymentStatsWithJson() {
    try {
      const response = await fetch(`${this.jsonServerUrl}/payments`);
      const payments = await response.json();

      return {
        success: true,
        data: {
          pending: payments.filter(p => p.payment_status === 'pending').length,
          paid: payments.filter(p => p.payment_status === 'paid').length,
          refunded: payments.filter(p => p.payment_status === 'refunded').length,
        }
      };
    } catch (error) {
      return { success: true, data: { pending: 0, paid: 0, refunded: 0 } };
    }
  }

  async getPaymentStatsWithApi() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/dashboard/payment-stats`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: true, data: { pending: 0, paid: 0, refunded: 0 } };
    }
  }

  // ===== CONTENT MANAGEMENT =====

  async getFeaturedContent() {
    if (this.useApi) {
      return this.getFeaturedContentWithApi();
    } else {
      return this.getFeaturedContentWithJson();
    }
  }

  async getFeaturedContentWithJson() {
    try {
      const response = await fetch(`${this.jsonServerUrl}/featured_content`);
      const data = await response.json();
      const config = Array.isArray(data) ? data[0] : data;
      return { success: true, data: config || null };
    } catch (error) {
      console.error('❌ Error fetching featured content:', error);
      return { success: false, data: null };
    }
  }

  async getFeaturedContentWithApi() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/content/featured`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error fetching featured content from API:', error);
      return { success: false, data: null };
    }
  }

  async updateFeaturedContent(section, payload) {
    if (this.useApi) {
      return this.updateFeaturedContentWithApi(section, payload);
    } else {
      return this.updateFeaturedContentWithJson(section, payload);
    }
  }

  async updateFeaturedContentWithJson(section, payload) {
    try {
      // Lấy record hiện tại
      const getRes = await fetch(`${this.jsonServerUrl}/featured_content`);
      const data = await getRes.json();
      const current = Array.isArray(data) ? data[0] : data;

      if (!current || !current.id) {
        throw new Error('Không tìm thấy featured_content record');
      }

      const updated = {
        ...current,
        [section]: {
          ...current[section],
          ...payload,
          updated_at: new Date().toISOString(),
        },
      };

      const putRes = await fetch(`${this.jsonServerUrl}/featured_content/${current.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (!putRes.ok) throw new Error('Cập nhật thất bại');
      const result = await putRes.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error updating featured content:', error);
      return { success: false, message: error.message };
    }
  }

  async updateFeaturedContentWithApi(section, payload) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/content/featured/${section}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error updating featured content from API:', error);
      return { success: false, message: error.message };
    }
  }

  // Lấy toàn bộ dữ liệu cần thiết cho trang Content Management
  async getContentManagementData() {
    try {
      const [tutorsRes, usersRes, reviewsRes, studentsRes, coursesRes, configRes] = await Promise.all([
        fetch(`${this.jsonServerUrl}/tutors`),
        fetch(`${this.jsonServerUrl}/users`),
        fetch(`${this.jsonServerUrl}/reviews`),
        fetch(`${this.jsonServerUrl}/students`),
        fetch(`${this.jsonServerUrl}/courses`),
        fetch(`${this.jsonServerUrl}/featured_content`),
      ]);

      const [tutors, users, reviews, students, courses, configArr] = await Promise.all([
        tutorsRes.json(),
        usersRes.json(),
        reviewsRes.json(),
        studentsRes.json(),
        coursesRes.json(),
        configRes.json(),
      ]);

      const config = Array.isArray(configArr) ? configArr[0] : configArr;

      // Merge tutor + user info
      const mergedTutors = tutors
        .filter(t => t.verification_status === 'approved')
        .map(tutor => {
          const user = users.find(u => u.user_id === tutor.user_id) || {};
          return {
            tutor_id: tutor.tutor_id,
            name: user.full_name || 'Gia sư AuraTeach',
            avatar: user.avatar || '',
            expertise: tutor.expertise || '',
            rating: tutor.rating || 0,
            experience: tutor.experience || '',
          };
        });

      // Merge review + student/user info
      const mergedReviews = reviews.map(review => {
        const student = students.find(s => s.student_id === review.student_id) || {};
        const user = users.find(u => u.user_id === student.user_id) || {};
        const course = courses.find(c => c.course_id === review.course_id) || {};
        return {
          review_id: review.review_id,
          author: user.full_name || 'Học viên ẩn danh',
          course_title: course.title || 'Không rõ lớp',
          rating: review.rating,
          comment: review.comment,
        };
      });

      return {
        success: true,
        data: { tutors: mergedTutors, reviews: mergedReviews, courses, config },
      };
    } catch (error) {
      console.error('❌ Error fetching content management data:', error);
      return { success: false, data: null };
    }
  }
}

export const adminService = new AdminService();