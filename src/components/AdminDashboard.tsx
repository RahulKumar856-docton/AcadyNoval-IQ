import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, LogOut, Pencil, RefreshCw, ShieldCheck, Trash2, Users } from 'lucide-react';
import { User } from '../types';
import { api, socket } from '../services/api';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

interface AdminOverview {
  totalFaculty: number;
  totalStudents: number;
  totalQuizzes: number;
  totalSubmissions: number;
  liveQuizzes: number;
}

interface FacultyRow {
  id: number;
  name: string;
  email: string;
  dept?: string;
  subject?: string;
  teaching_years?: string;
  totalQuizzes: number;
  totalSubmissions: number;
  avgScore: number;
}

interface QuizAuditRow {
  id: number;
  title: string;
  status: string;
  dept?: string;
  year?: string;
  sem?: string;
  isGeneral?: number;
  facultyName: string;
  submissions: number;
  avgScore: number;
}

interface StudentRow {
  id: number;
  name: string;
  email: string;
  dept?: string;
  year?: string;
  sem?: string;
  reg_no?: string;
  totalSubmissions: number;
  avgScore: number;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [overview, setOverview] = useState<AdminOverview>({
    totalFaculty: 0,
    totalStudents: 0,
    totalQuizzes: 0,
    totalSubmissions: 0,
    liveQuizzes: 0,
  });
  const [facultyRows, setFacultyRows] = useState<FacultyRow[]>([]);
  const [quizRows, setQuizRows] = useState<QuizAuditRow[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [editingFacultyId, setEditingFacultyId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', dept: 'CSE', subject: '', teaching_years: '' });

  const selectedFaculty = useMemo(
    () => facultyRows.find((f) => f.id === editingFacultyId) || null,
    [editingFacultyId, facultyRows]
  );

  useEffect(() => {
    void loadAdminData();

    // Listen for quiz deleted event
    socket.on('quiz:deleted', () => {
      void loadAdminData();
    });

    // Listen for quiz submitted event
    socket.on('quiz:submitted', () => {
      void loadAdminData();
    });

    // Listen for quiz launched event
    socket.on('quiz:launched', () => {
      void loadAdminData();
    });

    // Listen for new users created from any device/session
    socket.on('user:created', () => {
      void loadAdminData();
    });

    return () => {
      socket.off('quiz:deleted');
      socket.off('quiz:submitted');
      socket.off('quiz:launched');
      socket.off('user:created');
    };
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [overviewData, facultyData, studentData, quizzesData] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminFaculty(),
        api.getAdminStudents(),
        api.getAdminQuizzes(),
      ]);

      setOverview({
        totalFaculty: Number(overviewData?.totalFaculty || 0),
        totalStudents: Number(overviewData?.totalStudents || 0),
        totalQuizzes: Number(overviewData?.totalQuizzes || 0),
        totalSubmissions: Number(overviewData?.totalSubmissions || 0),
        liveQuizzes: Number(overviewData?.liveQuizzes || 0),
      });

      setFacultyRows(Array.isArray(facultyData) ? facultyData : []);
      setStudentRows(Array.isArray(studentData) ? studentData : []);
      setQuizRows(Array.isArray(quizzesData) ? quizzesData : []);
    } catch (err) {
      console.error(err);
      alert('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const startEditFaculty = (faculty: FacultyRow) => {
    setEditingFacultyId(faculty.id);
    setEditForm({
      name: faculty.name,
      email: faculty.email,
      dept: faculty.dept || 'CSE',
      subject: faculty.subject || '',
      teaching_years: faculty.teaching_years || '',
    });
  };

  const saveFaculty = async () => {
    if (!editingFacultyId) return;

    if (!editForm.name.trim() || !editForm.email.trim()) {
      alert('Name and email are required.');
      return;
    }

    try {
      setSavingId(editingFacultyId);
      await api.updateAdminFaculty(editingFacultyId, editForm);
      setEditingFacultyId(null);
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to update faculty.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteFaculty = async (faculty: FacultyRow) => {
    const shouldDelete = window.confirm(
      `Delete faculty \"${faculty.name}\" and all their quizzes/submissions? This cannot be undone.`
    );
    if (!shouldDelete) return;

    try {
      setDeletingId(faculty.id);
      await api.deleteAdminFaculty(faculty.id);
      if (editingFacultyId === faculty.id) {
        setEditingFacultyId(null);
      }
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to delete faculty.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="landing-shell min-h-screen">
      <div className="ambient-blob blob-a" />
      <div className="ambient-blob blob-b" />
      <div className="ambient-blob blob-c" />

      <div className="dashboard-container">
        <header className="glass-header-card reveal mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="badge badge-success">
                <ShieldCheck size={14} /> Admin Console
              </span>
              <div>
                <h1 className="hero-title">
                  Admin <span className="text-gradient">Dashboard</span>
                </h1>
                <p className="hero-subtitle mt-2">
                  Welcome back, <span className="font-semibold text-emerald-700">{user.name}</span>. Monitor the
                  platform and manage faculty records.
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => void loadAdminData()}
                className="btn-secondary inline-flex items-center justify-center gap-2 min-h-[44px]"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button
                onClick={onLogout}
                className="btn-outline-danger inline-flex items-center justify-center gap-2 min-h-[44px]"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </header>

        <section className="stats-grid mb-8">
          <div className="stat-card reveal delay-1">
            <div className="stat-icon-wrapper bg-blue-100 text-blue-600">
              <Users size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Faculty</span>
              <div className="stat-value-group">
                <span className="stat-value">{overview.totalFaculty}</span>
              </div>
            </div>
          </div>

          <div className="stat-card reveal delay-2">
            <div className="stat-icon-wrapper bg-emerald-100 text-emerald-600">
              <Building2 size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Students</span>
              <div className="stat-value-group">
                <span className="stat-value">{overview.totalStudents}</span>
              </div>
            </div>
          </div>

          <div className="stat-card reveal delay-3">
            <div className="stat-icon-wrapper bg-amber-100 text-amber-600">
              <BarChart3 size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Quizzes / Submissions</span>
              <div className="stat-value-group text-sm font-semibold">
                <span className="text-slate-700">{overview.totalQuizzes} quizzes</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-700">{overview.totalSubmissions} submits</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{overview.liveQuizzes} quizzes currently live</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="content-card xl:col-span-7 reveal delay-4">
            <div className="card-header mb-4">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <Users size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">Faculty Management</h2>
                  <p className="card-subtitle">Update faculty details and remove inactive faculty records</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Loading faculty records...</span>
              </div>
            ) : facultyRows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👩‍🏫</div>
                <h3 className="empty-state-title">No Faculty Found</h3>
                <p className="empty-state-description">No faculty records are currently available.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Subjects / Years</th>
                      <th>Performance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyRows.map((faculty) => (
                      <tr key={faculty.id}>
                        <td>
                          <div className="font-semibold">{faculty.name}</div>
                          <div className="text-xs text-slate-500">{faculty.email}</div>
                        </td>
                        <td>{faculty.dept || '-'}</td>
                        <td>
                          <div className="text-xs text-slate-700 font-medium">
                            {faculty.subject || <span className="text-slate-400 italic">No subject set</span>}
                          </div>
                          {faculty.teaching_years && (
                            <div className="text-xs text-emerald-600 mt-0.5">
                              Years: {faculty.teaching_years}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-xs text-slate-600">
                            {faculty.totalQuizzes} quizzes • {faculty.totalSubmissions} submissions • Avg{' '}
                            {Number(faculty.avgScore || 0).toFixed(1)}%
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditFaculty(faculty)}
                              className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => void deleteFaculty(faculty)}
                              disabled={deletingId === faculty.id}
                              className="btn-outline-danger inline-flex items-center gap-1 px-3 py-1.5 text-xs"
                            >
                              <Trash2 size={12} /> {deletingId === faculty.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="content-card xl:col-span-5 reveal delay-5">
            <div className="card-header mb-4">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <Pencil size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">Edit Faculty</h2>
                  <p className="card-subtitle">Select faculty from table to edit details</p>
                </div>
              </div>
            </div>

            {!selectedFaculty ? (
              <div className="empty-state py-10">
                <div className="empty-state-icon">✍️</div>
                <h3 className="empty-state-title">No Faculty Selected</h3>
                <p className="empty-state-description">Choose a faculty row and click Edit to update details.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="form-input min-h-[44px]"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="form-input min-h-[44px]"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    value={editForm.dept}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, dept: e.target.value }))}
                    className="form-select min-h-[44px]"
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="SE">SE</option>
                    <option value="ISE">ISE</option>
                    <option value="ECE">ECE</option>
                    <option value="EE">EE</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject(s) Handling</label>
                  <input
                    value={editForm.subject}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g. Data Structures, OS"
                    className="form-input min-h-[44px]"
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated list of subjects</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Year(s) / Class Handling</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['1st', '2nd', '3rd', '4th'].map((yr) => {
                      const selected = editForm.teaching_years.split(',').map((y) => y.trim()).filter(Boolean).includes(yr);
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            const current = editForm.teaching_years.split(',').map((y) => y.trim()).filter(Boolean);
                            const updated = selected
                              ? current.filter((y) => y !== yr)
                              : [...current, yr];
                            setEditForm((prev) => ({ ...prev, teaching_years: updated.join(', ') }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            selected
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {yr} Year
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Select year(s) this faculty handles</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => void saveFaculty()}
                    disabled={savingId === selectedFaculty.id}
                    className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] flex-1"
                  >
                    {savingId === selectedFaculty.id ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditingFacultyId(null)}
                    className="btn-secondary inline-flex items-center justify-center min-h-[44px] px-5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="content-card xl:col-span-12 reveal delay-6">
            <div className="card-header mb-4">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="card-title">Student Management</h2>
                  <p className="card-subtitle">View all students and their quiz submission details</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Loading student records...</span>
              </div>
            ) : studentRows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🎓</div>
                <h3 className="empty-state-title">No Students Found</h3>
                <p className="empty-state-description">No student records are currently available.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Registration No</th>
                      <th>Department / Year / Semester</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div className="font-semibold">{student.name}</div>
                          <div className="text-xs text-slate-500">{student.email}</div>
                        </td>
                        <td className="text-sm">{student.reg_no || '-'}</td>
                        <td className="text-sm">
                          {student.dept || '-'} / {student.year || '-'} / {student.sem || '-'}
                        </td>
                        <td>
                          <div className="text-xs text-slate-600">
                            {student.totalSubmissions} submissions • Avg {Number(student.avgScore || 0).toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="content-card xl:col-span-12 reveal delay-5">
            <div className="card-header mb-4">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <BarChart3 size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">All Quiz Activity</h2>
                  <p className="card-subtitle">Cross-platform view of quizzes across all faculty</p>
                </div>
              </div>
            </div>

            {quizRows.length === 0 ? (
              <div className="empty-state py-10">
                <div className="empty-state-icon">📘</div>
                <h3 className="empty-state-title">No Quiz Data</h3>
                <p className="empty-state-description">Quiz activity will appear here once faculty create quizzes.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Quiz</th>
                      <th>Faculty</th>
                      <th>Status</th>
                      <th>Audience</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizRows.map((quiz) => (
                      <tr key={quiz.id}>
                        <td className="font-medium">{quiz.title}</td>
                        <td>{quiz.facultyName}</td>
                        <td>
                          <span className={`badge ${quiz.status === 'live' ? 'badge-live' : 'badge-primary'}`}>
                            {quiz.status}
                          </span>
                        </td>
                        <td>
                          {Number(quiz.isGeneral || 0) === 1
                            ? 'General'
                            : `${quiz.dept || '-'} / ${quiz.year || '-'} / ${quiz.sem || '-'}`}
                        </td>
                        <td className="text-xs text-slate-600">
                          {quiz.submissions} submissions • Avg {Number(quiz.avgScore || 0).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}