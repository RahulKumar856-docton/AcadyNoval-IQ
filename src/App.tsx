import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import FacultyDashboard from './components/FacultyDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProfilePage from './components/ProfilePage';
import SubmissionsPage from './components/SubmissionsPage';
import EvaluationPage from './components/EvaluationPage';
import { User } from './types';
import { getAuthToken, removeAuthToken } from './services/api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (e) {
        removeAuthToken();
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (newUser: User, token: string) => {
    setUser(newUser);
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    removeAuthToken();
  };

  const handleUpdateUser = (updatedFields: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedFields });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center landing-shell">
        <div className="content-card reveal-pop max-w-sm text-center">
          <div className="brand-mark mx-auto mb-4">A</div>
          <h2 className="card-title mb-2">Preparing Your Workspace</h2>
          <p className="card-subtitle">Loading AcadynovaIQ...</p>
          <div className="loading-state !py-4">
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen text-[#111827] font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                user.role === 'admin' ? <Navigate to="/admin" replace /> :
                user.role === 'faculty' ? <Navigate to="/faculty" replace /> :
                <Navigate to="/student" replace />
              ) : (
                <LandingPage onLoginSuccess={handleLoginSuccess} />
              )
            } 
          />
          
          <Route 
            path="/faculty" 
            element={
              user && user.role === 'faculty' ? (
                <FacultyDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/student" 
            element={
              user && user.role === 'student' ? (
                <StudentDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/student/profile" 
            element={
              user && user.role === 'student' ? (
                <ProfilePage user={user} onUpdateUser={handleUpdateUser} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          <Route 
            path="/student/submissions" 
            element={
              user && user.role === 'student' ? (
                <SubmissionsPage user={user} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          <Route 
            path="/faculty/profile" 
            element={
              user && user.role === 'faculty' ? (
                <ProfilePage user={user} onUpdateUser={handleUpdateUser} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          <Route 
            path="/faculty/evaluate/:quizId" 
            element={
              user && user.role === 'faculty' ? (
                <EvaluationPage user={user} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              user && user.role === 'admin' ? (
                <AdminDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
