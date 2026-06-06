"use client";

import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa'; // Import icon kính lúp từ FontAwesome


function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');

  // Hàm xử lý khi người dùng nhấn Enter HOẶC nhấn vào kính lúp
  const handleSearchSubmit = (event) => {
    event.preventDefault(); // Ngăn trình duyệt tải lại trang (F5)
    
    if (searchTerm.trim() === '') {
      alert('Vui lòng nhập từ khóa!');
      return;
    }

    // Thực hiện hành động tìm kiếm ở đây (gọi API hoặc lọc dữ liệu)
    console.log('Đang tìm kiếm từ khóa:', searchTerm);
    alert(`Bạn đang tìm: ${searchTerm}`);
  };

  return (
    <>

      {/* Bọc trong thẻ form để dùng được tính năng nhấn Enter */}
      <form className="searchForm" onSubmit={handleSearchSubmit}>
        
        <input
          type="text"
          className="searchInput"
          placeholder="Tìm kiếm môn học, gia sư..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <button type="submit" className="searchButton" title="Tìm kiếm">
          <FaSearch size={18} /> 
        </button>

      </form>
    </>
  );
}

export default SearchComponent;