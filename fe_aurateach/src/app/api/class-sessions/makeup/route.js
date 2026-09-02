import { NextResponse } from 'next/server';

const JSON_SERVER_URL = process.env.NEXT_PUBLIC_JSON_SERVER_URL || 'http://localhost:3007';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      original_session_id,
      actual_date,
      start_time,
      end_time,
      tutor_note,
      tutor_id,
    } = body;

    if (!original_session_id || !actual_date || !start_time || !end_time || !tutor_id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // 1. Lấy buổi gốc
    const sessionsRes = await fetch(`${JSON_SERVER_URL}/class_sessions`, { cache: 'no-store' });
    const allSessions = await sessionsRes.json();

    const originalSession = allSessions.find(
      (s) => (s.session_id || s.id) === original_session_id
    );

    if (!originalSession) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy buổi học gốc' },
        { status: 404 }
      );
    }

    if (originalSession.session_status === 'completed') {
      return NextResponse.json(
        { success: false, message: 'Không thể tạo học bù cho buổi đã hoàn thành' },
        { status: 400 }
      );
    }

    // 2. Kiểm tra đã có buổi bù cho buổi này chưa
    const alreadyExists = allSessions.some(
      (s) => s.is_makeup === true && s.makeup_for_session_id === original_session_id
    );

    if (alreadyExists) {
      return NextResponse.json(
        { success: false, message: 'Buổi học này đã được tạo học bù rồi' },
        { status: 400 }
      );
    }

    // 3. Tạo buổi học bù mới
    const newSession = {
      session_id: `ss_makeup_${Date.now()}`,
      course_id: originalSession.course_id,
      actual_date: new Date(actual_date).toISOString(),
      start_time,
      end_time,
      lesson_title: `Buổi học bù - ${originalSession.lesson_title || 'Lớp học'}`,
      record_url: null,
      tutor_note: tutor_note || `Bù cho buổi nghỉ ngày ${new Date(originalSession.actual_date).toLocaleDateString('vi-VN')}`,
      session_status: 'scheduled',
      is_makeup: true,
      makeup_for_session_id: original_session_id,
      created_by: tutor_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const createRes = await fetch(`${JSON_SERVER_URL}/class_sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    });

    if (!createRes.ok) {
      throw new Error('Không thể lưu buổi học bù');
    }

    const saved = await createRes.json();

    return NextResponse.json({
      success: true,
      message: 'Tạo buổi học bù thành công',
      data: saved,
    });
  } catch (error) {
    console.error('Lỗi tạo học bù:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}