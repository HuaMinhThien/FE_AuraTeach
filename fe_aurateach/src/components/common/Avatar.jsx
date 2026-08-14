"use client";

import { useState } from "react";
import Image from "next/image";

// Định nghĩa link avatar mặc định của bạn ở đây để dễ quản lý
const DEFAULT_AVATAR = "https://res.cloudinary.com/ghbrskob/image/upload/v1786662834/avatar-mac-dinh-cua-fb-4.webp";

export default function Avatar({ 
  src, 
  alt = "Avatar", 
  size = 40, 
  className = "",
  fallbackText = ""
}) {
  const [error, setError] = useState(false);

  // Sử dụng src truyền vào, nếu không có hoặc bị lỗi thì dùng DEFAULT_AVATAR
  const imageSrc = (!src || error) ? DEFAULT_AVATAR : src;

  return (
    <div 
      className={`avatar-wrapper ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <Image
        src={imageSrc}
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