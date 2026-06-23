// Cấu hình Metadata chuẩn cho Next.js App Router
export const metadata = {
  title: "AuraTeach - Cổng thông tin giảng viên",
  description: "Nền tảng kết nối gia sư và học viên uy tín hàng đầu Việt Nam.",
  icons: {
    icon: "/img/logo-aurateach.png", 
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}