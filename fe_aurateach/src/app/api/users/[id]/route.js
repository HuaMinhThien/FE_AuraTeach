// src/app/api/users/[id]/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request, { params }) {
  try {
    // Trong Next.js 16, params là Promise, cần await
    const { id } = await params;
    console.log("=== GET USER API ===");
    console.log("User ID:", id);
    
    // Tìm file data.json
    const possiblePaths = [
      path.join(process.cwd(), "src", "data.json"),
      path.join(process.cwd(), "data.json"),
      path.join(process.cwd(), "src", "app", "api", "data.json"),
    ];

    let dataPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        dataPath = p;
        console.log("✅ Found data.json at:", p);
        break;
      }
    }

    if (!dataPath) {
      console.error("❌ data.json not found");
      return NextResponse.json(
        { message: "Không tìm thấy dữ liệu" },
        { status: 500 }
      );
    }

    const jsonData = fs.readFileSync(dataPath, "utf8");
    const data = JSON.parse(jsonData);

    // Tìm user theo id
    const user = data.users.find((u) => u.user_id === id);

    if (!user) {
      console.log("❌ User not found:", id);
      return NextResponse.json(
        { message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    // Xóa password
    const { password, ...userInfo } = user;
    console.log("✅ User found:", userInfo.email);

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