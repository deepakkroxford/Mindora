import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.register({ name, email, password, confirmPassword });

      if (data.success && data.data) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data));
        toast.success('Registration successful!');
        navigate('/');
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errMsg = error.response?.data?.message || 'Registration failed';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-4">
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg shadow-blue-500/20">
            D
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Create Account</h1>
          <p className="text-sm text-slate-400 mt-1">Join the Mindora RAG platform</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-sm">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 transition"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 transition"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 transition"
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 text-sm">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 transition"
              placeholder="Re-enter password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
