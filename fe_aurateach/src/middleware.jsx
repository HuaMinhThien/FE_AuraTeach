// src/middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("user_info")?.value;
  const role = request.cookies.get("role")?.value;
  
  const sessionToken = request.cookies.get("next-auth.session-token")?.value;
  const isGoogleAuth = !!sessionToken;

  console.log("=== MIDDLEWARE ===");
  console.log("Pathname:", pathname);
  console.log("Token (user_info):", token ? "exists" : "none");
  console.log("Session Token (NextAuth):", sessionToken ? "exists" : "none");
  console.log("Role:", role);

  // Bỏ qua các request không cần thiết
  if (pathname.startsWith("/_next/") || 
      pathname.startsWith("/favicon.ico") || 
      pathname.startsWith("/img/") || 
      pathname.startsWith("/images/") ||
      pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  // Cho phép tất cả API routes của NextAuth
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Nếu đang ở /login, cho phép truy cập
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // ✅ Nếu đã logout (không có user_info) nhưng vẫn có session token
  // KHÔNG redirect, để trang login xử lý
  if (!token && isGoogleAuth && pathname !== "/login") {
    // Chỉ redirect nếu không phải trang login
    // Nhưng nếu đã ở /login, không redirect
    console.log("🔄 Session tồn tại nhưng chưa có user_info, chuyển đến login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Route public
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

  const studentRoutes = ["/profile", "/lich-su-book", "/book-gia-su"];
  const isStudentRoute = studentRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );

  const isAdminRoute = pathname.startsWith("/admin");

  // Logic điều hướng
  if (pathname === "/") {
    if (token && role === "tutor") {
      return NextResponse.redirect(new URL("/tutor-dashboard", request.url));
    }
    if (token && role === "admin") {
      return NextResponse.redirect(new URL("/admin-dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Chưa đăng nhập
  if (!token && !isGoogleAuth) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    if (isAdminRoute || isStudentRoute || pathname.startsWith("/tutor") || pathname.startsWith("/classroom-management") || pathname.startsWith("/schedule") || pathname.startsWith("/income")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Đã đăng nhập nhưng vào trang login
  if ((token || isGoogleAuth) && (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password")) {
    // ✅ Nếu chỉ có session token mà không có user_info, cho phép vào login
    if (isGoogleAuth && !token) {
      return NextResponse.next();
    }
    
    if (role === "student") {
      return NextResponse.redirect(new URL("/", request.url));
    } else if (role === "tutor") {
      return NextResponse.redirect(new URL("/tutor-dashboard", request.url));
    } else if (role === "admin") {
      return NextResponse.redirect(new URL("/admin-dashboard", request.url));
    }
  }

  // Phân quyền
  if (token || isGoogleAuth) {
    if (token && !role) {
      return NextResponse.next();
    }
    
    if (role === "student") {
      const isTutorRoute = (pathname.startsWith("/tutor") && !pathname.startsWith("/tutorList")) || 
                          pathname.startsWith("/classroom-management") || 
                          pathname.startsWith("/schedule") || 
                          pathname.startsWith("/income");
                          
      if (isTutorRoute || isAdminRoute) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    if (role === "tutor" && (isAdminRoute || isStudentRoute)) {
      return NextResponse.redirect(new URL("/tutor-dashboard", request.url));
    }
    
    if (role === "admin" && (pathname.startsWith("/tutor") || 
        pathname.startsWith("/classroom-management") || 
        pathname.startsWith("/schedule") || 
        pathname.startsWith("/income") || 
        isStudentRoute)) {
      if (isAdminRoute) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (role === "admin" && isAdminRoute) {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};