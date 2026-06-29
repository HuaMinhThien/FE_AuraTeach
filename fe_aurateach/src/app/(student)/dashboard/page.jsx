// src/app/(student)/dashboard/page.jsx
import { redirect } from 'next/navigation';

export default function StudentDashboard() {
  redirect('/student/profile');   // Redirect thẳng sang profile
}