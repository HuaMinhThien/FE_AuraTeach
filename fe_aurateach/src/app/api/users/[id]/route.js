// src/app/api/users/[id]/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper: Đọc dữ liệu từ file
function readDataFile() {
  const possiblePaths = [
    path.join(process.cwd(), "src", "app", "api", "data.json"),
    path.join(process.cwd(), "src", "data.json"),
    path.join(process.cwd(), "data.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const jsonData = fs.readFileSync(p, "utf8");
      return { data: JSON.parse(jsonData), path: p };
    }
  }
  throw new Error("data.json not found");
}

// Helper: Ghi dữ liệu vào file
function writeDataFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// GET: Lấy thông tin user
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { data } = readDataFile();

    const user = data.users.find((u) => u.user_id === id);

    if (!user) {
      return NextResponse.json(
        { message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const { password, ...userInfo } = user;
    return NextResponse.json({
      success: true,
      user: userInfo,
    });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    return NextResponse.json(
      { message: "Đã có lỗi xảy ra: " + error.message },
      { status: 500 }
    );
  }
}

// ✅ PATCH: Cập nhật thông tin user
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log("📝 PATCH /api/users/[id] - User ID:", id);
    console.log("📝 Update data:", body);

    const { data, path: filePath } = readDataFile();

    // Tìm user cần cập nhật
    const userIndex = data.users.findIndex((u) => u.user_id === id);

    if (userIndex === -1) {
      return NextResponse.json(
        { message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    // Cập nhật thông tin user (không cho phép thay đổi role, password, user_id)
    const allowedFields = ["full_name", "phone", "avatar", "birth_date"];
    const updatedUser = { ...data.users[userIndex] };

    for (const field of allowedFields) {
      if (body[field] !== undefined && body[field] !== null) {
        updatedUser[field] = body[field];
      }
    }

    // Cập nhật thêm updated_at
    updatedUser.updated_at = new Date().toISOString();

    // Lưu lại
    data.users[userIndex] = updatedUser;
    writeDataFile(filePath, data);

    // Cập nhật student info nếu có
    if (body.grade !== undefined || body.school_name !== undefined) {
      const studentIndex = data.students.findIndex((s) => s.user_id === id);
      if (studentIndex !== -1) {
        const updatedStudent = { ...data.students[studentIndex] };
        if (body.grade !== undefined) updatedStudent.grade = body.grade;
        if (body.school_name !== undefined) updatedStudent.school_name = body.school_name;
        data.students[studentIndex] = updatedStudent;
        writeDataFile(filePath, data);
      }
    }

    // Trả về user đã cập nhật (không bao gồm password)
    const { password, ...userInfo } = updatedUser;
    console.log("✅ Updated user:", userInfo.email);

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      user: userInfo,
    });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    return NextResponse.json(
      { message: "Đã có lỗi xảy ra: " + error.message },
      { status: 500 }
    );
  }
}