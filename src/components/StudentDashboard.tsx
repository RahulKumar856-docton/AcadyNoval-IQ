import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  LogOut,
  Sparkles,
  TrendingUp,
  Trophy,
  User as UserIcon,
} from 'lucide-react';
import { Quiz, StudentStats, StudyTopic, User } from '../types';
import { api, socket } from '../services/api';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function StudentDashboard({ user, onLogout }: StudentDashboardProps) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<StudentStats>({ totalQuizzes: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);
  const [studyLoading, setStudyLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [hoveredQuiz, setHoveredQuiz] = useState<string | null>(null);
  const [studyTopics, setStudyTopics] = useState<StudyTopic[]>([]);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const liveQuizzes = useMemo(() => quizzes.filter((q) => q.status === 'live'), [quizzes]);
  const availableLiveQuizzes = useMemo(
    () => liveQuizzes.filter((q) => !q.hasSubmitted || q.hasSubmitted === 0),
    [liveQuizzes]
  );

  useEffect(() => {
    void loadData();

    // Listen for quiz deleted event
    socket.on('quiz:deleted', (quizId: string) => {
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      // Close active quiz if it's the deleted one
      if (activeQuiz?.id === quizId) {
        setActiveQuiz(null);
      }
    });

    // Listen for new quiz launched event
    socket.on('quiz:launched', (newQuiz: Quiz) => {
      setQuizzes((prev) => {
        const exists = prev.some((q) => q.id === newQuiz.id);
        if (exists) return prev;
        return [...prev, newQuiz];
      });
    });

    // Listen for results published event
    socket.on('quiz:results-published', (quizId: string) => {
      void loadData(); // Reload to get updated scores
    });

    return () => {
      socket.off('quiz:deleted');
      socket.off('quiz:launched');
      socket.off('quiz:results-published');
    };
  }, [activeQuiz?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setStudyLoading(true);
      const [quizData, statsData, studyData] = await Promise.all([
        api.getQuizzes(),
        api.getStudentStats(),
        api.getStudyTopics(),
      ]);
      setQuizzes(Array.isArray(quizData) ? quizData : []);
      setStats(
        statsData && typeof statsData === 'object'
          ? statsData
          : { totalQuizzes: 0, avgScore: 0 }
      );
      setStudyTopics(Array.isArray(studyData) ? studyData : []);
    } catch (err) {
      console.error(err);
      alert('Failed to load student data.');
    } finally {
      setLoading(false);
      setStudyLoading(false);
    }
  };

  const handleStartQuiz = (quiz: Quiz) => {
    if (quiz.hasSubmitted && quiz.hasSubmitted > 0) {
      alert('You already attended this quiz.');
      return;
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      alert('This quiz has no questions yet. Please contact faculty.');
      return;
    }

    setActiveQuiz(quiz);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setStartedAt(Date.now());
  };

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitAttempt = async () => {
    if (!activeQuiz || !activeQuiz.questions || activeQuiz.questions.length === 0) {
      return;
    }

    const totalQuestions = activeQuiz.questions.length;
    const answeredCount = activeQuiz.questions.filter((q) => answers[q.id] !== undefined).length;

    if (answeredCount < totalQuestions) {
      alert('Please answer all questions before submitting.');
      return;
    }

    const correctCount = activeQuiz.questions.reduce((count, question) => {
      return answers[question.id] === question.correctAnswer ? count + 1 : count;
    }, 0);

    const score = Math.round((correctCount / totalQuestions) * 100);
    const accuracy = score;
    const timeTaken = Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 1000));

    try {
      setSubmittingId(activeQuiz.id);
      await api.submitQuiz(activeQuiz.id, score, timeTaken, accuracy, answers);
      setActiveQuiz(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setStartedAt(null);
      await loadData();
      alert(`Quiz submitted successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to submit quiz.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancelAttempt = () => {
    const hasProgress = Object.keys(answers).length > 0;
    if (hasProgress && !window.confirm('Discard this quiz attempt? Your current answers will be lost.')) {
      return;
    }

    setActiveQuiz(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setStartedAt(null);
  };

  const averageScore = Number(stats.avgScore || 0);
  const activeQuestion = activeQuiz?.questions?.[currentQuestionIndex];
  const totalQuestions = activeQuiz?.questions?.length ?? 0;
  const answeredQuestions = activeQuiz?.questions
    ? activeQuiz.questions.filter((q) => answers[q.id] !== undefined).length
    : 0;
  const completionPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
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
              <div className="flex items-center gap-2">
                <span className="badge badge-success animate-pulse-slow">
                  <Sparkles size={14} /> Active Student Space
                </span>
                {liveQuizzes.length > 0 && (
                  <span className="badge badge-live">
                    <Clock size={14} /> {availableLiveQuizzes.length} Available Now
                  </span>
                )}
              </div>

              <div>
                <h1 className="hero-title">
                  Student <span className="text-gradient">Dashboard</span>
                </h1>
                <p className="hero-subtitle mt-2">
                  Welcome back, <span className="font-semibold text-emerald-700">{user.name}</span>. Stay on
                  top of live quizzes and track your performance.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/student/submissions')}
                className="btn-primary inline-flex items-center justify-center gap-2 reveal-pop w-full sm:w-auto min-h-[44px]"
              >
                <CheckCircle2 size={16} /> My Submissions
              </button>
              <button
                onClick={() => navigate('/student/profile')}
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

        <section className="stats-grid mb-8">
          <div className="stat-card reveal delay-1">
            <div className="stat-icon-wrapper bg-emerald-100 text-emerald-600">
              <BookOpen size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Available Live Quizzes</span>
              <div className="stat-value-group">
                <span className="stat-value">{availableLiveQuizzes.length}</span>
                {availableLiveQuizzes.length > 0 && <span className="stat-badge pulse">Active</span>}
              </div>
            </div>
          </div>

          <div className="stat-card reveal delay-2">
            <div className="stat-icon-wrapper bg-blue-100 text-blue-600">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Attempted</span>
              <div className="stat-value-group">
                <span className="stat-value">{stats.totalQuizzes || 0}</span>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="stat-card reveal delay-3">
            <div className="stat-icon-wrapper bg-amber-100 text-amber-600">
              <Trophy size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Average Score</span>
              <div className="stat-value-group">
                <span className={`stat-value ${getScoreColor(averageScore)}`}>{averageScore.toFixed(1)}%</span>
                {averageScore > 0 && <Award size={16} className={getScoreColor(averageScore)} />}
              </div>
            </div>
          </div>
        </section>

        {!activeQuiz && (
          <section className="content-card reveal delay-4 mb-8">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <BookOpen size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">Study Topics for SSA & Quiz</h2>
                  <p className="card-subtitle">Faculty guidance based on class performance</p>
                </div>
              </div>
              <div className="card-header-badge">
                <span className="badge badge-primary">{studyTopics.length} Topics</span>
              </div>
            </div>

            {studyLoading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Loading study topics...</span>
              </div>
            ) : studyTopics.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📘</div>
                <h3 className="empty-state-title">No Study Topics Yet</h3>
                <p className="empty-state-description">Your faculty will upload recommended topics after evaluating performance.</p>
              </div>
            ) : (
              <div className="quiz-list">
                {studyTopics.map((topic) => {
                  const relatedSubmitted = (topic.studentSubmitted || 0) > 0;
                  const relatedScore = topic.myScore ?? null;
                  const needsFocus = relatedSubmitted && relatedScore !== null && relatedScore < 70;

                  return (
                    <article key={topic.id} className={`quiz-card reveal-pop ${needsFocus ? 'ring-2 ring-amber-300' : ''}`}>
                      <div className="quiz-card-content">
                        <div className="quiz-info">
                          <h3 className="quiz-title">{topic.title}</h3>
                          <div className="quiz-meta">
                            <span className="quiz-badge dept-badge">{topic.topicType.toUpperCase()}</span>
                            {topic.quizTitle && (
                              <>
                                <span className="quiz-meta-separator">•</span>
                                <span className="quiz-meta-text">Related Quiz: {topic.quizTitle}</span>
                              </>
                            )}
                            {relatedSubmitted && relatedScore !== null && (
                              <>
                                <span className="quiz-meta-separator">•</span>
                                <span className={`quiz-meta-text ${relatedScore < 70 ? 'text-orange-700 font-semibold' : 'text-emerald-700 font-semibold'}`}>
                                  Your Score: {relatedScore}%
                                </span>
                              </>
                            )}
                            {topic.facultyName && (
                              <>
                                <span className="quiz-meta-separator">•</span>
                                <span className="quiz-meta-text">By {topic.facultyName}</span>
                              </>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{topic.content}</p>
                        </div>

                        <div className="flex flex-col items-start sm:items-end gap-2">
                          {needsFocus ? (
                            <span className="badge bg-amber-100 text-amber-700 border-amber-200">
                              <Sparkles size={12} /> Focus Recommended
                            </span>
                          ) : (
                            <span className="badge badge-success">
                              <CheckCircle2 size={12} /> Keep Practicing
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!activeQuiz && (
          <section className="content-card reveal delay-5">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <CalendarClock size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">Live Quizzes</h2>
                  <p className="card-subtitle">Available quizzes for you to attempt</p>
                </div>
              </div>
              <div className="card-header-badge">
                <span className="badge badge-primary">{availableLiveQuizzes.length} Available</span>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Loading quizzes...</span>
              </div>
            ) : liveQuizzes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <h3 className="empty-state-title">No Live Quizzes</h3>
                <p className="empty-state-description">
                  There are no active quizzes at the moment. Check back later or ask your faculty to launch one.
                </p>
              </div>
            ) : (
              <div className="quiz-list">
                {liveQuizzes.map((quiz) => {
                  const isAttended = quiz.hasSubmitted && quiz.hasSubmitted > 0;
                  const resultsPublished = quiz.results_published === 1;

                  return (
                    <article
                      key={quiz.id}
                      className="quiz-card reveal-pop"
                      onMouseEnter={() => setHoveredQuiz(quiz.id)}
                      onMouseLeave={() => setHoveredQuiz(null)}
                    >
                      <div className="quiz-card-content">
                        <div className="quiz-info">
                          <h3 className="quiz-title">{quiz.title}</h3>
                          <div className="quiz-meta">
                            <span className="quiz-badge dept-badge">{quiz.dept}</span>
                            <span className="quiz-meta-separator">•</span>
                            <span className="quiz-meta-text">Year {quiz.year}</span>
                            <span className="quiz-meta-separator">•</span>
                            <span className="quiz-meta-text">Sem {quiz.sem}</span>
                            {isAttended && (
                              <>
                                <span className="quiz-meta-separator">•</span>
                                {resultsPublished ? (
                                  <span className="badge badge-attended">
                                    <CheckCircle2 size={12} /> Attended ({quiz.myScore}%)
                                  </span>
                                ) : (
                                  <span className="badge badge-success">
                                    <CheckCircle2 size={12} /> Submitted
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {hoveredQuiz === quiz.id && quiz.questions && (
                            <div className="quiz-preview reveal-pop">
                              <div className="quiz-preview-header">
                                <span className="quiz-preview-title">Preview Questions:</span>
                              </div>
                              <ul className="quiz-preview-list">
                                {quiz.questions.slice(0, 2).map((q, i) => (
                                  <li key={i} className="quiz-preview-item">
                                    <span className="quiz-preview-bullet">•</span>
                                    <span className="quiz-preview-text">{q.text}</span>
                                  </li>
                                ))}
                                {quiz.questions.length > 2 && (
                                  <li className="quiz-preview-more">+{quiz.questions.length - 2} more questions</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleStartQuiz(quiz)}
                          disabled={submittingId === quiz.id || isAttended}
                          className={`quiz-submit-btn ${
                            isAttended ? 'btn-secondary' : 'btn-primary'
                          } ${submittingId === quiz.id ? 'loading' : ''}`}
                        >
                          {submittingId === quiz.id ? (
                            <>
                              <div className="btn-spinner" />
                              <span>Submitting...</span>
                            </>
                          ) : isAttended ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>{resultsPublished ? 'Attended' : 'Submitted'}</span>
                            </>
                          ) : (
                            <>
                              <Trophy size={16} />
                              <span>Attend Quiz</span>
                            </>
                          )}
                        </button>
                      </div>

                      {isAttended && (
                        <div className="quiz-progress">
                          <div className="quiz-progress-bar" />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeQuiz && activeQuestion && (
          <section className="content-card reveal mt-6 attempt-section">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon-wrapper">
                  <BookOpen size={22} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="card-title">{activeQuiz.title}</h2>
                  <p className="card-subtitle">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </p>
                </div>
              </div>
              <span className="badge badge-primary">
                Answered {answeredQuestions}/{totalQuestions}
              </span>
            </div>

            <div className="quiz-attempt-panel">
              <div className="attempt-progress-meta">
                <span>Attempt Progress</span>
                <span>{completionPercent}% complete</span>
              </div>
              <div className="attempt-progress-track" aria-hidden="true">
                <div className="attempt-progress-fill" style={{ width: `${completionPercent}%` }} />
              </div>

              <div className="question-index-grid">
                {activeQuiz.questions?.map((question, questionIndex) => {
                  const isCurrent = questionIndex === currentQuestionIndex;
                  const isAnswered = answers[question.id] !== undefined;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={`question-chip ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                      onClick={() => setCurrentQuestionIndex(questionIndex)}
                    >
                      {questionIndex + 1}
                    </button>
                  );
                })}
              </div>

              <h3 className="question-title">{activeQuestion.text}</h3>

              <div className="option-list">
                {activeQuestion.options.map((option, optionIndex) => {
                  const selected = answers[activeQuestion.id] === optionIndex;
                  return (
                    <button
                      key={`${activeQuestion.id}-${optionIndex}`}
                      type="button"
                      className={`option-btn ${selected ? 'selected' : ''}`}
                      onClick={() => handleAnswerSelect(activeQuestion.id, optionIndex)}
                    >
                      <span className="option-marker">{String.fromCharCode(65 + optionIndex)}</span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="attempt-actions">
                <button type="button" className="btn-secondary" onClick={handleCancelAttempt}>
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn-primary ${submittingId === activeQuiz.id ? 'loading' : ''}`}
                    onClick={handleSubmitAttempt}
                    disabled={submittingId === activeQuiz.id || answeredQuestions < totalQuestions}
                  >
                    {submittingId === activeQuiz.id ? (
                      <>
                        <div className="btn-spinner" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Quiz</span>
                    )}
                  </button>
                )}
              </div>

              {answeredQuestions < totalQuestions && (
                <p className="attempt-note">Finish all answers to enable submit.</p>
              )}
            </div>
          </section>
        )}

        {!activeQuiz && stats.totalQuizzes > 0 && (
          <section className="tip-card reveal delay-5 mt-6">
            <div className="tip-content">
              <Sparkles size={20} className="text-emerald-600" />
              <div className="tip-text">
                <strong>Pro Tip:</strong> Keep attempting quizzes to improve your average score. Your current average
                is <span className={getScoreColor(averageScore)}>{averageScore.toFixed(1)}%</span>.
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
