"use client";

import { useState } from "react";
import Image from "next/image";

export default function Avatar({ 
  src, 
  alt = "Avatar", 
  size = 40, 
  className = "",
  fallbackText = ""
}) {
  const [error, setError] = useState(false);

  // Nếu không có src hoặc có lỗi, hiển thị fallback
  if (!src || error) {
    return (
      <div 
        className={`avatar-fallback ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.4,
          fontWeight: 600,
          color: '#fff',
          flexShrink: 0,
          textTransform: 'uppercase'
        }}
      >
        {fallbackText || alt?.charAt(0) || "U"}
      </div>
    );
  }

  return (
    <div 
      className={`avatar-wrapper ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative'  // ✅ QUAN TRỌNG: thêm position: relative
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        style={{ objectFit: 'cover' }}
        onError={() => setError(true)}
        unoptimized={true}
      />
    </div>
  );
}