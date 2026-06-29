// src/proxy.jsx
import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("user_info")?.value;
  const role = request.cookies.get("role")?.value;

  console.log("=== PROXY ===", { pathname, role: role || "guest" });

  // Public routes - Ai cũng vào được
  const publicRoutes = [
    "/", "/login", "/register", "/register/teacher", "/forgot-password",
    "/classList", "/tutorList", "/class-search"
  ];

  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );

  // Student có thể vào profile + các trang công khai
  const studentAllowedRoutes = [
    "/profile",
    "/student/profile",
    "/lich-su-book",
    "/book-gia-su"
  ];

  const isStudentAllowed = studentAllowedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );

  // Chưa login
  if (!token) {
    if (isPublicRoute) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Đã login → redirect khỏi login/register
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));   // Về trang chủ
  }

  // Student được vào trang chủ + profile + một số trang khác
  if (role === "student") {
    if (isPublicRoute || isStudentAllowed) {
      return NextResponse.next();
    }
  }

  // Tutor và Admin giữ nguyên logic cũ
  if (role === "tutor" && pathname.startsWith("/tutor")) {
    return NextResponse.next();
  }
  if (role === "admin" && pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/classList/:path*",
    "/tutorList/:path*",
    "/profile/:path*",
    "/student/profile/:path*",
    "/tutor/:path*",
    "/admin/:path*",
  ],
};