"use client";
import React, { useState } from "react";
import { Search } from "lucide-react";
import "./SearchInput.css"; 

export default function SearchInput({ onSearch }) {
  const [keyword, setKeyword] = useState("");

  const handleInputChange = (e) => {
    const value = e.target.value;
    setKeyword(value);
    if (onSearch) onSearch(value); 
  };

  return (
    <div className="search-container">
      <Search className="search-icon" size={20} />
      <input
        type="text"
        className="search-field"
        placeholder="Tìm kiếm môn học, gia sư..."
        value={keyword}
        onChange={handleInputChange}
      />
    </div>
  );
}