// src/app/api/payments/manual-pay/[id]/route.js
import { NextResponse } from 'next/server';

const API_BASE = 'http://localhost:3007';

export async function POST(request, { params }) {
  const { id } = params;
  
  // Chỉ cho phép trong môi trường development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      message: 'Chỉ dùng trong môi trường development'
    }, { status: 403 });
  }

  try {
    // Tìm booking theo ID
    const findRes = await fetch(`${API_BASE}/bookings?booking_id=${id}`, { cache: 'no-store' });
    const bookings = await findRes.json();
    const booking = bookings[0];

    if (!booking) {
      // Nếu không tìm thấy theo booking_id, thử tìm theo id JSON Server
      const allBookingsRes = await fetch(`${API_BASE}/bookings`, { cache: 'no-store' });
      const allBookings = await allBookingsRes.json();
      const foundBooking = allBookings.find(b => b.id === id || b.booking_id === id);
      
      if (!foundBooking) {
        return NextResponse.json({
          success: false,
          message: 'Không tìm thấy booking'
        }, { status: 404 });
      }
      
      // Gán booking tìm được
      booking = foundBooking;
    }

    // Kiểm tra nếu booking đã được thanh toán
    if (booking.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        status: 'paid',
        message: 'Booking đã được thanh toán trước đó',
        data: { booking_id: booking.booking_id, payment_status: 'paid' }
      });
    }

    console.log(`💳 Manual pay processing booking: ${booking.booking_id}`);

    // Cập nhật booking: confirmed + paid
    const updateResponse = await fetch(`${API_BASE}/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'confirmed',
        payment_status: 'paid',
        transaction_id: `txn_${Date.now()}`,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('Không thể cập nhật booking');
    }

    const updatedBooking = await updateResponse.json();

    // === GỬI THÔNG BÁO VÀ CẬP NHẬT VÍ ===
    try {
      // Tìm thông tin course
      const courseRes = await fetch(`${API_BASE}/courses?course_id=${booking.course_id}`, { cache: 'no-store' });
      const courses = await courseRes.json();
      const course = Array.isArray(courses) ? courses[0] : courses;
      const courseTitle = course?.title || 'Khóa học';

      // Tìm thông tin student
      const studentRes = await fetch(`${API_BASE}/users?user_id=${booking.student_id}`, { cache: 'no-store' });
      const students = await studentRes.json();
      const studentInfo = Array.isArray(students) ? students[0] : students;
      const studentName = studentInfo?.full_name || 'Học viên';

      // Tìm thông tin tutor - QUAN TRỌNG
      let tutorInfo = null;
      let tutorUserId = null;
      
      // Thử tìm theo tutor_id
      const tutorRes1 = await fetch(`${API_BASE}/tutors?tutor_id=${booking.tutor_id}`, { cache: 'no-store' });
      const tutorData1 = await tutorRes1.json();
      const tutorArr1 = Array.isArray(tutorData1) ? tutorData1 : [];
      
      if (tutorArr1.length > 0) {
        tutorInfo = tutorArr1[0];
        tutorUserId = tutorInfo.user_id;
      } else {
        // Fallback: tìm theo user_id
        const tutorRes2 = await fetch(`${API_BASE}/tutors?user_id=${booking.tutor_id}`, { cache: 'no-store' });
        const tutorData2 = await tutorRes2.json();
        const tutorArr2 = Array.isArray(tutorData2) ? tutorData2 : [];
        if (tutorArr2.length > 0) {
          tutorInfo = tutorArr2[0];
          tutorUserId = tutorInfo.user_id;
        }
      }

      const amount = booking.payment_amount || 0;

      // === CẬP NHẬT VÍ TUTOR ===
      if (tutorInfo && tutorInfo.id) {
        const currentPending = tutorInfo.pending_balance || 0;
        const currentTotalEarnings = tutorInfo.total_earnings || 0;
        
        // Phí sàn 39%: Tutor nhận 61%
        const tutorEarning = Math.round(amount * 0.61);
        const adminFee = amount - tutorEarning;

        console.log(`💰 [Manual Pay] Cập nhật ví:`, {
          tutorId: tutorInfo.tutor_id,
          tutorUserId: tutorUserId,
          amount: amount,
          tutorEarning: tutorEarning,
          currentPending: currentPending,
          newPending: currentPending + tutorEarning
        });

        const updateWalletRes = await fetch(`${API_BASE}/tutors/${tutorInfo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pending_balance: currentPending + tutorEarning,
            total_earnings: currentTotalEarnings + tutorEarning,
            updated_at: new Date().toISOString(),
          }),
        });

        if (updateWalletRes.ok) {
          console.log(`💰 [Manual Pay] Tutor wallet updated: ${currentPending} → ${currentPending + tutorEarning}`);
        } else {
          console.error("❌ Lỗi cập nhật ví tutor manual pay:", await updateWalletRes.text());
        }
      }

      // Gửi notification cho tutor
      if (tutorUserId) {
        const tutorNotif = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          receiver_id: tutorUserId,
          receiver_role: 'tutor',
          type: 'payment',
          title: '💰 Thanh toán thành công',
          message: `Học viên ${studentName} đã thanh toán ${amount.toLocaleString('vi-VN')}đ cho khóa học "${courseTitle}".`,
          related_id: booking.booking_id,
          related_type: 'payment',
          is_read: false,
          created_at: new Date().toISOString(),
        };
        await fetch(`${API_BASE}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tutorNotif),
        });
        console.log(`📬 [Manual Pay] Tutor notif sent to: ${tutorUserId}`);
      }

      // Gửi notification cho admin
      const adminNotif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        receiver_id: 'u-admin-1',
        receiver_role: 'admin',
        type: 'payment',
        title: '💰 Thanh toán mới',
        message: `Học viên ${studentName} đã thanh toán ${amount.toLocaleString('vi-VN')}đ cho khóa học "${courseTitle}".`,
        related_id: booking.booking_id,
        related_type: 'payment',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminNotif),
      });
      console.log(`📬 [Manual Pay] Admin notif sent`);

    } catch (notifError) {
      console.error('⚠️ [Manual Pay] Lỗi gửi thông báo:', notifError);
    }

    return NextResponse.json({
      success: true,
      status: 'paid',
      message: 'Thanh toán thành công!',
      data: {
        booking_id: booking.booking_id,
        payment_status: 'paid',
        status: 'confirmed',
      }
    });

  } catch (error) {
    console.error('❌ Manual pay error:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}