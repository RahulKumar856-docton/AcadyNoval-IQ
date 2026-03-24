import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, CheckCircle2, LogOut, Play, PlusCircle, Trash2, Users, ChevronDown, Award, Clock, Target, Sparkles, TrendingUp, UserIcon, FileText } from 'lucide-react';
import { User, Quiz, StudyTopic } from '../types';
import { api, socket } from '../services/api';

interface FacultyDashboardProps {
  user: User;
  onLogout: () => void;
}

interface SubmissionRow {
  id: string;
  student_name?: string;
  student_reg_no?: string;
  score?: number;
  time_taken?: number;
  accuracy?: number;
  answers?: Record<string, number>;
  questions?: Array<{ id: string; text: string; options: string[]; correctAnswer: number }>;
}

export default function FacultyDashboard({ user, onLogout }: FacultyDashboardProps) {
  const navigate = useNavigate();

  // Parse per-year subjects from JSON stored in user.subject
  const subjectsByYear: Record<string, string> = React.useMemo(() => {
    if (!user.subject) return {};
    try {
      const parsed = JSON.parse(user.subject);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
    return {};
  }, [user.subject]);

  const teachingYears = Object.keys(subjectsByYear);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSem, setSelectedSem] = useState<string | null>(null);
  const [selectedDeptStudy, setSelectedDeptStudy] = useState<string | null>(null);
  const [selectedYearStudy, setSelectedYearStudy] = useState<string | null>(null);
  const [selectedSemStudy, setSelectedSemStudy] = useState<string | null>(null);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    dept: user.dept || 'CSE',
    year: (() => {
      try {
        const keys = Object.keys(JSON.parse(user.subject || '{}') || {});
        return keys[0] || '1st';
      } catch { return '1st'; }
    })(),
    sem: '1st',
    isGeneral: true,
    questions: [] as Array<{ text: string; options: string[]; correctAnswer: number }>,
  });
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [studyTopics, setStudyTopics] = useState<StudyTopic[]>([]);
  const [studyLoading, setStudyLoading] = useState(false);
  const [creatingStudyTopic, setCreatingStudyTopic] = useState(false);
  const [newStudyTopic, setNewStudyTopic] = useState({
    title: '',
    content: '',
    attachments: [] as File[],
    topicType: 'both' as 'ssa' | 'quiz' | 'both',
    isGeneral: true,
    dept: user.dept || 'CSE',
    year: teachingYears[0] || '1st',
    sem: '1st',
    quizId: '',
  });

  const getSubmissionAnswer = (submission: SubmissionRow, questionId: string, questionIndex: number) => {
    if (!submission.answers) return undefined;
    return submission.answers[questionId] ?? submission.answers[String(questionIndex)];
  };

  const addManualQuestion = () => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
        },
      ],
    }));
  };

  const removeManualQuestion = (questionIndex: number) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== questionIndex),
    }));
  };

  const updateQuestionText = (questionIndex: number, text: string) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => (idx === questionIndex ? { ...q, text } : q)),
    }));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, text: string) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, qIdx) => {
        if (qIdx !== questionIndex) return q;
        const options = q.options.map((opt, optIdx) => (optIdx === optionIndex ? text : opt));
        return { ...q, options };
      }),
    }));
  };

  const updateCorrectAnswer = (questionIndex: number, correctAnswer: number) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => (idx === questionIndex ? { ...q, correctAnswer } : q)),
    }));
  };

  const totals = useMemo(() => {
    const totalSubmissions = quizzes.reduce((sum, q) => sum + (q.submissions || 0), 0);
    const avgScore = quizzes.length
      ? quizzes.reduce((sum, q) => sum + (q.avgScore || 0), 0) / quizzes.length
      : 0;
    return { totalSubmissions, avgScore };
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      if (quiz.isGeneral) return true; // Always show general quizzes
      
      // OR logic: show quiz if it matches any selected filter
      const matchesDept = !selectedDept || quiz.dept === selectedDept;
      const matchesYear = !selectedYear || quiz.year === selectedYear;
      const matchesSem = !selectedSem || quiz.sem === selectedSem;
      
      // If no filters selected, show all
      if (!selectedDept && !selectedYear && !selectedSem) return true;
      
      // Show if it matches at least one selected filter
      return matchesDept || matchesYear || matchesSem;
    });
  }, [quizzes, selectedDept, selectedYear, selectedSem]);

  const filteredStudyTopics = useMemo(() => {
    return studyTopics.filter((topic) => {
      if (topic.isGeneral) return true; // Always show general topics
      
      // OR logic: show topic if it matches any selected filter
      const matchesDept = !selectedDeptStudy || topic.dept === selectedDeptStudy;
      const matchesYear = !selectedYearStudy || topic.year === selectedYearStudy;
      const matchesSem = !selectedSemStudy || topic.sem === selectedSemStudy;
      
      // If no filters selected, show all
      if (!selectedDeptStudy && !selectedYearStudy && !selectedSemStudy) return true;
      
      // Show if it matches at least one selected filter
      return matchesDept || matchesYear || matchesSem;
    });
  }, [studyTopics, selectedDeptStudy, selectedYearStudy, selectedSemStudy]);

  useEffect(() => {
    void refreshQuizzes();
    void refreshStudyTopics();

    // Listen for quiz submissions
    socket.on('quiz:submitted', ({ quizId }: { quizId: string }) => {
      setQuizzes((prev) =>
        prev.map((q) =>
          q.id === quizId ? { ...q, submissions: (q.submissions || 0) + 1 } : q
        )
      );
    });

    return () => {
      socket.off('quiz:submitted');
    };
  }, []);

  const refreshQuizzes = async () => {
    try {
      setLoading(true);
      const data = await api.getQuizzes();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert('Failed to load quizzes.');
    } finally {
      setLoading(false);
    }
  };

  const refreshStudyTopics = async () => {
    try {
      setStudyLoading(true);
      const data = await api.getStudyTopics();
      setStudyTopics(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert('Failed to load study topics.');
    } finally {
      setStudyLoading(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuiz.title.trim()) {
      alert('Enter a quiz title.');
      return;
    }
    if (!newQuiz.questions || newQuiz.questions.length === 0) {
      alert('Add questions first. Use AI generation to create a quiz from a topic.');
      return;
    }

    try {
      setCreating(true);
      await api.createQuiz(newQuiz);
      const defaultYear = teachingYears[0] || '1st';
      setNewQuiz((prev) => ({ ...prev, title: '', dept: user.dept || 'CSE', year: defaultYear, questions: [], isGeneral: true }));
      setAiTopic('');
      await refreshQuizzes();
    } catch (err) {
      console.error(err);
      alert('Failed to create quiz.');
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) {
      alert('Enter a topic to generate quiz questions.');
      return;
    }

    try {
      setGeneratingQuiz(true);
      setAiStatus('');
      const generated = await api.generateQuizFromTopic({
        topic: aiTopic,
        count: aiCount,
        difficulty: aiDifficulty,
      });

      const generatedQuestions = Array.isArray(generated?.questions) ? generated.questions : [];
      if (generatedQuestions.length === 0) {
        alert('AI did not return valid questions. Try another topic.');
        return;
      }

      setNewQuiz((prev) => ({
        ...prev,
        title: generated?.title || `${aiTopic} Quiz`,
        questions: generatedQuestions,
      }));

      if (generated?.source === 'fallback') {
        setAiStatus('AI service was temporarily unavailable. A sample quiz was generated; you can edit questions manually.');
      } else {
        setAiStatus('AI quiz generated successfully. Review questions and create quiz.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate quiz with AI. Please try again.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleLaunch = async (id: string) => {
    try {
      await api.launchQuiz(id);
      await refreshQuizzes();
    } catch (err) {
      console.error(err);
      alert('Failed to launch quiz.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quiz and its submissions?')) return;
    try {
      await api.deleteQuiz(id);
      if (activeQuizId === id) {
        setActiveQuizId(null);
        setSubmissions([]);
      }
      await refreshQuizzes();
    } catch (err) {
      console.error(err);
      alert('Failed to delete quiz.');
    }
  };

  const handleViewSubmissions = async (id: string) => {
    try {
      setActiveQuizId(id);
      const data = await api.getQuizSubmissions(id);
      setSubmissions(Array.isArray(data) ? data : (data.submissions || []));
    } catch (err) {
      console.error(err);
      alert('Failed to load submissions.');
    }
  };

  const handlePublishResults = async (id: string) => {
    if (!confirm('Publish results? Students will be able to see their scores.')) return;
    try {
      await api.publishResults(id);
      await refreshQuizzes();
      alert('Results published successfully! Students can now see their scores.');
    } catch (err) {
      console.error(err);
      alert('Failed to publish results.');
    }
  };

  const handleCreateStudyTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudyTopic.title.trim() || (!newStudyTopic.content.trim() && newStudyTopic.attachments.length === 0)) {
      alert('Enter study topic title and content or upload attachments.');
      return;
    }

    try {
      setCreatingStudyTopic(true);
      await api.createStudyTopic({
        title: newStudyTopic.title,
        content: newStudyTopic.content,
        attachments: newStudyTopic.attachments,
        topicType: newStudyTopic.topicType,
        isGeneral: newStudyTopic.isGeneral,
        dept: newStudyTopic.isGeneral ? undefined : newStudyTopic.dept,
        year: newStudyTopic.isGeneral ? undefined : newStudyTopic.year,
        sem: newStudyTopic.isGeneral ? undefined : newStudyTopic.sem,
        quizId: newStudyTopic.quizId ? Number(newStudyTopic.quizId) : null,
      });

      setNewStudyTopic((prev) => ({
        ...prev,
        title: '',
        content: '',
        attachments: [],
        topicType: 'both',
        isGeneral: true,
        quizId: '',
      }));
      await refreshStudyTopics();
    } catch (err) {
      console.error(err);
      alert('Failed to create study topic.');
    } finally {
      setCreatingStudyTopic(false);
    }
  };

  const handleDeleteStudyTopic = async (id: number) => {
    if (!confirm('Delete this study topic?')) return;

    try {
      await api.deleteStudyTopic(id);
      await refreshStudyTopics();
    } catch (err) {
      console.error(err);
      alert('Failed to delete study topic.');
    }
  };

  return (
    <div className="landing-shell min-h-screen">
      {/* Ambient Background Blobs */}
      <div className="ambient-blob blob-a"></div>
      <div className="ambient-blob blob-b"></div>
      <div className="ambient-blob blob-c"></div>

      <div className="dashboard-container">
        {/* Header with animation */}
        <header className="glass-header-card reveal mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge badge-success animate-pulse-slow">
                  <Sparkles size={14} /> Faculty Portal
                </span>
              </div>
              
              <div>
                <h1 className="hero-title">
                  Faculty <span className="text-gradient">Dashboard</span>
                </h1>
                <p className="hero-subtitle mt-2">
                  Welcome back, <span className="font-semibold text-emerald-700">{user.name}</span>
                  {user.dept && (
                    <span className="text-emerald-600"> • {user.dept}</span>
                  )}
                  {teachingYears.length > 0 && (
                    <span className="text-slate-500"> • {teachingYears.map((yr) => (
                      <span key={yr}>
                        <span className="text-emerald-600 font-semibold">{yr} Year</span>
                        {subjectsByYear[yr] ? <span className="text-slate-500">: {subjectsByYear[yr]}</span> : null}
                        {'  '}
                      </span>
                    ))}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/faculty/profile')}
                className="btn-primary inline-flex items-center justify-center gap-2 reveal-pop w-full sm:w-auto min-h-[44px]"
              >
                <UserIcon size={16} /> My Profile
              </button>
              <button
                onClick={onLogout}
                className="btn-outline-danger inline-flex items-center justify-center gap-2 reveal-pop w-full sm:w-auto min-h-[44px]"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards with staggered animation */}
        <section className="stats-grid mb-8">
          <div className="stat-card reveal delay-1">
            <div className="stat-icon-wrapper bg-emerald-100 text-emerald-600">
              <Award size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Quizzes</span>
              <div className="stat-value-group">
                <span className="stat-value">{quizzes.length}</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card reveal delay-2">
            <div className="stat-icon-wrapper bg-blue-100 text-blue-600">
              <Users size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Submissions</span>
              <div className="stat-value-group">
                <span className="stat-value">{totals.totalSubmissions}</span>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
            </div>
          </div>
          
          <div className="stat-card reveal delay-3">
            <div className="stat-icon-wrapper bg-amber-100 text-amber-600">
              <Target size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Average Score</span>
              <div className="stat-value-group">
                <span className="stat-value text-emerald-600">{totals.avgScore.toFixed(1)}%</span>
                <Award size={16} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Create Quiz Form */}
          <form 
            onSubmit={handleCreateQuiz} 
            className="content-card reveal delay-4 lg:col-span-7 overflow-visible"
          >
            <div className="card-header mb-6">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <PlusCircle size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">Create New Quiz</h2>
                  <p className="card-subtitle">Use AI generation or add questions manually</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Quiz Title</label>
                <input
                  value={newQuiz.title}
                  onChange={(e) => setNewQuiz((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Enter quiz title"
                  className="form-input min-h-[44px] text-base"
                />
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Sparkles size={16} /> AI Quiz Generator
                </div>
                {teachingYears.length > 0 && !aiTopic && (
                  <p className="text-xs text-emerald-600 bg-emerald-100 rounded-md px-2 py-1">
                    💡 Tip: You teach{' '}
                    {teachingYears.map((yr) => subjectsByYear[yr]).filter(Boolean).join(', ')}{' '}
                    — use a subject as the topic below!
                  </p>
                )}
                <input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder={teachingYears.length > 0 && subjectsByYear[teachingYears[0]] ? `e.g. ${subjectsByYear[teachingYears[0]].split(',')[0].trim()} - Introduction` : "Topic (e.g., Data Structures - Stacks & Queues)"}
                  className="form-input min-h-[44px] text-base"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="form-group !mb-0">
                    <label className="form-label">Questions</label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="form-select min-h-[44px]"
                      aria-label="Question count"
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                  <div className="form-group !mb-0">
                    <label className="form-label">Difficulty</label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      className="form-select min-h-[44px]"
                      aria-label="Difficulty"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={generatingQuiz}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  <Sparkles size={15} /> {generatingQuiz ? 'Generating...' : 'Generate Quiz from Topic'}
                </button>
                {aiStatus && (
                  <p className="text-xs text-emerald-700 bg-emerald-100 rounded-md px-2 py-1">{aiStatus}</p>
                )}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm">
                <div className="font-semibold text-slate-700">Questions Ready: {newQuiz.questions.length}</div>
                {newQuiz.questions.length > 0 ? (
                  <p className="mt-1 text-slate-600 truncate">Q1: {newQuiz.questions[0].text}</p>
                ) : (
                  <p className="mt-1 text-slate-500">Add questions manually or generate with AI before creating the quiz.</p>
                )}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-700">Manual Question Builder</div>
                  <button
                    type="button"
                    onClick={addManualQuestion}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <PlusCircle size={13} /> Add Question
                  </button>
                </div>

                {newQuiz.questions.length === 0 ? (
                  <div className="text-xs text-slate-500">No questions yet. Add manually or generate with AI.</div>
                ) : (
                  <div className="space-y-3 max-h-[26rem] sm:max-h-[32rem] overflow-y-auto pr-1">
                    {newQuiz.questions.map((question, qIndex) => (
                      <div key={qIndex} className="rounded-lg border border-emerald-200 p-3 space-y-2 bg-emerald-50/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-700">Question {qIndex + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeManualQuestion(qIndex)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>

                        <input
                          value={question.text}
                          onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                          placeholder="Enter question text"
                          className="form-input min-h-[44px] text-base"
                        />

                        <div className="grid grid-cols-1 gap-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-start sm:items-center gap-2">
                              <span className="w-5 pt-2 sm:pt-0 text-xs font-semibold text-slate-600">{String.fromCharCode(65 + optionIndex)}.</span>
                              <input
                                value={option}
                                onChange={(e) => updateQuestionOption(qIndex, optionIndex, e.target.value)}
                                placeholder={`Option ${optionIndex + 1}`}
                                className="form-input min-h-[44px] text-base min-w-0"
                              />
                            </div>
                          ))}
                        </div>

                        <div>
                          <label className="form-label">Correct Option</label>
                          <select
                            value={question.correctAnswer}
                            onChange={(e) => updateCorrectAnswer(qIndex, Number(e.target.value))}
                            className="form-select min-h-[44px]"
                            aria-label={`Correct option for question ${qIndex + 1}`}
                          >
                            <option value={0}>Option A</option>
                            <option value={1}>Option B</option>
                            <option value={2}>Option C</option>
                            <option value={3}>Option D</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={newQuiz.isGeneral}
                    onChange={(e) => setNewQuiz((p) => ({ ...p, isGeneral: e.target.checked }))}
                    className="w-5 h-5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="form-label mb-0 group-hover:text-emerald-700 transition-colors">
                    Open to All Students (General Quiz)
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-7">Check this to make the quiz visible to all students regardless of department, year, or semester.</p>
              </div>

              {!newQuiz.isGeneral && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      value={newQuiz.dept}
                      onChange={(e) => setNewQuiz((p) => ({ ...p, dept: e.target.value }))}
                      aria-label="Department"
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
                    <label className="form-label">Year</label>
                    {teachingYears.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {teachingYears.map((yr) => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => setNewQuiz((p) => ({ ...p, year: yr }))}
                            className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                              newQuiz.year === yr
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            }`}
                            title={subjectsByYear[yr] ? `Subjects: ${subjectsByYear[yr]}` : yr}
                          >
                            {yr}
                            {subjectsByYear[yr] && (
                              <span className="ml-1 opacity-70 text-[10px]">
                                ({subjectsByYear[yr].split(',').length} subj)
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <select
                      value={newQuiz.year}
                      onChange={(e) => setNewQuiz((p) => ({ ...p, year: e.target.value }))}
                      aria-label="Year"
                      className="form-select min-h-[44px]"
                    >
                      <option value="1st">1st</option>
                      <option value="2nd">2nd</option>
                      <option value="3rd">3rd</option>
                      <option value="4th">4th</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <select
                      value={newQuiz.sem}
                      onChange={(e) => setNewQuiz((p) => ({ ...p, sem: e.target.value }))}
                      aria-label="Semester"
                      className="form-select min-h-[44px]"
                    >
                      <option value="1st">1st</option>
                      <option value="2nd">2nd</option>
                      <option value="3rd">3rd</option>
                      <option value="4th">4th</option>
                      <option value="5th">5th</option>
                      <option value="6th">6th</option>
                      <option value="7th">7th</option>
                      <option value="8th">8th</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 z-10 -mx-3 px-3 py-3 bg-gradient-to-t from-[#f8f5ec] via-[#f8f5ec]/95 to-transparent sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-none">
                <button
                  type="submit"
                  disabled={creating || newQuiz.questions.length === 0}
                  className="btn-primary w-full min-h-[46px] inline-flex items-center justify-center gap-2 reveal-pop"
                >
                  <PlusCircle size={18} /> 
                  {creating ? 'Creating Quiz...' : 'Create Quiz'}
                </button>
              </div>
            </div>
          </form>

          {/* Quizzes List */}
          <section className="content-card reveal delay-5 lg:col-span-5">
            <div className="card-header mb-6">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <BarChart3 size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">Your Quizzes</h2>
                  <p className="card-subtitle">Manage and track all your quizzes</p>
                </div>
              </div>
              <div className="card-header-badge">
                <span className="badge badge-primary">{filteredQuizzes.length} of {quizzes.length} Total</span>
              </div>
            </div>
            
            {/* Filter Section */}
            <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-700">Filter Quizzes</span>
                {(selectedDept || selectedYear || selectedSem) && (
                  <button
                    onClick={() => {
                      setSelectedDept(null);
                      setSelectedYear(null);
                      setSelectedSem(null);
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Department Filter */}
                <div className="flex flex-wrap gap-1">
                  {['CSE', 'IT', 'SE', 'ISE', 'ECE', 'EE', 'ME', 'CE'].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(selectedDept === dept ? null : dept)}
                      className={`filter-btn ${selectedDept === dept ? 'selected' : ''}`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
                {/* Year Filter */}
                <div className="flex flex-wrap gap-1">
                  {['1st', '2nd', '3rd', '4th'].map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                      className={`filter-btn ${selectedYear === year ? 'selected' : ''}`}
                    >
                      {year} Year
                    </button>
                  ))}
                </div>
                {/* Semester Filter */}
                <div className="flex flex-wrap gap-1">
                  {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map((sem) => (
                    <button
                      key={sem}
                      onClick={() => setSelectedSem(selectedSem === sem ? null : sem)}
                      className={`filter-btn ${selectedSem === sem ? 'selected' : ''}`}
                    >
                      Sem {sem}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Loading quizzes...</span>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h3 className="empty-state-title">{selectedDept || selectedYear || selectedSem ? 'No Quizzes Match Filter' : 'No Quizzes Yet'}</h3>
                <p className="empty-state-description">
                  {selectedDept || selectedYear || selectedSem ? 'Try adjusting your filter criteria or clear filters to see all quizzes.' : 'Create your first quiz using AI generation or manual question builder.'}
                </p>
              </div>
            ) : (
              <div className="quiz-list">
                {filteredQuizzes.map((quiz, index) => (
                  <article
                    key={quiz.id}
                    className={`quiz-card reveal-pop ${
                      expandedQuiz === quiz.id ? 'ring-2 ring-emerald-400' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="quiz-card-content">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="quiz-info">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="quiz-title">{quiz.title}</h3>
                            {quiz.status === 'live' && (
                              <span className="badge badge-live pulse">
                                <Clock size={12} /> LIVE
                              </span>
                            )}
                            {quiz.isGeneral && (
                              <span className="badge bg-purple-100 text-purple-700 border-purple-200">
                                <Users size={12} /> General
                              </span>
                            )}
                          </div>
                          <div className="quiz-meta">
                            {((quiz.dept && quiz.year && quiz.sem) || quiz.isGeneral) && (
                              <>
                                <button
                                  onClick={() => setSelectedDept(quiz.isGeneral ? null : (selectedDept === quiz.dept ? null : quiz.dept))}
                                  className={`quiz-badge dept-badge cursor-pointer hover:bg-emerald-100 transition-colors ${
                                    selectedDept === (quiz.isGeneral ? null : quiz.dept) ? 'ring-2 ring-emerald-400' : ''
                                  }`}
                                >
                                  {quiz.isGeneral ? 'General' : quiz.dept}
                                </button>
                                <span className="quiz-meta-separator">•</span>
                                <button
                                  onClick={() => setSelectedYear(quiz.isGeneral ? null : (selectedYear === quiz.year ? null : quiz.year))}
                                  className={`quiz-meta-text cursor-pointer hover:text-emerald-700 transition-colors ${
                                    selectedYear === (quiz.isGeneral ? null : quiz.year) ? 'font-bold text-emerald-700' : ''
                                  }`}
                                >
                                  {quiz.isGeneral ? 'All Years' : `Year ${quiz.year}`}
                                </button>
                                <span className="quiz-meta-separator">•</span>
                                <button
                                  onClick={() => setSelectedSem(quiz.isGeneral ? null : (selectedSem === quiz.sem ? null : quiz.sem))}
                                  className={`quiz-meta-text cursor-pointer hover:text-emerald-700 transition-colors ${
                                    selectedSem === (quiz.isGeneral ? null : quiz.sem) ? 'font-bold text-emerald-700' : ''
                                  }`}
                                >
                                  {quiz.isGeneral ? 'All Semesters' : `Sem ${quiz.sem}`}
                                </button>
                                <span className="quiz-meta-separator">•</span>
                              </>
                            )}
                            <span className="quiz-meta-text">{quiz.submissions || 0} submissions</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
                          {quiz.submissions > 0 && quiz.status === 'live' && (
                            <button
                              onClick={() => navigate(`/faculty/evaluate/${quiz.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 text-sm font-semibold"
                              title="Evaluate and score student submissions"
                            >
                              <FileText size={16} /> Evaluate
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleViewSubmissions(quiz.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-all duration-200 text-sm font-semibold"
                            title="View submissions"
                          >
                            <Users size={16} /> Reports
                          </button>
                          
                          {quiz.status !== 'live' && (
                            <button
                              onClick={() => handleLaunch(quiz.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200 transform hover:scale-105 text-sm font-semibold"
                              title="Launch quiz"
                            >
                              <Play size={16} /> Launch
                            </button>
                          )}

                          {quiz.results_published ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-semibold">
                              <CheckCircle2 size={16} /> Published
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePublishResults(quiz.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200 text-sm font-semibold"
                              title="Publish results to students"
                            >
                              <CheckCircle2 size={16} /> Publish Results
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDelete(quiz.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 text-sm font-semibold"
                            title="Delete quiz"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                          
                          <button
                            onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
                            className="p-2 rounded-lg hover:bg-emerald-50 transition-all duration-200"
                            title="Expand quiz details"
                          >
                            <ChevronDown 
                              size={18} 
                              className={`transition-transform duration-300 ${
                                expandedQuiz === quiz.id ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Quiz Details */}
                      {expandedQuiz === quiz.id && (
                        <div className="mt-4 pt-4 border-t border-emerald-200 reveal-pop">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                            <div className="text-center p-3 bg-emerald-50 rounded-lg">
                              <div className="text-xs text-slate-500">Questions</div>
                              <div className="text-lg font-bold">{quiz.questions?.length || 0}</div>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-lg">
                              <div className="text-xs text-slate-500">Avg Time</div>
                              <div className="text-lg font-bold">--</div>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-lg">
                              <div className="text-xs text-slate-500">Avg Score</div>
                              <div className="text-lg font-bold">{quiz.avgScore?.toFixed(1) || 0}%</div>
                            </div>
                          </div>
                          
                          {quiz.questions && (
                            <div className="text-sm">
                              <div className="font-semibold mb-2">Preview Questions:</div>
                              <ul className="space-y-1 text-slate-600">
                                {quiz.questions.slice(0, 2).map((q, i) => (
                                  <li key={i} className="truncate">• {q.text}</li>
                                ))}
                                {quiz.questions.length > 2 && (
                                  <li className="text-slate-400">+{quiz.questions.length - 2} more questions</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="content-card reveal delay-6 lg:col-span-12">
            <div className="card-header mb-6">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <BookOpen size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">Study Topics for SSA & Quiz</h2>
                  <p className="card-subtitle">Upload learning topics after performance review</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <form onSubmit={handleCreateStudyTopic} className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="form-group !mb-0">
                  <label className="form-label">Topic Title</label>
                  <input
                    value={newStudyTopic.title}
                    onChange={(e) => setNewStudyTopic((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. SSA: Arrays Time Complexity"
                    className="form-input min-h-[44px]"
                  />
                </div>

                <div className="form-group !mb-0">
                  <label className="form-label">Learning Content</label>
                  <textarea
                    value={newStudyTopic.content}
                    onChange={(e) => setNewStudyTopic((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Share notes, practice steps, and what to revise for SSA/Quiz improvement."
                    className="form-input min-h-[120px]"
                  />
                </div>

                <div className="form-group !mb-0">
                  <label className="form-label">Attachments (PDFs & Images)</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setNewStudyTopic((prev) => ({ ...prev, attachments: files }));
                    }}
                    className="form-input min-h-[44px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {newStudyTopic.attachments.length > 0 && (
                    <div className="mt-2 text-sm text-slate-600">
                      {newStudyTopic.attachments.length} file(s) selected: {newStudyTopic.attachments.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="form-group !mb-0">
                    <label className="form-label">For</label>
                    <select
                      value={newStudyTopic.topicType}
                      onChange={(e) => setNewStudyTopic((prev) => ({ ...prev, topicType: e.target.value as 'ssa' | 'quiz' | 'both' }))}
                      className="form-select min-h-[44px]"
                    >
                      <option value="both">SSA + Quiz</option>
                      <option value="ssa">SSA only</option>
                      <option value="quiz">Quiz only</option>
                    </select>
                  </div>

                  <div className="form-group !mb-0">
                    <label className="form-label">Related Quiz (optional)</label>
                    <select
                      value={newStudyTopic.quizId}
                      onChange={(e) => setNewStudyTopic((prev) => ({ ...prev, quizId: e.target.value }))}
                      className="form-select min-h-[44px]"
                    >
                      <option value="">No specific quiz</option>
                      {quizzes.map((quiz) => (
                        <option key={quiz.id} value={quiz.id}>
                          {quiz.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group !mb-0">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={newStudyTopic.isGeneral}
                      onChange={(e) => setNewStudyTopic((prev) => ({ ...prev, isGeneral: e.target.checked }))}
                      className="w-5 h-5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                    />
                    <span className="form-label mb-0 group-hover:text-emerald-700 transition-colors">
                      Share with all students
                    </span>
                  </label>
                </div>

                {!newStudyTopic.isGeneral && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="form-group !mb-0">
                      <label className="form-label">Department</label>
                      <select
                        value={newStudyTopic.dept}
                        onChange={(e) => setNewStudyTopic((prev) => ({ ...prev, dept: e.target.value }))}
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
                    <div className="form-group !mb-0">
                      <label className="form-label">Year</label>
                      <select
                        value={newStudyTopic.year}
                        onChange={(e) => setNewStudyTopic((prev) => ({ ...prev, year: e.target.value }))}
                        className="form-select min-h-[44px]"
                      >
                        <option value="1st">1st</option>
                        <option value="2nd">2nd</option>
                        <option value="3rd">3rd</option>
                        <option value="4th">4th</option>
                      </select>
                    </div>
                    <div className="form-group !mb-0">
                      <label className="form-label">Semester</label>
                      <select
                        value={newStudyTopic.sem}
                        onChange={(e) => setNewStudyTopic((prev) => ({ ...prev, sem: e.target.value }))}
                        className="form-select min-h-[44px]"
                      >
                        <option value="1st">1st</option>
                        <option value="2nd">2nd</option>
                        <option value="3rd">3rd</option>
                        <option value="4th">4th</option>
                        <option value="5th">5th</option>
                        <option value="6th">6th</option>
                        <option value="7th">7th</option>
                        <option value="8th">8th</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creatingStudyTopic}
                  className="btn-primary w-full min-h-[44px] inline-flex items-center justify-center gap-2"
                >
                  <PlusCircle size={16} /> {creatingStudyTopic ? 'Uploading Topic...' : 'Upload Study Topic'}
                </button>
              </form>

              {/* Filter Section for Study Topics */}
              <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-emerald-700">Filter Study Topics</span>
                  {(selectedDeptStudy || selectedYearStudy || selectedSemStudy) && (
                    <button
                      onClick={() => {
                        setSelectedDeptStudy(null);
                        setSelectedYearStudy(null);
                        setSelectedSemStudy(null);
                      }}
                      className="text-xs text-emerald-600 hover:text-emerald-700 underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Department Filter */}
                  <div className="flex flex-wrap gap-1">
                    {['CSE', 'IT', 'SE', 'ISE', 'ECE', 'EE', 'ME', 'CE'].map((dept) => (
                      <button
                        key={dept}
                        onClick={() => setSelectedDeptStudy(selectedDeptStudy === dept ? null : dept)}
                        className={`filter-btn ${selectedDeptStudy === dept ? 'selected' : ''}`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                  {/* Year Filter */}
                  <div className="flex flex-wrap gap-1">
                    {['1st', '2nd', '3rd', '4th'].map((year) => (
                      <button
                        key={year}
                        onClick={() => setSelectedYearStudy(selectedYearStudy === year ? null : year)}
                        className={`filter-btn ${selectedYearStudy === year ? 'selected' : ''}`}
                      >
                        {year} Year
                      </button>
                    ))}
                  </div>
                  {/* Semester Filter */}
                  <div className="flex flex-wrap gap-1">
                    {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map((sem) => (
                      <button
                        key={sem}
                        onClick={() => setSelectedSemStudy(selectedSemStudy === sem ? null : sem)}
                        className={`filter-btn ${selectedSemStudy === sem ? 'selected' : ''}`}
                      >
                        Sem {sem}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
                {studyLoading ? (
                  <div className="loading-state">
                    <div className="loading-spinner" />
                    <span>Loading study topics...</span>
                  </div>
                ) : filteredStudyTopics.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📘</div>
                    <h3 className="empty-state-title">{(selectedDeptStudy || selectedYearStudy || selectedSemStudy) ? 'No Study Topics Match Filter' : 'No Study Topics Yet'}</h3>
                    <p className="empty-state-description">
                      {(selectedDeptStudy || selectedYearStudy || selectedSemStudy) ? 'Try adjusting your filter criteria or clear filters to see all study topics.' : 'Add focused guidance after evaluating student performance.'}
                    </p>
                  </div>
                ) : (
                  filteredStudyTopics.map((topic) => (
                    <article key={topic.id} className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-800">{topic.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                            <span className="badge badge-primary">{topic.topicType.toUpperCase()}</span>
                            {topic.quizTitle && <span>Quiz: {topic.quizTitle}</span>}
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                onClick={() => setSelectedDeptStudy(topic.isGeneral ? null : (selectedDeptStudy === topic.dept ? null : topic.dept))}
                                className={`px-2 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                                  selectedDeptStudy === (topic.isGeneral ? null : topic.dept)
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                }`}
                              >
                                {topic.isGeneral ? 'General' : topic.dept}
                              </button>
                              {!topic.isGeneral && topic.year && (
                                <>
                                  <span>•</span>
                                  <button
                                    onClick={() => setSelectedYearStudy(selectedYearStudy === topic.year ? null : topic.year)}
                                    className={`px-2 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                                      selectedYearStudy === topic.year
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {topic.year} Year
                                  </button>
                                </>
                              )}
                              {!topic.isGeneral && topic.sem && (
                                <>
                                  <span>•</span>
                                  <button
                                    onClick={() => setSelectedSemStudy(selectedSemStudy === topic.sem ? null : topic.sem)}
                                    className={`px-2 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                                      selectedSemStudy === topic.sem
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                    }`}
                                  >
                                    Sem {topic.sem}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteStudyTopic(topic.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{topic.content}</p>
                      {topic.attachments && topic.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="text-sm font-semibold text-slate-700 mb-2">Attachments:</div>
                          <div className="space-y-2">
                            {topic.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                              >
                                {attachment.mimeType.startsWith('image/') ? (
                                  <span>🖼️</span>
                                ) : attachment.mimeType === 'application/pdf' ? (
                                  <span>📄</span>
                                ) : (
                                  <span>📎</span>
                                )}
                                {attachment.originalName}
                                <span className="text-xs text-slate-500">
                                  ({(attachment.size / 1024).toFixed(1)} KB)
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Submissions Table */}
          <section className="content-card reveal delay-7 lg:col-span-12">
          <div className="card-header mb-6">
            <div className="card-title-group">
              <div className="card-icon-wrapper">
                <BarChart3 size={22} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="card-title">Submissions Overview</h2>
                <p className="card-subtitle">Detailed performance analytics for selected quiz</p>
              </div>
            </div>
          </div>
          
          {!activeQuizId ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <h3 className="empty-state-title">No Quiz Selected</h3>
              <p className="empty-state-description">
                Select a quiz and click "Reports" to view submissions.
              </p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3 className="empty-state-title">No Submissions Yet</h3>
              <p className="empty-state-description">
                Students haven't submitted any attempts for this quiz.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Reg No</th>
                    <th>Score</th>
                    <th>
                      <div className="inline-flex items-center gap-1">
                        <Clock size={14} /> Time
                      </div>
                    </th>
                    <th>Accuracy</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, index) => (
                    <React.Fragment key={s.id}>
                      <tr>
                        <td className="font-medium">{s.student_name || '-'}</td>
                        <td className="text-slate-600">{s.student_reg_no || '-'}</td>
                        <td>
                          <span className={`score-badge ${
                            (s.score || 0) >= 70 ? 'success' :
                            (s.score || 0) >= 40 ? 'warning' :
                            'danger'
                          }`}>
                            {s.score ?? '-'}%
                          </span>
                        </td>
                        <td className="text-slate-600">{s.time_taken ?? '-'}s</td>
                        <td>
                          <div className="progress-group">
                            <div className="progress-bar-wrapper">
                              <div 
                                className="progress-bar-fill"
                                style={{ width: `${s.accuracy || 0}%` }}
                              />
                            </div>
                            <span className="progress-text">{s.accuracy ?? '-'}%</span>
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => setExpandedSubmission(expandedSubmission === s.id ? null : s.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-200 hover:bg-emerald-50 transition-colors"
                          >
                            <ChevronDown 
                              size={14} 
                              className={`transition-transform ${expandedSubmission === s.id ? 'rotate-180' : ''}`}
                            />
                            {expandedSubmission === s.id ? 'Hide' : 'View'} Answers
                          </button>
                        </td>
                      </tr>
                      {expandedSubmission === s.id && s.questions && s.answers && (
                        <tr>
                          <td colSpan={6} className="!p-0">
                            <div className="bg-slate-50 p-4 border-t border-slate-200">
                              <h4 className="font-semibold text-slate-700 mb-3">Student Answers Review</h4>
                              <div className="space-y-4">
                                {s.questions.map((q, qIndex) => {
                                  const studentAnswer = getSubmissionAnswer(s, q.id, qIndex);
                                  const isCorrect = studentAnswer === q.correctAnswer;
                                  return (
                                    <div key={q.id} className="bg-white rounded-lg p-4 border border-slate-200">
                                      <div className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                                          {qIndex + 1}
                                        </span>
                                        <div className="flex-1">
                                          <p className="font-medium text-slate-800 mb-3">{q.text}</p>
                                          <div className="space-y-2">
                                            {q.options.map((option, optIndex) => {
                                              const isStudentChoice = studentAnswer === optIndex;
                                              const isCorrectOption = q.correctAnswer === optIndex;
                                              return (
                                                <div 
                                                  key={optIndex}
                                                  className={`p-2 rounded-md border-2 ${
                                                    isCorrectOption 
                                                      ? 'border-green-400 bg-green-50' 
                                                      : isStudentChoice 
                                                        ? 'border-red-400 bg-red-50' 
                                                        : 'border-slate-200 bg-white'
                                                  }`}
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-sm">{option}</span>
                                                    {isCorrectOption && (
                                                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                                        ✓ Correct
                                                      </span>
                                                    )}
                                                    {isStudentChoice && !isCorrectOption && (
                                                      <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                                        ✗ Student's Choice
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          <div className="mt-2 flex items-center gap-2">
                                            {isCorrect ? (
                                              <span className="text-xs font-semibold text-green-600">
                                                ✓ Student answered correctly
                                              </span>
                                            ) : (
                                              <span className="text-xs font-semibold text-red-600">
                                                ✗ Student answered incorrectly
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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