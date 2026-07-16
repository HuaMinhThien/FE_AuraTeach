// src/services/adminService.js
import api from '@/lib/api';

class AdminService {
  /**
   * Lấy thống kê tổng quan
   */
  async getStats() {
    try {
      console.log('📊 Fetching dashboard stats...');
      
      // Gọi API từ Laravel
      const response = await api.get('/admin/dashboard/stats');
      
      if (response.data && response.data.success) {
        return response.data;
      }
      
      // Fallback: Gọi trực tiếp các endpoints nếu cần
      const [usersRes, coursesRes, paymentsRes, tutorsRes] = await Promise.all([
        api.get('/users'),
        api.get('/courses'),
        api.get('/payments'),
        api.get('/tutors'),
      ]);

      const users = usersRes.data.data || usersRes.data || [];
      const courses = coursesRes.data.data || coursesRes.data || [];
      const payments = paymentsRes.data.data || paymentsRes.data || [];
      const tutors = tutorsRes.data.data || tutorsRes.data || [];

      const students = users.filter(u => u.role === 'student');
      const tutorsList = tutors;
      const activeCourses = courses.filter(c => c.status === 'active');
      
      const paidPayments = payments.filter(p => p.payment_status === 'paid');
      const totalRevenue = paidPayments.reduce((sum, p) => sum + (parseFloat(p.amount) * 0.1), 0);
      const pendingWithdrawals = tutorsList.reduce((sum, t) => sum + (parseFloat(t.pending_balance) || 0), 0);

      return {
        success: true,
        data: {
          totalStudents: students.length,
          totalTutors: tutorsList.length,
          totalCourses: activeCourses.length,
          totalRevenue: totalRevenue,
          pendingWithdrawals: pendingWithdrawals,
        }
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return {
        success: false,
        data: {
          totalStudents: 0,
          totalTutors: 0,
          totalCourses: 0,
          totalRevenue: 0,
          pendingWithdrawals: 0,
        }
      };
    }
  }

  /**
   * Lấy thống kê đăng ký tài khoản - Dữ liệu thực từ database
   */
  async getRegistrationStats(period = 'week') {
    try {
      console.log(`📈 Fetching registration stats (${period})...`);
      
      // Gọi API từ Laravel
      const response = await api.get('/admin/dashboard/registrations', {
        params: { period }
      });
      
      if (response.data && response.data.success) {
        return response.data;
      }
      
      // Fallback: Tính toán từ dữ liệu users
      const usersRes = await api.get('/users');
      const users = usersRes.data.data || usersRes.data || [];
      
      const now = new Date();
      const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
      const result = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayStudents = users.filter(u => 
          u.role === 'student' && 
          u.created_at && 
          u.created_at.startsWith(dateStr)
        ).length;
        
        const dayTutors = users.filter(u => 
          u.role === 'tutor' && 
          u.created_at && 
          u.created_at.startsWith(dateStr)
        ).length;

        result.push({
          date: dateStr,
          students: dayStudents,
          tutors: dayTutors,
        });
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ Error fetching registration stats:', error);
      return {
        success: false,
        data: []
      };
    }
  }

  /**
   * Lấy thống kê doanh thu - Dữ liệu thực từ database
   */
  async getRevenueStats(period = 'week') {
    try {
      console.log(`💰 Fetching revenue stats (${period})...`);
      
      // Gọi API từ Laravel
      const response = await api.get('/admin/dashboard/revenue', {
        params: { period }
      });
      
      if (response.data && response.data.success) {
        return response.data;
      }
      
      // Fallback: Tính toán từ dữ liệu payments
      const paymentsRes = await api.get('/payments');
      const payments = paymentsRes.data.data || paymentsRes.data || [];

      const now = new Date();
      const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
      const result = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRevenue = payments
          .filter(p => 
            p.payment_status === 'paid' && 
            p.paid_at && 
            p.paid_at.startsWith(dateStr)
          )
          .reduce((sum, p) => sum + (parseFloat(p.amount) * 0.1), 0);

        result.push({
          date: dateStr,
          revenue: parseFloat(dayRevenue.toFixed(2)),
        });
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('❌ Error fetching revenue stats:', error);
      return {
        success: false,
        data: []
      };
    }
  }

  /**
   * Lấy thống kê đăng ký khóa học
   */
  async getEnrollmentStats(period = 'week') {
    try {
      const response = await api.get('/admin/dashboard/enrollments', {
        params: { period }
      });
      
      if (response.data && response.data.success) {
        return response.data;
      }
      
      const subscriptionsRes = await api.get('/course-subscriptions');
      const subscriptions = subscriptionsRes.data.data || subscriptionsRes.data || [];

      const now = new Date();
      const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
      const result = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const count = subscriptions.filter(s => 
          s.created_at && s.created_at.startsWith(dateStr)
        ).length;

        result.push({
          date: dateStr,
          enrollments: count,
        });
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error fetching enrollment stats:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * Lấy top khóa học
   */
  async getTopCourses() {
    try {
      const response = await api.get('/admin/dashboard/top-courses');
      if (response.data && response.data.success) {
        return response.data;
      }
      
      const [coursesRes, subscriptionsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/course-subscriptions'),
      ]);

      const courses = coursesRes.data.data || coursesRes.data || [];
      const subscriptions = subscriptionsRes.data.data || subscriptionsRes.data || [];

      const courseStats = courses.map(course => ({
        ...course,
        students_count: subscriptions.filter(s => s.course_id === course.course_id).length
      }));

      const topCourses = courseStats
        .sort((a, b) => b.students_count - a.students_count)
        .slice(0, 5)
        .map(c => ({
          course_id: c.course_id,
          title: c.title,
          students_count: c.students_count,
        }));

      return { success: true, data: topCourses };
    } catch (error) {
      console.error('❌ Error fetching top courses:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * Lấy thống kê thanh toán
   */
  async getPaymentStats() {
    try {
      const response = await api.get('/admin/dashboard/payment-stats');
      if (response.data && response.data.success) {
        return response.data;
      }
      
      const paymentsRes = await api.get('/payments');
      const payments = paymentsRes.data.data || paymentsRes.data || [];

      return {
        success: true,
        data: {
          pending: payments.filter(p => p.payment_status === 'pending').length,
          paid: payments.filter(p => p.payment_status === 'paid').length,
          refunded: payments.filter(p => p.payment_status === 'refunded').length,
        }
      };
    } catch (error) {
      console.error('❌ Error fetching payment stats:', error);
      return { 
        success: false, 
        data: { pending: 0, paid: 0, refunded: 0 } 
      };
    }
  }
}

// Export singleton
export const adminService = new AdminService();