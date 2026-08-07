import { NextResponse } from 'next/server';

function generateMeetLink() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segment = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${segment(3)}-${segment(4)}-${segment(3)}`;
}

// Hàm hỗ trợ chuyển đổi chuỗi giờ "HH:MM" sang phút
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Kiểm tra 2 khoảng thời gian có bị chồng lấp (overlapping) hay không
function isTimeOverlap(start1, end1, start2, end2) {
  return Math.max(start1, start2) < Math.min(end1, end2);
}

// Kiểm tra yêu cầu tạo lớp có bị trùng lịch với các khóa học/lớp dạy hiện tại của gia sư không
function checkScheduleConflict(request, tutorCourses) {
  const reqDays = request.schedule_days || [];
  const reqStart = timeToMinutes(request.start_time);
  const reqEnd = timeToMinutes(request.end_time);

  for (const course of tutorCourses) {
    if (course.status !== 'active') continue;

    const courseDays = course.schedule_days || [];
    // Kiểm tra xem có giao nhau về ngày học không (ví dụ: cùng có Thứ 2)
    const hasCommonDay = reqDays.some(day => courseDays.includes(day));

    if (hasCommonDay) {
      let cStart = 0;
      let cEnd = 0;

      if (course.time_slot && course.time_slot.includes('-')) {
        const [s, e] = course.time_slot.split('-');
        cStart = timeToMinutes(s);
        cEnd = timeToMinutes(e);
      } else {
        cStart = timeToMinutes(course.start_time);
        cEnd = timeToMinutes(course.end_time);
      }

      if (isTimeOverlap(reqStart, reqEnd, cStart, cEnd)) {
        return true; // Trùng lịch
      }
    }
  }
  return false;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawTutorId = searchParams.get('tutor_id');

    // 1. Lấy danh sách yêu cầu lớp học
    const reqRes = await fetch("http://localhost:3007/class_requests", { cache: 'no-store' });
    const classRequests = await reqRes.json();

    // Khử trùng lặp bản ghi nếu json-server bị ghi lặp
    const uniqueRequestsMap = new Map();
    if (Array.isArray(classRequests)) {
      classRequests.forEach((item) => {
        const key = item.id || item.requests_id;
        if (key && !uniqueRequestsMap.has(key)) {
          uniqueRequestsMap.set(key, item);
        }
      });
    }
    const cleanRequests = Array.from(uniqueRequestsMap.values());

    // 2. Lấy danh sách danh mục (categories)
    const catRes = await fetch("http://localhost:3007/categories", { cache: 'no-store' });
    const categories = await catRes.json();

    // 3. Lấy danh sách đăng ký ứng tuyển (request_applications)
    const appRes = await fetch("http://localhost:3007/request_applications", { cache: 'no-store' });
    const applications = appRes.ok ? await appRes.json() : [];

    // Nếu không truyền tutor_id, trả về danh sách đã được enrich tên môn học
    const enrichedData = cleanRequests.map(req => {
      const cat = categories.find(c => c.category_id === req.category_id);
      return {
        ...req,
        category_name: cat ? cat.category_name : 'Môn học'
      };
    });

    if (!rawTutorId) {
      return NextResponse.json(enrichedData, { status: 200 });
    }

    // Tra cứu danh sách Tutors để map chính xác giữa user_id và tutor_id nếu truyền vào user_id
    const tutorsRes = await fetch("http://localhost:3007/tutors", { cache: 'no-store' });
    const tutors = await tutorsRes.json();
    const matchedTutor = tutors.find(t => t.tutor_id === rawTutorId || t.user_id === rawTutorId);
    const actualTutorId = matchedTutor ? matchedTutor.tutor_id : rawTutorId;

    // 4. Lấy tất cả khóa học/lớp dạy của Gia sư để kiểm tra trùng lịch
    const coursesRes = await fetch("http://localhost:3007/courses", { cache: 'no-store' });
    const allCourses = await coursesRes.json();
    const tutorCourses = allCourses.filter(c => c.tutor_id === actualTutorId);

    // Lọc ra các ID lớp mà gia sư này đã bấm nhận dạy (đang chờ duyệt hoặc đã chấp nhận)
    const appliedReqIds = applications
      .filter(app => app.tutor_id === actualTutorId || app.tutor_id === rawTutorId)
      .map(app => app.requests_id || app.request_id);

    // Phân loại:
    // - pending_approval: Lớp mà gia sư đã đăng ký nhận dạy và chờ học sinh chọn
    // - proposed: Lớp mở chưa nhận, đã được lọc bỏ các lớp trùng lịch dạy
    const pendingApproval = [];
    const proposed = [];

    for (const reqItem of enrichedData) {
      if (appliedReqIds.includes(reqItem.requests_id || reqItem.id)) {
        pendingApproval.push(reqItem);
      } else {
        const isConflicted = checkScheduleConflict(reqItem, tutorCourses);
        if (!isConflicted) {
          proposed.push(reqItem);
        }
      }
    }

    return NextResponse.json({
      proposed_classes: proposed,
      pending_classes: pendingApproval
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Trường hợp 1: Tạo mới một yêu cầu lớp học từ phía Học sinh
    if (body.action !== 'apply') {
      const reqId = `req-${Date.now()}`;
      const meet_link = body.meet_link || generateMeetLink();

      const newClassRequest = {
        id: reqId,
        requests_id: reqId,
        student_id: body.student_id,
        category_id: body.category_id,
        title: body.title,
        description: body.description,
        level: body.grade_level || body.level,
        price_per_session: Number(body.price_per_session),
        status: "pending",
        schedule_days: body.schedule_days || [],
        time_slot: `${body.start_time}-${body.end_time}`,
        max_students: Number(body.max_students || 1),
        total_weeks: Number(body.total_weeks || 12),
        start_date: body.start_date,
        schedule_type: body.schedule_type || "1_term",
        tutor_level: body.tutor_level || "Giáo viên",
        start_time: body.start_time,
        end_time: body.end_time,
        meet_link: meet_link,
        created_at: new Date().toISOString()
      };

      const dbResponse = await fetch("http://localhost:3007/class_requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClassRequest),
      });

      if (!dbResponse.ok) throw new Error("Không thể ghi dữ liệu vào JSON Server");
      const savedData = await dbResponse.json();

      return NextResponse.json({
        success: true,
        message: "Đăng yêu cầu tạo lớp thành công!",
        data: savedData
      }, { status: 201 });
    }

    // Trường hợp 2: Gia sư bấm "Nhận dạy" lớp tạo theo nhu cầu
    const { requests_id, tutor_id } = body;

    if (!requests_id || !tutor_id) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin requests_id hoặc tutor_id" }, { status: 400 });
    }

    // Tra cứu Tutors để lấy tutor_id chính xác nếu truyền vào user_id
    const tutorsRes = await fetch("http://localhost:3007/tutors", { cache: 'no-store' });
    const tutors = await tutorsRes.json();
    const matchedTutor = tutors.find(t => t.tutor_id === tutor_id || t.user_id === tutor_id);
    const actualTutorId = matchedTutor ? matchedTutor.tutor_id : tutor_id;

    // Ghi nhận đơn ứng tuyển vào bảng request_applications
    const newApp = {
      id: `app-${Date.now()}`,
      requests_id: requests_id,
      tutor_id: actualTutorId,
      status: "pending",
      created_at: new Date().toISOString()
    };

    const appRes = await fetch("http://localhost:3007/request_applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newApp)
    });

    if (!appRes.ok) throw new Error("Lỗi khi lưu đơn nhận dạy");

    return NextResponse.json({
      success: true,
      message: "Đã đăng ký nhận dạy thành công. Vui lòng chờ học sinh duyệt!",
      data: newApp
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Lỗi xử lý hệ thống",
      error: error.message
    }, { status: 500 });
  }
}