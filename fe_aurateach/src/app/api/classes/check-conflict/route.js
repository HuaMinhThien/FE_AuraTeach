import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const days = searchParams.get("days")?.split(",") || [];
    const [newStart, newEnd] = (searchParams.get("slot") || "").split("-");

    // Lấy dữ liệu từ JSON Server để đối chiếu chéo
    const res = await fetch("http://localhost:3007/classByIdTutor", { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ success: true, isConflict: false });

    const jsonServerData = await res.json();
    let rawCourses = Array.isArray(jsonServerData) ? jsonServerData : (jsonServerData.courses || []);

    const toMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    const minNewStart = toMinutes(newStart);
    const minNewEnd = toMinutes(newEnd);

    for (const oldClass of rawCourses) {
      const oldStartClass = oldClass.start_date;
      const oldEndClass = oldClass.end_date;

      // 1. Kiểm tra giao thoa khoảng ngày thực chạy
      const isDateOverlap = startDate <= oldEndClass && endDate >= oldStartClass;
      
      if (isDateOverlap) {
        // 2. Kiểm tra xem có chung Thứ học không
        const oldDays = oldClass.schedule_days || [];
        const hasCommonDay = oldDays.some(d => days.includes(d));
        
        if (hasCommonDay) {
          // 3. Kiểm tra va chạm khung giờ học
          const [oldStart, oldEnd] = (oldClass.time_slot || "").split("-");
          if (oldStart && oldEnd) {
            const minOldStart = toMinutes(oldStart);
            const minOldEnd = toMinutes(oldEnd);

            if (minNewStart < minOldEnd && minNewEnd > minOldStart) {
              return NextResponse.json({
                success: false,
                isConflict: true,
                message: `Khung giờ này bạn đã bị trùng lịch với lớp: "${oldClass.title || oldClass.class_name}" (${oldClass.time_slot})`
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, isConflict: false });
  } catch (error) {
    console.error("Lỗi hệ thống API Check Conflict:", error);
    return NextResponse.json({ success: false, message: "Lỗi xử lý kiểm định." }, { status: 500 });
  }
}