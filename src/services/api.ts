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
  getMySubmissions: () => fetchWithAuth("/api/submissions/me"),
  getQuizSubmissions: (id: string) => fetchWithAuth(`/api/quizzes/${id}/submissions`),
  launchQuiz: (id: string) => fetchWithAuth(`/api/quizzes/${id}/launch`, { method: "POST" }),
  publishResults: (id: string) => fetchWithAuth(`/api/quizzes/${id}/publish-results`, { method: "POST" }),
  deleteQuiz: (id: string) => fetchWithAuth(`/api/quizzes/${id}`, { method: "DELETE" }),
  getStudyTopics: () => fetchWithAuth('/api/study-topics'),
  createStudyTopic: (data: {
    title: string;
    content: string;
    attachments?: File[];
    topicType: 'ssa' | 'quiz' | 'both';
    isGeneral?: boolean;
    dept?: string;
    year?: string;
    sem?: string;
    quizId?: number | null;
  }) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('topicType', data.topicType);
    if (data.isGeneral !== undefined) formData.append('isGeneral', data.isGeneral.toString());
    if (data.dept) formData.append('dept', data.dept);
    if (data.year) formData.append('year', data.year);
    if (data.sem) formData.append('sem', data.sem);
    if (data.quizId) formData.append('quizId', data.quizId.toString());
    if (data.attachments) {
      data.attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
    }
    return fetchWithAuth('/api/study-topics', { method: 'POST', body: formData });
  },
  deleteStudyTopic: (id: number) => fetchWithAuth(`/api/study-topics/${id}`, { method: 'DELETE' }),
  getAdminOverview: () => fetchWithAuth('/api/admin/overview'),
  getAdminFaculty: () => fetchWithAuth('/api/admin/faculty'),
  getAdminStudents: () => fetchWithAuth('/api/admin/students'),
  updateAdminFaculty: (id: number, data: { name: string; email: string; dept?: string; subject?: string; teaching_years?: string }) =>
    fetchWithAuth(`/api/admin/faculty/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminFaculty: (id: number) => fetchWithAuth(`/api/admin/faculty/${id}`, { method: 'DELETE' }),
  deleteAdminStudent: (id: number) => fetchWithAuth(`/api/admin/students/${id}`, { method: 'DELETE' }),
  cleanupNonMkceStudents: () => fetchWithAuth('/api/admin/students/cleanup', { method: 'DELETE' }),
  getAdminQuizzes: () => fetchWithAuth('/api/admin/quizzes'),
  getProfile: () => fetchWithAuth('/api/profile'),
  updateProfile: (data: { name?: string; dept?: string; year?: string; sem?: string; subject?: string; teaching_years?: string; password?: string }) =>
    fetchWithAuth('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateSubmissionScore: (submissionId: number, score: number) =>
    fetchWithAuth(`/api/submissions/${submissionId}`, { method: 'PUT', body: JSON.stringify({ score }) }),
};

export { socket };
