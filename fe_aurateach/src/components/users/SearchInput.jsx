"use client";

import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa'; 


function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (event) => {
    event.preventDefault(); 
    
    if (searchTerm.trim() === '') {
      alert('Vui lòng nhập từ khóa!');
      return;
    }

    console.log('Đang tìm kiếm từ khóa:', searchTerm);
    alert(`Bạn đang tìm: ${searchTerm}`);
  };

  return (
    <>

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