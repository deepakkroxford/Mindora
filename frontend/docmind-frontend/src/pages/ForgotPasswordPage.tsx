import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Send OTP, Step 2: Reset Password
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authApi.forgotPassword({ email });
      if (data.success) {
        toast.success(data.message || 'OTP sent successfully!');
        setStep(2);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Send OTP error:', error);
      const errMsg = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (otp.length !== 6) {
      toast.error('OTP must be exactly 6 digits');
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.resetPassword({
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      if (data.success) {
        toast.success(data.message || 'Password reset successfully!');
        navigate('/login');
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errMsg = error.response?.data?.message || 'Invalid or expired OTP code.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-4">
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg shadow-indigo-500/20">
            D
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Mindora</h1>
          <p className="text-sm text-slate-400 mt-1">
            {step === 1 ? 'Reset your password' : 'Enter verification code'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5 text-sm">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-slate-900/40 border border-slate-700/60 rounded-xl p-3 mb-2 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Sending OTP to</p>
                <p className="text-sm text-slate-200 font-medium">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5 text-sm">6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 text-center tracking-[0.5em] font-bold text-lg"
                placeholder="••••••"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5 text-sm">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5 text-sm">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 mt-4"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="text-center mt-6 text-sm text-slate-400">
          Back to{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
