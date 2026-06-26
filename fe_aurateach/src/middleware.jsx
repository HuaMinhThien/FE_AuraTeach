// src/middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("user_info")?.value;
  const role = request.cookies.get("role")?.value;

  console.log("=== MIDDLEWARE ===");
  console.log("Pathname:", pathname);
  console.log("Token:", token ? "exists" : "none");
  console.log("Role:", role);

  // Route public (không cần đăng nhập)
  const publicRoutes = ["/login", "/register", "/forgot-password", "/tutorList", "/class-search"];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));

  // Route đặc biệt: / và các route con của student
  const studentRoutes = ["/profile", "/lich-su-book", "/book-gia-su"];
  const isStudentRoute = studentRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));

  // 1. Nếu chưa đăng nhập và vào route cần bảo vệ -> redirect login
  if (!token) {
    // Cho phép vào public routes
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // Chặn student routes, tutor routes, admin routes
    if (isStudentRoute || pathname.startsWith("/tutor") || pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Trang chủ: cho phép (public)
    if (pathname === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Nếu đã đăng nhập và vào login/register -> redirect theo role
  if (token && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    if (role === "student") {
      return NextResponse.redirect(new URL("/", request.url));
    } else if (role === "tutor") {
      return NextResponse.redirect(new URL("/tutor", request.url));
    } else if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // 3. Admin có thể truy cập tất cả
  if (role === "admin") {
    return NextResponse.next();
  }

  // 4. Phân quyền student - chỉ student mới được vào các route này
  if (isStudentRoute && role !== "student") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 5. Phân quyền tutor
  if (pathname.startsWith("/tutor") && role !== "tutor") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 6. Phân quyền admin
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 7. Trang chủ: student được vào
  if (pathname === "/" && role === "student") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/profile/:path*",
    "/lich-su-book/:path*",
    "/book-gia-su/:path*",
    "/tutor/:path*",
    "/admin/:path*",
    "/tutorList/:path*",
    "/class-search/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};