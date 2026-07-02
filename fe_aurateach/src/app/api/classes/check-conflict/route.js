import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get("tutorId");
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    // Trim dữ liệu để tránh dấu cách thừa làm sai lệch so sánh
    const days = searchParams.get("days")?.split(",").map(d => d.trim()) || [];
    const [newStart, newEnd] = (searchParams.get("slot") || "").split("-");

    const res = await fetch("http://localhost:8000/api/courses", { cache: "no-store" });
    if (!res.ok) throw new Error("Không thể kết nối Backend");

    const allCourses = await res.json();
    const myCourses = allCourses.filter(c => String(c.tutor_id) === String(tutorId));

    const toMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.trim().split(":").map(Number);
      return h * 60 + m;
    };

    const minNewStart = toMinutes(newStart);
    const minNewEnd = toMinutes(newEnd);

    for (const oldClass of myCourses) {
      // Bỏ qua nếu dữ liệu trống
      if (!oldClass.start_date || !oldClass.end_date || !oldClass.time_slot) continue;

      let oldDays = [];
      try {
        oldDays = typeof oldClass.schedule_days === 'string' 
          ? JSON.parse(oldClass.schedule_days) 
          : oldClass.schedule_days;
      } catch (e) { oldDays = []; }

      // So sánh ngày
      const isDateOverlap = new Date(startDate) <= new Date(oldClass.end_date) && 
                            new Date(endDate) >= new Date(oldClass.start_date);
      
      // So sánh Thứ (trim() cả mảng cũ để đảm bảo khớp)
      const hasCommonDay = oldDays.some(d => days.includes(d.trim()));
      
      if (isDateOverlap && hasCommonDay) {
        const [oldStart, oldEnd] = oldClass.time_slot.split("-");
        const minOldStart = toMinutes(oldStart);
        const minOldEnd = toMinutes(oldEnd);

        // So sánh giờ
        if (minNewStart < minOldEnd && minNewEnd > minOldStart) {
          return NextResponse.json({
            isConflict: true,
            message: `Trùng lịch với lớp: "${oldClass.class_name}" (${oldClass.time_slot})`
          });
        }
      }
    }

    return NextResponse.json({ isConflict: false });
  } catch (error) {
    return NextResponse.json({ isConflict: false, error: error.message }, { status: 500 });
  }
}