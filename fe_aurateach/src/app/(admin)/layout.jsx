import React from "react";
import Sidebar from "@/components/admins/SidebarAdmin";
import styles from "../../css/admin-style/main.module.css";

export default function AdminLayout({ children }) {
  return (
    <div className={styles.outerContainer}>
      <div className={styles.innerLayout}>
        {/* Sidebar cố định bên trái */}
        <aside className={styles.sidebarWrapper}>
          <Sidebar />
        </aside>

        {/* Nội dung trang con cuộn bên phải */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}