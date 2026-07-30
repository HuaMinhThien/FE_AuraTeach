import { NextResponse } from "next/server";


const BACKEND = "http://localhost:3007";
// 1. API GET: Kiểm tra xem gia sư có yêu cầu đang chờ duyệt hay không
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tutor_id = searchParams.get("tutor_id");

    if (!tutor_id) {
      return NextResponse.json(
        { success: false, message: "Thiếu tutor_id" },
        { status: 400 }
      );
    }

    // Lấy danh sách yêu cầu của tutor_id có status là pending từ DB / json-server
    const res = await fetch(`${BACKEND}/tutor_update_requests?tutor_id=${tutor_id}&status=pending`);
    const pendingRequests = await res.json();

    const hasPending = Array.isArray(pendingRequests) && pendingRequests.length > 0;

    return NextResponse.json({
      success: true,
      hasPending,
      message: hasPending ? "Gia sư đang có yêu cầu chỉnh sửa chờ duyệt." : "Không có yêu cầu nào đang chờ."
    });
  } catch (error) {
    console.error("Lỗi kiểm tra yêu cầu pending:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi kết nối server." },
      { status: 500 }
    );
  }
}

// 2. API POST: Tạo yêu cầu sửa mới (có kiểm tra trùng lặp)
export async function POST(request) {
  try {
    const body = await request.json();
    const { tutor_id, old_data, new_data } = body;

    if (!tutor_id) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã gia sư (tutor_id)." },
        { status: 400 }
      );
    }

    // --- BƯỚC KIỂM TRA BẢO VỆ PHÍA SERVER ---
    const checkRes = await fetch(`${BACKEND}/tutor_update_requests?tutor_id=${tutor_id}&status=pending`);
    const existingPending = await checkRes.json();

    if (Array.isArray(existingPending) && existingPending.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Bạn đã có một yêu cầu chỉnh sửa đang chờ Admin duyệt. Không thể gửi thêm!" 
        },
        { status: 400 }
      );
    }

    // Đóng gói payload chuẩn
    const payload = {
      tutor_id,
      old_data,
      new_data,
      status: "pending",
      reject_reason: null,
      created_at: new Date().toISOString()
    };

    // Lưu vào Database
    const backendRes = await fetch("http://localhost:3007/tutor_update_requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, message: "Lỗi kết nối từ Backend server." },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();

    return NextResponse.json({
      success: true,
      message: "Gửi yêu cầu cập nhật hồ sơ thành công!",
      data
    });

  } catch (error) {
    console.error("Lỗi tại API Route Trung Gian:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống phía Server." },
      { status: 500 }
    );
  }
}