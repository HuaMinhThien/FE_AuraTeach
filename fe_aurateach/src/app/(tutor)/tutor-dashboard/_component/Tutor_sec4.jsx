"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import styles from "../_css/sec4.module.css";

export default function Tutor_sec4({ chartData }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsClient(true);
    });
    
    return () => cancelAnimationFrame(timer);
  }, []);

  const defaultData = [
    { name: "Th5", income: 12 },
    { name: "Th6", income: 18 },
    { name: "Th7", income: 15 },
    { name: "Th8", income: 22 },
    { name: "Th9", income: 20 },
    { name: "Th10", income: 25 },
  ];

  const data = chartData || defaultData;

  if (!isClient) {
    return (
      <div className={styles.container}>
        <div style={{ height: "324px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
          Đang khởi tạo biểu đồ thống kê...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.chartHeader}>
        <div className={styles.titleArea}>
          <h3>Thu nhập gần đây</h3>
          <p>Biểu đồ tăng trưởng thu nhập trong 6 tháng qua</p>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}M`} />
            <Tooltip formatter={(value) => [`${value.toLocaleString()} Triệu`, "Thu nhập"]} />
            <Bar dataKey="income" fill="#0a37a3" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}