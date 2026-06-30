import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json();
  
  // Chuyển tiếp tới Laravel (Cổng 8000)
  const res = await fetch("http://localhost:8000/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}