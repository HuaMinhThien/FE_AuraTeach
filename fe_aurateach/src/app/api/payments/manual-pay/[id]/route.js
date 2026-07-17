// src/app/api/payments/manual-pay/[id]/route.js
import { NextResponse } from 'next/server';

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
    // Tìm booking và cập nhật status
    const response = await fetch(`http://localhost:3007/bookings`, {
      method: 'GET',
    });
    const bookings = await response.json();
    
    // Tìm booking dựa trên payment_id (trong data.json)
    // Thực tế bạn cần lưu payment_id trong booking
    
    // Mock: Tìm booking có status pending
    const booking = bookings.find(b => b.status === 'pending');
    
    if (!booking) {
      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy booking đang chờ'
      }, { status: 404 });
    }

    // Cập nhật booking
    const updateResponse = await fetch(`http://localhost:3007/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'confirmed',
        payment_status: 'paid'
      }),
    });

    if (!updateResponse.ok) {
      throw new Error('Không thể cập nhật booking');
    }

    return NextResponse.json({
      success: true,
      status: 'paid',
      message: 'Thanh toán thành công (test mode)'
    });

  } catch (error) {
    console.error('Manual pay error:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}