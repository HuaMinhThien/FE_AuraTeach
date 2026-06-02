import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("role")?.value;

  // 1. Danh sách các trang Học sinh cần phải đăng nhập mới được vào
  const isStudentPrivateRoute = 
    pathname.startsWith("/profile") || 
    pathname.startsWith("/lich-su-book") || 
    pathname.startsWith("/book-gia-su");

  // 2. Nếu vào trang riêng tư của học sinh mà chưa đăng nhập hoặc sai role
  if (isStudentPrivateRoute && role !== "student") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Bảo vệ các tuyến đường của Tutor và Admin như cũ
  if (pathname.startsWith("/tutor") && role !== "tutor") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Cấu hình quét tất cả các route cần bảo mật
export const config = {
  matcher: [
    "/tutor/:path*", 
    "/admin/:path*",
    "/profile/:path*",
    "/lich-su-book/:path*",
    "/book-gia-su/:path*"
  ],
};