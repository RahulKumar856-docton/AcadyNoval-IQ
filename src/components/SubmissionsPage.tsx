import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Award, Clock, TrendingUp } from 'lucide-react';
import { User, Quiz } from '../types';
import { api } from '../services/api';

interface SubmissionWithScore extends Quiz {
  myScore?: number;
  timeTaken?: number;
  accuracy?: number;
}

interface SubmissionsPageProps {
  user: User;
}

export default function SubmissionsPage({ user }: SubmissionsPageProps) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithScore | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const allQuizzes = await api.getQuizzes();
      
      // Filter for completed submissions and SSA quizzes
      const ssaSubmissions = allQuizzes.filter((quiz: Quiz) => {
        // Check if it's an SSA submission (quiz title contains "SSA")
        const isSSA = quiz.title && quiz.title.toLowerCase().includes('ssa');
        // Check if student has submitted
        const hasSubmitted = quiz.hasSubmitted;
        // Check if results are published by faculty
        const resultsPublished = quiz.results_published;
        
        return isSSA && hasSubmitted && resultsPublished;
      });

      setSubmissions(ssaSubmissions);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
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
                My <span className="text-gradient">SSA Submissions</span>
              </h1>
              <p className="hero-subtitle mt-1">
                View your SSA submissions and evaluation marks
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
            <p className="text-gray-600 text-lg">No SSA submissions found</p>
            <p className="text-gray-500 text-sm mt-2">
              Complete SSA assessments to see your submissions here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission, idx) => (
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
                        {submission.createdAt && (
                          <p>
                            <span className="font-medium text-gray-700">Submitted:</span>{' '}
                            {new Date(submission.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedSubmission(submission)}
                      className="btn-outline-primary inline-flex items-center gap-2 mt-4 w-full justify-center"
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                  </div>

                  {/* Right side - Score display */}
                  <div className="flex flex-col items-center justify-center">
                    <div className={`${getGradeBg(submission.myScore)} rounded-full p-8 mb-4`}>
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${getGradeColor(submission.myScore)}`}>
                          {submission.myScore ?? '-'}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">out of 100</p>
                      </div>
                    </div>

                    {submission.myScore !== undefined && (
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getGradeBg(submission.myScore)} ${getGradeColor(submission.myScore)}`}>
                        {submission.myScore >= 80 && 'Excellent'}
                        {submission.myScore >= 60 && submission.myScore < 80 && 'Good'}
                        {submission.myScore >= 40 && submission.myScore < 60 && 'Satisfactory'}
                        {submission.myScore < 40 && 'Needs Improvement'}
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
                      {selectedSubmission.myScore ?? '-'} / 100
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
                      {selectedSubmission.questions?.length || '-'}
                    </p>
                  </div>
                </div>
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
