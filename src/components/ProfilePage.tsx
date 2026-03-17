import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (updatedUser: Partial<User>) => void;
}

export default function ProfilePage({ user, onUpdateUser }: ProfilePageProps) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    reg_no: user.reg_no || '',
    dept: user.dept || 'CSE',
    year: user.year || '1st',
    sem: user.sem || '1st',
    subject: user.subject || '',
    teaching_years: user.teaching_years || '',
    password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await api.getProfile();
      setProfileData({
        name: profile.name || '',
        email: profile.email || '',
        reg_no: profile.reg_no || '',
        dept: profile.dept || 'CSE',
        year: profile.year || '1st',
        sem: profile.sem || '1st',
        subject: profile.subject || '',
        teaching_years: profile.teaching_years || '',
        password: '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile. Please try again.' });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.name.trim() || !profileData.dept) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    // For students, year and semester are required
    if (user.role === 'student' && (!profileData.year || !profileData.sem)) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    if (profileData.password && profileData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setSavingProfile(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await api.updateProfile({
        name: profileData.name.trim(),
        dept: profileData.dept,
        year: profileData.year,
        sem: profileData.sem,
        subject: profileData.subject || undefined,
        teaching_years: profileData.teaching_years || undefined,
        password: profileData.password || undefined,
      });

      // Update user context
      onUpdateUser({
        name: response?.user?.name ?? profileData.name.trim(),
        dept: response?.user?.dept ?? profileData.dept,
        year: response?.user?.year ?? profileData.year,
        sem: response?.user?.sem ?? profileData.sem,
        subject: response?.user?.subject ?? profileData.subject,
        teaching_years: response?.user?.teaching_years ?? profileData.teaching_years,
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setProfileData(prev => ({ ...prev, password: '' }));
      
      // Navigate back after 1.5 seconds
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="landing-shell min-h-screen flex items-center justify-center py-12">
      <div className="ambient-blob blob-a" />
      <div className="ambient-blob blob-b" />
      <div className="ambient-blob blob-c" />

      <div className="w-full max-w-2xl px-4">
        <header className="glass-header-card reveal mb-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div>
              <h1 className="hero-title text-3xl">
                My <span className="text-gradient">Profile</span>
              </h1>
              <p className="hero-subtitle mt-1">
                Manage your account information
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

        <section className="glass-card reveal p-8">
          <form onSubmit={handleProfileUpdate} className="space-y-6 w-full">
            {/* Editable name */}
            <div className="space-y-2">
              <label className="form-label text-sm font-semibold text-gray-700 block">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="form-control w-full"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                disabled={savingProfile}
                required
              />
            </div>

            {/* Read-only fields */}

            <div className="space-y-2">
              <label className="form-label text-sm font-semibold text-gray-700 block">Email</label>
              <input
                type="email"
                className="form-control bg-gray-50 w-full"
                value={profileData.email}
                disabled
                readOnly
              />
            </div>

            {user.role === 'student' && (
              <div className="space-y-2">
                <label className="form-label text-sm font-semibold text-gray-700 block">Registration Number</label>
                <input
                  type="text"
                  className="form-control bg-gray-50 w-full"
                  value={profileData.reg_no}
                  disabled
                  readOnly
                />
              </div>
            )}

            <hr className="border-gray-200" />

            {/* Editable fields */}
            <div className="space-y-2">
              <label className="form-label text-sm font-semibold text-gray-700 block">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                className="form-control w-full"
                value={profileData.dept}
                onChange={(e) => setProfileData({ ...profileData, dept: e.target.value })}
                disabled={savingProfile}
                required
              >
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user.role === 'student' && (
                <div className="space-y-2">
                  <label className="form-label text-sm font-semibold text-gray-700 block">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="form-control w-full"
                    value={profileData.year}
                    onChange={(e) => setProfileData({ ...profileData, year: e.target.value })}
                    disabled={savingProfile}
                    required
                  >
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                  </select>
                </div>
              )}

              {user.role === 'student' && (
                <div className="space-y-2">
                  <label className="form-label text-sm font-semibold text-gray-700 block">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="form-control w-full"
                    value={profileData.sem}
                    onChange={(e) => setProfileData({ ...profileData, sem: e.target.value })}
                    disabled={savingProfile}
                    required
                  >
                    <option value="1st">1st Semester</option>
                    <option value="2nd">2nd Semester</option>
                    <option value="3rd">3rd Semester</option>
                    <option value="4th">4th Semester</option>
                    <option value="5th">5th Semester</option>
                    <option value="6th">6th Semester</option>
                    <option value="7th">7th Semester</option>
                    <option value="8th">8th Semester</option>
                  </select>
                </div>
              )}
            </div>

            {/* Faculty-specific fields */}
            {user.role === 'faculty' && (
              <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                  🎓 Teaching Details
                </div>

                <div className="space-y-2">
                  <label className="form-label text-sm font-semibold text-gray-700 block">
                    Subject(s) Handling
                  </label>
                  <input
                    type="text"
                    className="form-control w-full"
                    placeholder="e.g. Data Structures, Operating Systems"
                    value={profileData.subject}
                    onChange={(e) => setProfileData({ ...profileData, subject: e.target.value })}
                    disabled={savingProfile}
                  />
                  <p className="text-xs text-gray-500">Enter all subjects you teach, comma-separated.</p>
                </div>

                <div className="space-y-2">
                  <label className="form-label text-sm font-semibold text-gray-700 block">
                    Year(s) / Class Handling
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['1st', '2nd', '3rd', '4th'].map((yr) => {
                      const selected = profileData.teaching_years.split(',').map((y) => y.trim()).filter(Boolean).includes(yr);
                      return (
                        <button
                          key={yr}
                          type="button"
                          disabled={savingProfile}
                          onClick={() => {
                            const current = profileData.teaching_years.split(',').map((y) => y.trim()).filter(Boolean);
                            const updated = selected
                              ? current.filter((y) => y !== yr)
                              : [...current, yr];
                            setProfileData({ ...profileData, teaching_years: updated.join(', ') });
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
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
                  <p className="text-xs text-gray-500">Select the year(s) you handle.</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="form-label text-sm font-semibold text-gray-700 block">
                New Password (optional)
              </label>
              <input
                type="password"
                className="form-control w-full"
                placeholder="Leave empty to keep current password"
                value={profileData.password}
                onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                disabled={savingProfile}
              />
              <p className="text-xs text-gray-500">Minimum 6 characters</p>
            </div>

            {message.text && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-center gap-3 pt-6">
              <button
                type="button"
                className="btn-outline-primary"
                onClick={() => navigate(-1)}
                disabled={savingProfile}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn-primary inline-flex items-center gap-2 ${savingProfile ? 'loading' : ''}`}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <div className="btn-spinner" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
