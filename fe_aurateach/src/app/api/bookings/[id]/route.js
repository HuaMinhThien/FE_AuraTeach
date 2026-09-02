import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

// GET: Lấy chi tiết booking theo ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const res = await fetch(`${API_BASE}/bookings?booking_id=${id}`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Không thể lấy thông tin booking" },
        { status: 500 }
      );
    }

    const bookings = await res.json();
    const booking = bookings[0];

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy booking" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: booking });

  } catch (error) {
    console.error("Lỗi GET /api/bookings/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}

// PATCH: Cập nhật trạng thái booking
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, payment_status, notes } = body;

    // Tìm booking hiện tại
    const findRes = await fetch(`${API_BASE}/bookings?booking_id=${id}`);
    const bookings = await findRes.json();
    const currentBooking = bookings[0];

    if (!currentBooking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy booking" },
        { status: 404 }
      );
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;
    if (notes !== undefined) updateData.notes = notes;

    // Nếu status là confirmed, cập nhật payment_status thành paid (nếu chưa có)
    if (status === 'confirmed' && currentBooking.payment_status === 'unpaid') {
      updateData.payment_status = 'paid';
    }

    // Nếu status là completed, không cho phép thay đổi
    if (currentBooking.status === 'completed') {
      return NextResponse.json(
        { success: false, message: "Không thể thay đổi booking đã hoàn thành" },
        { status: 400 }
      );
    }

    // Cập nhật booking
    const updateRes = await fetch(`${API_BASE}/bookings/${currentBooking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData)
    });

    if (!updateRes.ok) {
      throw new Error("Không thể cập nhật booking");
    }

    // Nếu hủy booking (cancelled) -> Xóa student khỏi course
    if (status === 'cancelled') {
      const courseRes = await fetch(`${API_BASE}/courses?course_id=${currentBooking.course_id}`);
      const courses = await courseRes.json();
      const course = courses[0];

      if (course) {
        const updatedStudents = course.students.filter(s => s !== currentBooking.student_id);
        await fetch(`${API_BASE}/courses/${course.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: updatedStudents })
        });
      }
    }

    const updatedBooking = { ...currentBooking, ...updateData };

    return NextResponse.json({
      success: true,
      message: "Cập nhật booking thành công",
      data: updatedBooking
    });

  } catch (error) {
    console.error("Lỗi PATCH /api/bookings/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}

// DELETE: Hủy booking
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Tìm booking hiện tại
    const findRes = await fetch(`${API_BASE}/bookings?booking_id=${id}`);
    const bookings = await findRes.json();
    const currentBooking = bookings[0];

    if (!currentBooking) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy booking" },
        { status: 404 }
      );
    }

    // Chỉ cho phép xóa nếu status là pending hoặc cancelled
    if (currentBooking.status === 'confirmed') {
      return NextResponse.json(
        { success: false, message: "Không thể xóa booking đã xác nhận" },
        { status: 400 }
      );
    }

    if (currentBooking.status === 'completed') {
      return NextResponse.json(
        { success: false, message: "Không thể xóa booking đã hoàn thành" },
        { status: 400 }
      );
    }

    // Xóa booking
    const deleteRes = await fetch(`${API_BASE}/bookings/${currentBooking.id}`, {
      method: "DELETE"
    });

    if (!deleteRes.ok) {
      throw new Error("Không thể xóa booking");
    }

    // Xóa student khỏi course
    const courseRes = await fetch(`${API_BASE}/courses?course_id=${currentBooking.course_id}`);
    const courses = await courseRes.json();
    const course = courses[0];

    if (course) {
      const updatedStudents = course.students.filter(s => s !== currentBooking.student_id);
      await fetch(`${API_BASE}/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: updatedStudents })
      });
    }

    return NextResponse.json({
      success: true,
      message: "Hủy booking thành công"
    });

  } catch (error) {
    console.error("Lỗi DELETE /api/bookings/[id]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi server" },
      { status: 500 }
    );
  }
}