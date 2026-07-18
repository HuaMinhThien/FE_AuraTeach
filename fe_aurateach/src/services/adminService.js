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
      const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount * 0.1), 0);
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
  async getRegistrationStats(period = 'week') {
    if (this.useApi) {
      return this.getRegistrationStatsWithApi(period);
    } else {
      return this.getRegistrationStatsWithJson(period);
    }
  }

  async getRegistrationStatsWithJson(period = 'week') {
    try {
      const response = await fetch(`${this.jsonServerUrl}/users`);
      const users = await response.json();

      const now = new Date();
      const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
      const result = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayStudents = users.filter(u => 
          u.role === 'student' && u.created_at?.startsWith(dateStr)
        ).length;
        
        const dayTutors = users.filter(u => 
          u.role === 'tutor' && u.created_at?.startsWith(dateStr)
        ).length;

        result.push({ date: dateStr, students: dayStudents, tutors: dayTutors });
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error fetching registration stats:', error);
      return { success: true, data: [] };
    }
  }

  async getRegistrationStatsWithApi(period = 'week') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/dashboard/registrations?period=${period}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error fetching registration stats from API:', error);
      return { success: true, data: [] };
    }
  }

  // ===== REVENUE STATS =====
  async getRevenueStats(period = 'week') {
    if (this.useApi) {
      return this.getRevenueStatsWithApi(period);
    } else {
      return this.getRevenueStatsWithJson(period);
    }
  }

  async getRevenueStatsWithJson(period = 'week') {
    try {
      const response = await fetch(`${this.jsonServerUrl}/payments`);
      const payments = await response.json();

      const now = new Date();
      const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
      const result = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRevenue = payments
          .filter(p => p.payment_status === 'paid' && p.paid_at?.startsWith(dateStr))
          .reduce((sum, p) => sum + (p.amount * 0.1), 0);

        result.push({ date: dateStr, revenue: dayRevenue });
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error fetching revenue stats:', error);
      return { success: true, data: [] };
    }
  }

  async getRevenueStatsWithApi(period = 'week') {
    try {
      const response = await fetch(`${this.apiBaseUrl}/admin/dashboard/revenue?period=${period}`);
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
}

export const adminService = new AdminService();