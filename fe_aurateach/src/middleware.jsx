// src/middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl; // ✅ Đảm bảo pathname được khai báo ở đây
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

  // =========================================================================
  // LOGIC ĐIỀU HƯỚNG GỐC (TRANG ĐẦU TIÊN KHI MỞ TRÌNH DUYỆT / TRANG CHỦ "/")
  // =========================================================================
  if (pathname === "/") {
    if (token && role === "tutor") {
      return NextResponse.redirect(new URL("/tutor-dashboard", request.url));
    }
    if (token && role === "admin") {
      return NextResponse.redirect(new URL("/admin-dashboard", request.url));
    }
    // Nếu là student hoặc khách vãng lai chưa đăng nhập -> Cho phép xem Trang chủ bình thường
    return NextResponse.next();
  }

  // 1. Nếu chưa đăng nhập và vào route cần bảo vệ -> redirect login
  if (!token) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    if (isStudentRoute || pathname.startsWith("/tutor") || pathname.startsWith("/admin") || pathname.startsWith("/classroom-management") || pathname.startsWith("/schedule") || pathname.startsWith("/income")) {
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
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // 3. Bảo vệ và phân quyền nghiêm ngặt không cho Tutor/Admin vào nhầm luồng hoặc quay lại trang Home ngầm
  // 3. Bảo vệ và phân quyền nghiêm ngặt không cho Tutor/Admin/Student vào nhầm luồng
    if (token) {
      // 🔥 BỔ SUNG: Nếu là Student nhưng cố tình truy cập vào các trang của Tutor hoặc Admin
      if (role === "student") {
        const isTutorRoute = (pathname.startsWith("/tutor") && !pathname.startsWith("/tutorList")) || 
                            pathname.startsWith("/classroom-management") || 
                            pathname.startsWith("/schedule") || 
                            pathname.startsWith("/income");
                            
        if (isTutorRoute || pathname.startsWith("/admin")) {
          // Đá học viên quay trở lại trang chủ của student
          return NextResponse.redirect(new URL("/", request.url));
        }
      }

      // Nếu là Tutor nhưng đi lạc vào các Route của Admin hoặc Student
      if (role === "tutor" && (pathname.startsWith("/admin") || isStudentRoute)) {
        return NextResponse.redirect(new URL("/tutor-dashboard", request.url));
      }
      
      // Nếu là Admin nhưng đi lạc vào các Route của Tutor hoặc Student
      if (role === "admin" && (pathname.startsWith("/tutor") || pathname.startsWith("/classroom-management") || pathname.startsWith("/schedule") || pathname.startsWith("/income") || isStudentRoute)) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }

    return NextResponse.next();
  }

// Cấu hình matcher để định tuyến chạy qua Middleware hiệu quả
export const config = {
  matcher: [
    /*
     * Khớp tất cả các request paths trừ các trường hợp static dưới đây:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - các file ảnh có đuôi: svg, png, jpg, jpeg, gif, webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};