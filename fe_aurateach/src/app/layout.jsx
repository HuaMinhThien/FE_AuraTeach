
export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
