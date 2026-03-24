import React, { useState } from 'react';
import { ArrowRight, BarChart3, Brain, GraduationCap, ShieldCheck, Sparkles, Users, X, Zap } from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface LandingPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState<{ role: UserRole; type: 'login' | 'signup' } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    reg_no: '',
    dept: 'CSE',
    year: '1st',
    sem: '1st',
  });
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate college email for students
    if (showAuth?.role === 'student' && showAuth?.type === 'signup') {
      if (!formData.name.trim()) {
        setError('Please enter your full name');
        return;
      }

      const emailDomain = formData.email.split('@')[1]?.toLowerCase();
      const allowedDomain = 'mkce.ac.in';
      const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
      
      if (personalDomains.includes(emailDomain)) {
        setError('Please use your MKCE college email (@mkce.ac.in), not personal email');
        return;
      }
      
      if (emailDomain !== allowedDomain) {
        setError('Please use your MKCE college email address (@mkce.ac.in)');
        return;
      }
      
      if (!formData.reg_no || formData.reg_no.trim().length < 5) {
        setError('Please enter a valid registration number');
        return;
      }
    }

    try {
      const res =
        showAuth?.type === 'login'
          ? await api.login({ email: formData.email, password: formData.password })
          : await api.signup({ ...formData, role: showAuth?.role });

      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="landing-shell min-h-screen text-[#111827]">
      <div className="ambient-blob blob-a" />
      <div className="ambient-blob blob-b" />

      {/* Navigation Header */}
      <header className="glass-header sticky top-0 z-40">
        <div className="glass-header-content">
          <button onClick={() => window.scrollTo(0, 0)} className="navbar-brand cursor-pointer">
            <div className="navbar-logo">A</div>
            <span className="navbar-title">
              Acadynova<span className="brand-accent">IQ</span>
            </span>
          </button>

          <nav className="navbar-nav flex items-center gap-2 sm:gap-6">
            <a href="#features" className="navbar-link">Features</a>
            <button className="navbar-link min-h-[44px]" onClick={() => setShowAuth({ role: 'student', type: 'login' })}>
              Log In
            </button>
            <button className="navbar-link min-h-[44px]" onClick={() => setShowAuth({ role: 'admin', type: 'login' })}>
              Admin
            </button>
            <button className="navbar-button navbar-login-btn min-h-[44px]" onClick={() => setShowAuth({ role: 'student', type: 'signup' })}>
              Get Started
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="section-hero section-container">
          <div className="hero-content text-center">
            <div className="reveal delay-1 mb-6 badge hero-badge">
              <Sparkles size={14} />
              Intelligent Nano-Learning Platform
            </div>

            <h1 className="reveal delay-2 hero-title max-w-5xl mx-auto">
              Build Better Outcomes with <span className="text-gradient">Academic Intelligence</span>
            </h1>

            <p className="reveal delay-3 hero-subtitle mx-auto max-w-3xl">
              A real-time micro-assessment platform that helps faculty track growth and helps students improve through instant, data-backed feedback.
            </p>

            <div className="reveal delay-4 btn-group hero-cta-group">
              <button
                onClick={() => setShowAuth({ role: 'student', type: 'signup' })}
                className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-3 min-h-[46px] w-full sm:w-auto text-base font-bold text-white"
              >
                Start Learning <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setShowAuth({ role: 'faculty', type: 'login' })}
                className="btn-secondary inline-flex items-center justify-center gap-2 px-8 py-3 min-h-[46px] w-full sm:w-auto text-base font-bold"
              >
                Faculty Portal <Users size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Portal Cards Section */}
        <section className="section-portals">
          <div className="section-content">
            <div className="portal-cards">
            <button
              type="button"
              className="card card-lift reveal delay-1"
              onClick={() => setShowAuth({ role: 'student', type: 'login' })}
            >
              <div className="card-icon card-icon-brand">
                <GraduationCap size={28} />
              </div>
              <h3 className="card-title">Student Portal</h3>
              <p className="card-description">
                Access quizzes, track your performance trend, and improve with AI insights.
              </p>
              <span className="inline-flex items-center gap-1 font-bold text-[#2f8f6a] mt-large">
                Login as Student <ArrowRight size={16} />
              </span>
            </button>

            <button
              type="button"
              className="card card-lift reveal delay-2"
              onClick={() => setShowAuth({ role: 'faculty', type: 'login' })}
            >
              <div className="card-icon card-icon-dark">
                <Users size={28} />
              </div>
              <h3 className="card-title">Faculty Portal</h3>
              <p className="card-description">
                Create assessments, launch live quizzes, and view submissions in one dashboard.
              </p>
              <span className="inline-flex items-center gap-1 font-bold mt-large">
                Login as Faculty <ArrowRight size={16} />
              </span>
            </button>

            <button
              type="button"
              className="card card-lift reveal delay-3"
              onClick={() => setShowAuth({ role: 'admin', type: 'login' })}
            >
              <div className="card-icon card-icon-dark">
                <ShieldCheck size={28} />
              </div>
              <h3 className="card-title">Admin Console</h3>
              <p className="card-description">
                View platform-wide activity, manage faculty records, and monitor system performance.
              </p>
              <span className="inline-flex items-center gap-1 font-bold mt-large">
                Login as Admin <ArrowRight size={16} />
              </span>
            </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section-features">
          <div className="section-content">
            <div className="text-center mb-large reveal delay-1">
              <h2 className="text-4xl font-black mb-small">Why Choose AcadynovaIQ?</h2>
              <p className="hero-subtitle">Our platform is designed to transform how educators assess and students learn.</p>
            </div>
            <div className="feature-cards">
              <div className="card card-lift reveal delay-2">
              <div className="card-icon card-icon-brand">
                  <Zap size={28} />
                </div>
                <h4 className="card-title">Nano-Learning</h4>
                <p className="card-description">Frequent, focused assessments for stronger retention and better outcomes.</p>
              </div>
              <div className="card card-lift reveal delay-3">
              <div className="card-icon card-icon-brand">
                  <Brain size={28} />
                </div>
                <h4 className="card-title">AI Analytics</h4>
                <p className="card-description">Clear performance insights generated from student data in real-time.</p>
              </div>
              <div className="card card-lift reveal delay-4">
              <div className="card-icon card-icon-brand">
                  <BarChart3 size={28} />
                </div>
                <h4 className="card-title">Real-time Reports</h4>
                <p className="card-description">Live updates for faculty and instant feedback loops for students.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-info">
            <div className="brand-mark brand-mark-sm">A</div>
            <span>AcadynovaIQ</span>
          </div>
          <div className="footer-credit">© 2026 All rights reserved. Empowering Education Through Technology.</div>
        </div>
      </footer>

      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
          <div onClick={() => setShowAuth(null)} className="modal-backdrop" />
          <div className="auth-panel relative w-full max-w-md p-5 sm:p-8 my-auto">
            <div className="auth-header">
              <div>
                <h2 className="auth-title reveal-pop">
                  {showAuth.type === 'login' ? 'Welcome Back' : 'Join AcadynovaIQ'}
                </h2>
                <p className="auth-subtitle">
                  {showAuth.role === 'admin' ? 'Admin' : showAuth.role === 'faculty' ? 'Faculty' : 'Student'}{' '}
                  {showAuth.type === 'login' ? 'Login' : 'Registration'}
                </p>
              </div>
              <button
                onClick={() => setShowAuth(null)}
                className="auth-close-btn"
                aria-label="Close dialog"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAuth} className="form-container">
              {showAuth.type === 'signup' && showAuth.role === 'student' && (
                <>
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input min-h-[44px]"
                  />
                  <input
                    type="text"
                    placeholder="Registration Number (e.g., 927623BCS084)"
                    required
                    value={formData.reg_no}
                    onChange={(e) => setFormData({ ...formData, reg_no: e.target.value.toUpperCase() })}
                    className="form-input min-h-[44px]"
                    minLength={5}
                  />
                  <input
                    type="email"
                    placeholder="College Email (e.g., regno@mkce.ac.in)"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input min-h-[44px]"
                  />
                  <p className="text-xs text-slate-600 -mt-3 mb-2">
                    ⚠ Use your MKCE college email (@mkce.ac.in), not personal Gmail/Yahoo
                  </p>
                </>
              )}
              {showAuth.type === 'signup' && showAuth.role !== 'student' && (
                <>
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input min-h-[44px]"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input min-h-[44px]"
                  />
                </>
              )}
              {showAuth.type === 'login' && (
                <input
                  type="email"
                  placeholder={showAuth.role === 'student' ? 'MKCE Email or Registration Number' : 'Email Address'}
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input min-h-[44px]"
                />
              )}
              <input
                type="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input min-h-[44px]"
              />

              {showAuth.type === 'signup' && showAuth.role === 'faculty' && (
                <>
                  <select
                    value={formData.dept}
                    onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                    className="form-select min-h-[44px]"
                    aria-label="Department"
                    required
                  >
                    <option value="">Select Your Department</option>
                    <option value="CSE">Computer Science & Engineering (CSE)</option>
                    <option value="IT">Information Technology (IT)</option>
                    <option value="SE">Software Engineering (SE)</option>
                    <option value="ISE">Information Science Engineering (ISE)</option>
                    <option value="ECE">Electronics & Communication (ECE)</option>
                    <option value="EE">Electrical Engineering (EE)</option>
                    <option value="ME">Mechanical Engineering (ME)</option>
                    <option value="CE">Civil Engineering (CE)</option>
                    <option value="BE">Biomedical Engineering (BE)</option>
                    <option value="AE">Aerospace Engineering (AE)</option>
                    <option value="ChE">Chemical Engineering (ChE)</option>
                    <option value="PE">Production Engineering (PE)</option>
                    <option value="TE">Thermal Engineering (TE)</option>
                    <option value="AU">Automobile Engineering (AU)</option>
                    <option value="VLSI">VLSI Design (VLSI)</option>
                    <option value="AI">Artificial Intelligence (AI)</option>
                  </select>
                </>
              )}

              {showAuth.type === 'signup' && showAuth.role === 'student' && (
                <>
                  <div className="form-grid grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={formData.dept}
                      onChange={(e) => setFormData({ ...formData, dept: e.target.value })}
                      className="form-select min-h-[44px]"
                      aria-label="Department"
                    >
                      <option value="">Select Department</option>
                      <option value="CSE">Computer Science & Engineering (CSE)</option>
                      <option value="IT">Information Technology (IT)</option>
                      <option value="SE">Software Engineering (SE)</option>
                      <option value="ISE">Information Science Engineering (ISE)</option>
                      <option value="ECE">Electronics & Communication (ECE)</option>
                      <option value="EE">Electrical Engineering (EE)</option>
                      <option value="ME">Mechanical Engineering (ME)</option>
                      <option value="CE">Civil Engineering (CE)</option>
                      <option value="BE">Biomedical Engineering (BE)</option>
                      <option value="AE">Aerospace Engineering (AE)</option>
                      <option value="ChE">Chemical Engineering (ChE)</option>
                      <option value="PE">Production Engineering (PE)</option>
                      <option value="TE">Thermal Engineering (TE)</option>
                      <option value="AU">Automobile Engineering (AU)</option>
                      <option value="VLSI">VLSI Design (VLSI)</option>
                      <option value="AI">Artificial Intelligence (AI)</option>
                    </select>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="form-select min-h-[44px]"
                      aria-label="Year"
                    >
                      <option value="1st">1st Yr</option>
                      <option value="2nd">2nd Yr</option>
                      <option value="3rd">3rd Yr</option>
                      <option value="4th">4th Yr</option>
                    </select>
                    <select
                      value={formData.sem}
                      onChange={(e) => setFormData({ ...formData, sem: e.target.value })}
                      className="form-select min-h-[44px]"
                      aria-label="Semester"
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
                </>
              )}

              {error && <div className="auth-error">{error}</div>}

              <button className="btn-primary w-full py-3 min-h-[46px] font-black text-white">
                {showAuth.type === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            {showAuth.role !== 'admin' && (
              <div className="auth-toggle">
                <button
                  onClick={() =>
                    setShowAuth({
                      ...showAuth,
                      type: showAuth.type === 'login' ? 'signup' : 'login',
                    })
                  }
                  className="auth-toggle-btn"
                >
                  {showAuth.type === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Login'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
