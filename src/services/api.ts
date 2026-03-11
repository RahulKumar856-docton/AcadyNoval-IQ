import { io } from "socket.io-client";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const toApiUrl = (url: string) => `${API_URL}${url}`;
const socket = io(API_URL || undefined);

export const getAuthToken = () => localStorage.getItem("token");
export const setAuthToken = (token: string) => localStorage.setItem("token", token);
export const removeAuthToken = () => localStorage.removeItem("token");

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const response = await fetch(toApiUrl(url), { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) {
      removeAuthToken();
      window.location.reload();
    }
    throw new Error(await response.text());
  }
  return response.json();
};

export const api = {
  signup: (data: any) => fetchWithAuth("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => fetchWithAuth("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getQuizzes: () => fetchWithAuth("/api/quizzes"),
  generateQuizFromTopic: (data: { topic: string; count?: number; difficulty?: string }) =>
    fetchWithAuth("/api/quizzes/generate", { method: "POST", body: JSON.stringify(data) }),
  createQuiz: (data: any) => fetchWithAuth("/api/quizzes", { method: "POST", body: JSON.stringify(data) }),
  submitQuiz: (id: string, score: number, timeTaken?: number, accuracy?: number, answers?: Record<string, number>) => 
    fetchWithAuth(`/api/quizzes/${id}/submit`, { method: "POST", body: JSON.stringify({ score, timeTaken, accuracy, answers }) }),
  getStudentStats: () => fetchWithAuth("/api/stats/student"),
  getQuizSubmissions: (id: string) => fetchWithAuth(`/api/quizzes/${id}/submissions`),
  launchQuiz: (id: string) => fetchWithAuth(`/api/quizzes/${id}/launch`, { method: "POST" }),
  publishResults: (id: string) => fetchWithAuth(`/api/quizzes/${id}/publish-results`, { method: "POST" }),
  deleteQuiz: (id: string) => fetchWithAuth(`/api/quizzes/${id}`, { method: "DELETE" }),
  getAdminOverview: () => fetchWithAuth('/api/admin/overview'),
  getAdminFaculty: () => fetchWithAuth('/api/admin/faculty'),
  getAdminStudents: () => fetchWithAuth('/api/admin/students'),
  updateAdminFaculty: (id: number, data: { name: string; email: string; dept?: string }) =>
    fetchWithAuth(`/api/admin/faculty/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminFaculty: (id: number) => fetchWithAuth(`/api/admin/faculty/${id}`, { method: 'DELETE' }),
  getAdminQuizzes: () => fetchWithAuth('/api/admin/quizzes'),
  getProfile: () => fetchWithAuth('/api/profile'),
  updateProfile: (data: { dept?: string; year?: string; sem?: string; password?: string }) =>
    fetchWithAuth('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateSubmissionScore: (submissionId: number, score: number) =>
    fetchWithAuth(`/api/submissions/${submissionId}`, { method: 'PUT', body: JSON.stringify({ score }) }),
};

export { socket };
