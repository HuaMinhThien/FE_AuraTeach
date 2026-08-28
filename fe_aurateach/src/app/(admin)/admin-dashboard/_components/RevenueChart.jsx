'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function RevenueChart({ data, period = 'week' }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (period === 'year' && dateStr.includes('-')) {
      const [year, month] = dateStr.split('-');
      return `T${parseInt(month)}/${year}`;
    }
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#1f2937' }}>
            📅 {label}
          </p>
          <p style={{ margin: '4px 0', color: '#dc2626' }}>
            💰 Doanh thu: <strong>{formatCurrency(payload[0].value)}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  const chartData = (data && data.length > 0) ? data : [
    { date: '2026-01', revenue: 3500000 },
    { date: '2026-02', revenue: 5200000 },
    { date: '2026-03', revenue: 2800000 },
    { date: '2026-04', revenue: 4800000 },
    { date: '2026-05', revenue: 6500000 },
    { date: '2026-06', revenue: 3900000 },
    { date: '2026-07', revenue: 5500000 },
    { date: '2026-08', revenue: 7200000 },
  ];

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '12px' }} />
          <Bar 
            dataKey="revenue" 
            fill="#dc2626" 
            name="💰 Doanh thu"
            radius={[4, 4, 0, 0]}
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}