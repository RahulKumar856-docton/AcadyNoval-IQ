import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, AlertCircle, Save } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface Submission {
  id: number;
  quiz_id: number;
  student_id: number;
  student_name: string;
  student_reg_no: string;
  score: number;
  original_score: number;
  time_taken: number;
  accuracy: number;
  submitted_at: string;
  answers: Record<string, number>;
  questions: Array<{ text: string; options: string[]; correctAnswer: number }>;
}

interface EvaluationPageProps {
  user: User;
}

export default function EvaluationPage({ user }: EvaluationPageProps) {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState('');
  const [evaluatingSubmissionId, setEvaluatingSubmissionId] = useState<number | null>(null);
  const [evaluationMarks, setEvaluationMarks] = useState<Record<number, number>>({});
  const [savingMarks, setSavingMarks] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSubmissions();
  }, [quizId]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      if (!quizId) return;
      
      const data = await api.getQuizSubmissions(quizId);
      setQuizTitle(data.quiz?.title || 'Quiz');
      setSubmissions(data.submissions || []);
      
      // Initialize evaluation marks with current scores
      const marks: Record<number, number> = {};
      data.submissions?.forEach((sub: Submission) => {
        marks[sub.id] = sub.score;
      });
      setEvaluationMarks(marks);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setMessage({ type: 'error', text: 'Failed to load submissions' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMarks = async (submissionId: number) => {
    try {
      setSavingMarks(true);
      const newScore = evaluationMarks[submissionId];
      
      if (newScore === undefined || newScore === null) {
        setMessage({ type: 'error', text: 'Please enter a valid score' });
        return;
      }

      if (newScore < 0 || newScore > 100) {
        setMessage({ type: 'error', text: 'Score must be between 0 and 100' });
        return;
      }

      await api.updateSubmissionScore(submissionId, newScore);
      
      // Update local state
      setSubmissions(submissions.map(sub => 
        sub.id === submissionId ? { ...sub, score: newScore } : sub
      ));

      setMessage({ type: 'success', text: 'Marks saved successfully' });
      setEvaluatingSubmissionId(null);
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 2000);
    } catch (err) {
      console.error('Failed to save marks:', err);
      setMessage({ type: 'error', text: 'Failed to save marks' });
    } finally {
      setSavingMarks(false);
    }
  };

  const getCorrectCount = (submission: Submission) => {
    let correct = 0;
    submission.questions.forEach((q, idx) => {
      if (submission.answers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  return (
    <div className="landing-shell min-h-screen py-12">
      <div className="ambient-blob blob-a" />
      <div className="ambient-blob blob-b" />
      <div className="ambient-blob blob-c" />

      <div className="w-full max-w-6xl mx-auto px-4">
        <header className="glass-header-card reveal mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/faculty')}
                className="btn-outline-primary inline-flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <div>
                <h1 className="hero-title text-2xl">
                  Evaluate <span className="text-gradient">{quizTitle}</span>
                </h1>
                <p className="hero-subtitle mt-1">
                  Review and score student submissions
                </p>
              </div>
            </div>
          </div>
        </header>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="glass-card reveal p-12 text-center">
            <div className="loading-spinner mx-auto mb-4" />
            <p className="text-gray-600">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="glass-card reveal p-12 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">No submissions yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Students who submit will appear here for evaluation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="glass-card reveal p-6 hover:shadow-lg transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">STUDENT</p>
                    <p className="text-lg font-bold text-gray-800">{submission.student_name}</p>
                    {submission.student_reg_no && (
                      <p className="text-sm text-gray-600">Reg: {submission.student_reg_no}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">SUBMITTED</p>
                    <p className="text-lg font-bold text-gray-800">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {Math.floor(submission.time_taken / 60)}m {submission.time_taken % 60}s
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">CORRECT ANSWERS</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {getCorrectCount(submission)}/{submission.questions.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(getCorrectCount(submission) / submission.questions.length * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold">CURRENT SCORE</p>
                    <p className={`text-lg font-bold ${submission.score >= 60 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {submission.score}/100
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  {evaluatingSubmissionId === submission.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="form-label text-sm font-semibold text-gray-700 block mb-2">
                          Update Score (0-100)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="form-control w-full"
                            value={evaluationMarks[submission.id] || ''}
                            onChange={(e) => setEvaluationMarks({
                              ...evaluationMarks,
                              [submission.id]: parseInt(e.target.value) || 0
                            })}
                            disabled={savingMarks}
                          />
                          <button
                            onClick={() => handleSaveMarks(submission.id)}
                            className="btn-primary inline-flex items-center gap-2"
                            disabled={savingMarks}
                          >
                            {savingMarks ? (
                              <>
                                <div className="btn-spinner" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                Save
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEvaluatingSubmissionId(null);
                              setEvaluationMarks({
                                ...evaluationMarks,
                                [submission.id]: submission.score
                              });
                            }}
                            className="btn-outline-secondary"
                            disabled={savingMarks}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      {/* Show correct answers comparison */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Answer Review</h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {submission.questions.map((q, idx) => {
                            const studentAnswer = submission.answers[idx];
                            const isCorrect = studentAnswer === q.correctAnswer;
                            return (
                              <div key={idx} className={`p-3 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-sm font-semibold text-gray-800 mb-2">Q{idx + 1}: {q.text}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {q.options.map((opt, optIdx) => (
                                    <div
                                      key={optIdx}
                                      className={`p-2 rounded ${
                                        optIdx === q.correctAnswer
                                          ? 'bg-emerald-200 font-bold'
                                          : optIdx === studentAnswer && !isCorrect
                                          ? 'bg-red-200 font-bold'
                                          : 'bg-white'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optIdx)}: {opt}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  {isCorrect ? (
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                      <CheckCircle2 size={14} /> Correct
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-red-600">
                                      Student chose: {String.fromCharCode(65 + studentAnswer)} • Correct: {String.fromCharCode(65 + q.correctAnswer)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEvaluatingSubmissionId(submission.id)}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Eye size={16} />
                      Review & Evaluate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
