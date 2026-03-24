import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Award, Clock, TrendingUp, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { StudentSubmission, User } from '../types';
import { api } from '../services/api';

interface SubmissionsPageProps {
  user: User;
}

export default function SubmissionsPage({ user }: SubmissionsPageProps) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const submissionData = await api.getMySubmissions();
      setSubmissions(Array.isArray(submissionData) ? submissionData : []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const publishedSubmissions = submissions.filter((submission) => submission.resultsPublished);
  const pendingSubmissions = submissions.filter((submission) => !submission.resultsPublished);

  const getSubmissionAnswer = (submission: StudentSubmission, questionId: string, questionIndex: number) => {
    return submission.answers[questionId] ?? submission.answers[String(questionIndex)];
  };

  const buildQuestionReview = (submission: StudentSubmission) => {
    return submission.questions.map((question, questionIndex) => {
      const studentAnswer = getSubmissionAnswer(submission, question.id, questionIndex);
      const correctAnswer = question.correctAnswer;
      return {
        question,
        questionIndex,
        studentAnswer,
        correctAnswer,
        isCorrect: studentAnswer === correctAnswer,
      };
    });
  };

  const getGradeColor = (score: number | undefined) => {
    if (!score) return 'text-gray-600';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeBg = (score: number | undefined) => {
    if (!score) return 'bg-gray-100';
    if (score >= 80) return 'bg-emerald-100';
    if (score >= 60) return 'bg-blue-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return 'Pending Review';
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Satisfactory';
    return 'Needs Improvement';
  };

  return (
    <div className="landing-shell min-h-screen flex items-center justify-center py-12">
      <div className="ambient-blob blob-a" />
      <div className="ambient-blob blob-b" />
      <div className="ambient-blob blob-c" />

      <div className="w-full max-w-4xl px-4">
        <header className="glass-header-card reveal mb-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div>
              <h1 className="hero-title text-3xl">
                My <span className="text-gradient">Submissions</span>
              </h1>
              <p className="hero-subtitle mt-1">
                Track published results, see your marks, and review weak areas clearly
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="btn-outline-primary inline-flex items-center gap-2 mt-2"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          </div>
        </header>

        {loading ? (
          <div className="glass-card reveal p-12 text-center">
            <div className="loading-spinner mx-auto mb-4" />
            <p className="text-gray-600">Loading your submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="glass-card reveal p-12 text-center">
            <Award size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">No submissions found</p>
            <p className="text-gray-500 text-sm mt-2">
              Complete quizzes to see your results and evaluation here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-5 text-center">
                <p className="text-sm text-gray-600">Published Results</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{publishedSubmissions.length}</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-sm text-gray-600">Pending Evaluation</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{pendingSubmissions.length}</p>
              </div>
              <div className="glass-card p-5 text-center">
                <p className="text-sm text-gray-600">Average Published Score</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {publishedSubmissions.length > 0
                    ? (publishedSubmissions.reduce((sum, submission) => sum + (submission.score || 0), 0) / publishedSubmissions.length).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
            </div>

            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="glass-card reveal p-6 hover:shadow-lg transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left side - Quiz info */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {submission.title}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium text-gray-700">Department:</span> {submission.dept}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">Year:</span> {submission.year}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">Semester:</span> {submission.sem}
                        </p>
                        {submission.submittedAt && (
                          <p>
                            <span className="font-medium text-gray-700">Submitted:</span>{' '}
                            {new Date(submission.submittedAt).toLocaleString()}
                          </p>
                        )}
                        <p>
                          <span className="font-medium text-gray-700">Status:</span>{' '}
                          {submission.resultsPublished ? 'Published' : 'Awaiting faculty evaluation'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => submission.resultsPublished && setSelectedSubmission(submission)}
                      disabled={!submission.resultsPublished}
                      className="btn-outline-primary inline-flex items-center gap-2 mt-4 w-full justify-center"
                    >
                      <Eye size={16} />
                      {submission.resultsPublished ? 'View Evaluation' : 'Result Pending'}
                    </button>
                  </div>

                  {/* Right side - Score display */}
                  <div className="flex flex-col items-center justify-center">
                    <div className={`${getGradeBg(submission.score ?? undefined)} rounded-full p-8 mb-4`}>
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${getGradeColor(submission.score ?? undefined)}`}>
                          {submission.score ?? '-'}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">out of 100</p>
                      </div>
                    </div>

                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getGradeBg(submission.score ?? undefined)} ${getGradeColor(submission.score ?? undefined)}`}>
                      {getScoreLabel(submission.score)}
                    </div>

                    {submission.resultsPublished && (
                      <div className="mt-4 text-sm text-gray-600 text-center">
                        <p>{submission.correctCount} of {submission.totalQuestions} answers correct</p>
                        <p>{submission.accuracy.toFixed(1)}% accuracy</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Details Modal */}
        {selectedSubmission && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSubmission(null)}
          >
            <div
              className="glass-card p-8 max-w-md w-full rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedSubmission.title}
                </h2>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-light"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <Award className="text-emerald-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Your Score</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {selectedSubmission.score ?? '-'} / 100
                    </p>
                  </div>
                </div>

                {selectedSubmission.accuracy !== undefined && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <TrendingUp className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Accuracy</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedSubmission.accuracy.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg">
                  <Target className="text-violet-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Correct Answers</p>
                    <p className="text-2xl font-bold text-violet-600">
                      {selectedSubmission.correctCount} / {selectedSubmission.totalQuestions}
                    </p>
                  </div>
                </div>

                {selectedSubmission.timeTaken !== undefined && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <Clock className="text-orange-600" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Time Taken</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.floor(selectedSubmission.timeTaken / 60)} min {selectedSubmission.timeTaken % 60} sec
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Department</p>
                    <p className="font-semibold text-gray-800">{selectedSubmission.dept}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Year</p>
                    <p className="font-semibold text-gray-800">{selectedSubmission.year}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Semester</p>
                    <p className="font-semibold text-gray-800">{selectedSubmission.sem}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Total Questions</p>
                    <p className="font-semibold text-gray-800">
                      {selectedSubmission.totalQuestions || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4 space-y-4 max-h-[50vh] overflow-y-auto">
                <div className="rounded-lg bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-1">
                    <CheckCircle2 size={18} /> Strength Snapshot
                  </div>
                  <p className="text-sm text-gray-700">
                    You answered {selectedSubmission.correctCount} out of {selectedSubmission.totalQuestions} questions correctly with {selectedSubmission.accuracy.toFixed(1)}% accuracy.
                  </p>
                </div>

                {buildQuestionReview(selectedSubmission).filter((item) => !item.isCorrect).length > 0 ? (
                  <div className="rounded-lg bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
                      <AlertCircle size={18} /> Questions To Review
                    </div>
                    <div className="space-y-3">
                      {buildQuestionReview(selectedSubmission)
                        .filter((item) => !item.isCorrect)
                        .map((item) => (
                          <div key={item.question.id} className="rounded-lg border border-amber-200 bg-white p-3">
                            <p className="text-sm font-semibold text-gray-800">
                              Q{item.questionIndex + 1}. {item.question.text}
                            </p>
                            <p className="text-xs text-red-600 mt-2">
                              Your answer: {item.studentAnswer !== undefined ? `${String.fromCharCode(65 + item.studentAnswer)}. ${item.question.options[item.studentAnswer]}` : 'Not answered'}
                            </p>
                            <p className="text-xs text-emerald-700 mt-1">
                              Correct answer: {String.fromCharCode(65 + item.correctAnswer)}. {item.question.options[item.correctAnswer]}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 font-medium">
                    All answers were correct. No weak areas found in this submission.
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="w-full btn-primary mt-6"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
