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

export default function RegistrationChart({ data, period = 'week' }) {
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
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
              {entry.name}: <strong>{entry.value}</strong> người
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartData = (data && data.length > 0) ? data : [
    { date: '2026-01', students: 15, tutors: 5 },
    { date: '2026-02', students: 20, tutors: 7 },
    { date: '2026-03', students: 18, tutors: 6 },
    { date: '2026-04', students: 25, tutors: 8 },
    { date: '2026-05', students: 30, tutors: 10 },
    { date: '2026-06', students: 22, tutors: 7 },
    { date: '2026-07', students: 28, tutors: 9 },
    { date: '2026-08', students: 35, tutors: 12 },
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
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '12px' }} />
          <Bar 
            dataKey="students" 
            fill="#4f46e5" 
            name="👨‍🎓 Học viên"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
          <Bar 
            dataKey="tutors" 
            fill="#059669" 
            name="👨‍🏫 Gia sư"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}