// src/middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("user_info")?.value;
  const role = request.cookies.get("role")?.value;

  // Route public (không cần đăng nhập)
  const publicRoutes = ["/login", "/register", "/forgot-password","/","/tutorList","/classList","/tutorList/:path*"];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Nếu chưa đăng nhập và vào route cần bảo vệ -> redirect login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Nếu đã đăng nhập và vào login/register -> redirect theo role
  if (token && isPublicRoute) {
    if (role === "student") {
      return NextResponse.redirect(new URL("/", request.url));
    } else if (role === "tutor") {
      return NextResponse.redirect(new URL("/tutor", request.url));
    } else if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Admin có thể truy cập tất cả
  if (role === "admin") {
    return NextResponse.next();
  }

  // Phân quyền student
  const studentRoutes = ["/", "/profile", "/lich-su-book", "/book-gia-su"];
  const isStudentRoute = studentRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );
  
  if (isStudentRoute && role !== "student") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Phân quyền tutor
  if (pathname.startsWith("/tutor") && role !== "tutor") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Phân quyền admin
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/tutor/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/lich-su-book/:path*",
    "/book-gia-su/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};