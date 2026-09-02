import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

function generateMeetLink(courseId) {
  return `/room/${courseId}`;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isTimeOverlap(start1, end1, start2, end2) {
  return Math.max(start1, start2) < Math.min(end1, end2);
}

function getTimeRange(item) {
  let start = 0;
  let end = 0;

  if (item.start_time && item.end_time) {
    start = timeToMinutes(item.start_time);
    end = timeToMinutes(item.end_time);
  } else if (item.time_slot && item.time_slot.includes('-')) {
    const [s, e] = item.time_slot.split('-').map(t => t.trim());
    start = timeToMinutes(s);
    end = timeToMinutes(e);
  }

  return { start, end };
}

function checkScheduleConflict(request, tutorCourses) {
  const reqDays = request.schedule_days || [];
  const { start: reqStart, end: reqEnd } = getTimeRange(request);

  if (reqDays.length === 0 || (reqStart === 0 && reqEnd === 0)) {
    return false;
  }

  for (const course of tutorCourses) {
    if (course.status !== 'active') continue;

    const courseDays = course.schedule_days || [];
    const hasCommonDay = reqDays.some(day => courseDays.includes(day));

    if (hasCommonDay) {
      const { start: cStart, end: cEnd } = getTimeRange(course);

      if (isTimeOverlap(reqStart, reqEnd, cStart, cEnd)) {
        return true;
      }
    }
  }
  return false;
}

function isTutorSuitable(request, tutor) {
  if (!tutor) return false;

  const requiredTutorLevel = (request.tutor_level || '').trim();
  const tutorLevel = (tutor.level || '').trim();

  if (requiredTutorLevel && tutorLevel && requiredTutorLevel !== tutorLevel) {
    return false;
  }

  const reqLevel = request.level || request.grade_level;
  const teachingLevels = Array.isArray(tutor.teaching_levels) ? tutor.teaching_levels : [];

  if (reqLevel && teachingLevels.length > 0 && !teachingLevels.includes(reqLevel)) {
    return false;
  }

  if (reqLevel === 'Cấp 1' && request.category_id === 'cap1_homework') {
    return true;
  }

  const categoryName = (request.category_name || '').trim().toLowerCase();
  if (!categoryName || categoryName === 'môn học') {
    return true;
  }

  const expertise = (tutor.expertise || '').toLowerCase().trim();
  if (!expertise) return false;

  const expertiseList = expertise
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const matched = expertiseList.some(exp => {
    return (
      exp === categoryName ||
      exp.includes(categoryName) ||
      categoryName.includes(exp)
    );
  });

  if (!matched && expertise.includes(categoryName)) {
    return true;
  }

  return matched;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawTutorId = searchParams.get('tutor_id');

    const reqRes = await fetch(`${API_BASE}/class_requests`, { cache: 'no-store' });
    const classRequests = await reqRes.json();

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

    const catRes = await fetch(`${API_BASE}/categories`, { cache: 'no-store' });
    const categories = await catRes.json();

    const appRes = await fetch(`${API_BASE}/request_applications`, { cache: 'no-store' });
    const applications = appRes.ok ? await appRes.json() : [];

    const enrichedData = cleanRequests.map(req => {
      let catName = 'Môn học';
      if (req.category_id === 'cap1_homework') {
        catName = 'Hỗ trợ bài tập về nhà các môn';
      } else {
        const cat = categories.find(c => c.category_id === req.category_id);
        if (cat) catName = cat.category_name;
      }
      return {
        ...req,
        category_name: catName
      };
    });

    if (!rawTutorId) {
      return NextResponse.json(enrichedData, { status: 200 });
    }

    const tutorsRes = await fetch(`${API_BASE}/tutors`, { cache: 'no-store' });
    const tutors = await tutorsRes.json();
    const matchedTutor = tutors.find(t => t.tutor_id === rawTutorId || t.user_id === rawTutorId);
    const actualTutorId = matchedTutor ? matchedTutor.tutor_id : rawTutorId;

    const coursesRes = await fetch(`${API_BASE}/courses`, { cache: 'no-store' });
    const allCourses = await coursesRes.json();
    const tutorCourses = allCourses.filter(c => c.tutor_id === actualTutorId);

    const appliedReqIds = applications
      .filter(app => app.tutor_id === actualTutorId || app.tutor_id === rawTutorId)
      .map(app => app.requests_id || app.request_id);

    const pendingApproval = [];
    const proposed = [];

    for (const reqItem of enrichedData) {
      if (appliedReqIds.includes(reqItem.requests_id || reqItem.id)) {
        pendingApproval.push(reqItem);
      } else {
        const isConflicted = checkScheduleConflict(reqItem, tutorCourses);
        const isSuitable = isTutorSuitable(reqItem, matchedTutor);

        if (!isConflicted && isSuitable) {
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

    if (body.action !== 'apply') {
      const reqId = `req-${Date.now()}`;
      const meet_link = body.meet_link || generateMeetLink(reqId);

      const newClassRequest = {
        id: reqId,
        requests_id: reqId,
        student_id: body.student_id,
        category_id: body.category_id,
        title: body.title,
        description: body.description,
        level: body.grade_level || body.level,
        price_per_session: Number(body.price_per_session),
        status: 'pending',
        schedule_days: body.schedule_days || [],
        time_slot: `${body.start_time}-${body.end_time}`,
        max_students: 1,
        total_weeks: Number(body.total_weeks || (body.schedule_type === '2_terms' ? 36 : body.schedule_type === 'custom' ? 4 : 18)),
        start_date: body.start_date,
        schedule_type: body.schedule_type || '1_term',
        tutor_level: body.tutor_level || 'Giáo viên',
        start_time: body.start_time,
        end_time: body.end_time,
        meet_link: meet_link,
        created_at: new Date().toISOString()
      };

      const dbResponse = await fetch(`${API_BASE}/class_requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClassRequest),
      });

      if (!dbResponse.ok) throw new Error('Không thể ghi dữ liệu vào JSON Server');
      const savedData = await dbResponse.json();

      return NextResponse.json({
        success: true,
        message: 'Đăng yêu cầu tạo lớp thành công!',
        data: savedData
      }, { status: 201 });
    }

    const { requests_id, tutor_id } = body;

    if (!requests_id || !tutor_id) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin requests_id hoặc tutor_id' }, { status: 400 });
    }

    const tutorsRes = await fetch(`${API_BASE}/tutors`, { cache: 'no-store' });
    const tutors = await tutorsRes.json();
    const matchedTutor = tutors.find(t => t.tutor_id === tutor_id || t.user_id === tutor_id);
    const actualTutorId = matchedTutor ? matchedTutor.tutor_id : tutor_id;

    const reqRes = await fetch(`${API_BASE}/class_requests`, { cache: 'no-store' });
    const allRequests = await reqRes.json();
    const targetRequest = Array.isArray(allRequests)
      ? allRequests.find(r => (r.requests_id || r.id) === requests_id)
      : null;

    if (!targetRequest) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy yêu cầu lớp học' }, { status: 404 });
    }

    const coursesRes = await fetch(`${API_BASE}/courses`, { cache: 'no-store' });
    const allCourses = await coursesRes.json();
    const tutorCourses = Array.isArray(allCourses)
      ? allCourses.filter(c => c.tutor_id === actualTutorId && c.status === 'active')
      : [];

    const isConflicted = checkScheduleConflict(targetRequest, tutorCourses);
    if (isConflicted) {
      return NextResponse.json({
        success: false,
        message: '⚠️ Lớp này bị trùng lịch với lớp bạn đang dạy. Vui lòng chọn lớp khác!'
      }, { status: 400 });
    }

    const appResCheck = await fetch(`${API_BASE}/request_applications`, { cache: 'no-store' });
    const existingApps = appResCheck.ok ? await appResCheck.json() : [];
    const alreadyApplied = Array.isArray(existingApps) && existingApps.some(
      app => (app.requests_id === requests_id || app.request_id === requests_id) &&
             (app.tutor_id === actualTutorId || app.tutor_id === tutor_id)
    );

    if (alreadyApplied) {
      return NextResponse.json({
        success: false,
        message: 'Bạn đã đăng ký nhận dạy lớp này rồi!'
      }, { status: 400 });
    }

    const newApp = {
      id: `app-${Date.now()}`,
      requests_id: requests_id,
      tutor_id: actualTutorId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const appRes = await fetch(`${API_BASE}/request_applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newApp)
    });

    if (!appRes.ok) throw new Error('Lỗi khi lưu đơn nhận dạy');

    return NextResponse.json({
      success: true,
      message: 'Đã đăng ký nhận dạy thành công. Vui lòng chờ học sinh duyệt!',
      data: newApp
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Lỗi xử lý hệ thống',
      error: error.message
    }, { status: 500 });
  }
}
