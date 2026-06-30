// src/app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/app/api/data.json');

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get('user_info');

    if (!userInfoCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Lấy thông tin từ cookie mã hóa/luu trữ dạng string JSON
    const parsedCookie = JSON.parse(userInfoCookie.value);
    
    // Đọc data.json từ server một cách an toàn để verify thông tin mới nhất
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    const data = JSON.parse(fileData);
    
    const user = data.users.find(u => u.user_id === parsedCookie.user_id);
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Ẩn password trước khi trả về client
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}