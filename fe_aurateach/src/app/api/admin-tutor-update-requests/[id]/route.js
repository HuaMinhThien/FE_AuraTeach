import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

export async function PATCH(request, { params }) {
  try {
    // 1. Nhận params (tùy thuộc vào tên thư mục [id] hoặc [tutor_update_req_id])
    const resolvedParams = await params;
    const body = await request.json();

    // Tự động nhận diện ID từ params.id, params.tutor_update_req_id hoặc body.id
    const tutor_update_req_id =
      resolvedParams?.id ||
      resolvedParams?.tutor_update_req_id ||
      body?.id;

    const { status, reject_reason } = body; // status: "approved" | "rejected"

    if (!tutor_update_req_id || !status) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin ID hoặc trạng thái xử lý" },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin chi tiết của yêu cầu chỉnh sửa từ backend
    const getReq = await fetch(`${BACKEND}/tutor_update_requests/${tutor_update_req_id}`);
    if (!getReq.ok) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy yêu cầu chỉnh sửa này" },
        { status: 404 }
      );
    }
    const updateReq = await getReq.json();

    if (status === "approved") {
      const tutorId = updateReq.tutor_id;
      const newData = { ...updateReq.new_data };

      // Tách trường phone nếu phone nằm ở bảng users chứ không nằm trong tutors
      const { phone, ...tutorFieldsToUpdate } = newData;

      // 2. Tìm thông tin gia sư trong bảng tutors (kiểm tra theo id hoặc tutor_id)
      const tutorRes = await fetch(`${BACKEND}/tutors?id=${tutorId}`);
      let tutorsList = await tutorRes.json();

      if (!Array.isArray(tutorsList) || tutorsList.length === 0) {
        // Dự phòng trường hợp tutor_id không khớp với id thực tế
        const tutorByTutorIdRes = await fetch(`${BACKEND}/tutors?tutor_id=${tutorId}`);
        tutorsList = await tutorByTutorIdRes.json();
      }

      if (Array.isArray(tutorsList) && tutorsList.length > 0) {
        const targetTutor = tutorsList[0];

        // 2a. Cập nhật bảng tutors với dữ liệu mới
        await fetch(`${BACKEND}/tutors/${targetTutor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tutorFieldsToUpdate),
        });

        // 2b. Nếu có thay đổi SĐT, cập nhật vào bảng users
        if (phone && targetTutor.user_id) {
          const userRes = await fetch(`${BACKEND}/users?user_id=${targetTutor.user_id}`);
          const usersList = await userRes.json();
          if (Array.isArray(usersList) && usersList.length > 0) {
            await fetch(`${BACKEND}/users/${usersList[0].id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone }),
            });
          }
        }
      } else {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy hồ sơ gia sư tương ứng" },
          { status: 404 }
        );
      }

      // 3. Cập nhật TRẠNG THÁI "approved" vào bảng tutor_update_requests (Thay vì DELETE)
      const updateReqRes = await fetch(`${BACKEND}/tutor_update_requests/${tutor_update_req_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          updated_at: new Date().toISOString(),
        }),
      });

      if (!updateReqRes.ok) {
        throw new Error("Không thể cập nhật trạng thái đã duyệt cho yêu cầu");
      }

      return NextResponse.json({
        success: true,
        message: "Đã duyệt và cập nhật hồ sơ gia sư thành công!",
      });

    } else if (status === "rejected") {
      // TRƯỜNG HỢP TỪ CHỐI: Cập nhật trạng thái rejected
      const updateRes = await fetch(`${BACKEND}/tutor_update_requests/${tutor_update_req_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          reject_reason: reject_reason || "Không đạt yêu cầu",
          updated_at: new Date().toISOString(),
        }),
      });

      if (!updateRes.ok) {
        throw new Error("Không thể cập nhật trạng thái từ chối");
      }

      return NextResponse.json({
        success: true,
        message: "Đã từ chối yêu cầu cập nhật thông tin!",
      });
    }

    return NextResponse.json(
      { success: false, message: "Trạng thái xử lý không hợp lệ" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Lỗi xử lý PATCH update-requests:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi xử lý yêu cầu" },
      { status: 500 }
    );
  }
}