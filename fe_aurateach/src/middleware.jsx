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
  const publicRoutes = [
    "/login", 
    "/register", 
    "/forgot-password", 
    "/tutorList", 
    "/class-search",
    "/api/bookings"
  ];
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );

  // Route đặc biệt: các route con dành riêng cho student
  const studentRoutes = ["/profile", "/lich-su-book", "/book-gia-su"];
  const isStudentRoute = studentRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );

  // Admin routes - cho phép tất cả route bắt đầu bằng /admin
  const isAdminRoute = pathname.startsWith("/admin");

  // =========================================================================
  // LOGIC ĐIỀU HƯỚNG GỐC (TRANG ĐẦU TIÊN KHI MỞ TRÌNH DUYỆT / TRANG CHỦ "/")
  // =========================================================================
  if (pathname === "/") {
    if (token && role === "tutor") {
      return NextResponse.redirect(new URL("/tutor-dashboard", request.url));
    }
    if (token && role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // 1. Nếu chưa đăng nhập và vào route cần bảo vệ -> redirect login
  if (!token) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // Cho phép truy cập admin routes mà không cần token? Không, chuyển hướng đến login
    if (isAdminRoute || isStudentRoute || pathname.startsWith("/tutor") || pathname.startsWith("/classroom-management") || pathname.startsWith("/schedule") || pathname.startsWith("/income")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 2. Nếu ĐÃ ĐĂNG NHẬP mà cố tình vào các trang đăng nhập/đăng ký -> Trả về đúng dashboard/home
  if (token && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    if (role === "student") {
      return NextResponse.redirect(new URL("/", request.url));
    } else if (role === "tutor") {
      return NextResponse.redirect(new URL("/tutor-dashboard", request.url));
    } else if (role === "admin") {
      return NextResponse.redirect(new URL("/admin-dashboard", request.url));
    }
  }

  // 3. Bảo vệ và phân quyền
  if (token) {
    // Nếu là Student, không cho vào Admin routes
    if (role === "student") {
      const isTutorRoute = (pathname.startsWith("/tutor") && !pathname.startsWith("/tutorList")) || 
                          pathname.startsWith("/classroom-management") || 
                          pathname.startsWith("/schedule") || 
                          pathname.startsWith("/income");
                          
      if (isTutorRoute || isAdminRoute) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    // Nếu là Tutor, không cho vào Admin routes hoặc Student routes
    if (role === "tutor" && (isAdminRoute || isStudentRoute)) {
      return NextResponse.redirect(new URL("/tutor-dashboard", request.url));
    }
    
    // Nếu là Admin, không cho vào Tutor routes hoặc Student routes
    if (role === "admin" && (pathname.startsWith("/tutor") || 
        pathname.startsWith("/classroom-management") || 
        pathname.startsWith("/schedule") || 
        pathname.startsWith("/income") || 
        isStudentRoute)) {
      // Cho phép admin truy cập admin routes
      if (isAdminRoute) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Cho phép admin truy cập tất cả admin routes
    if (role === "admin" && isAdminRoute) {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

// Cấu hình matcher
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};