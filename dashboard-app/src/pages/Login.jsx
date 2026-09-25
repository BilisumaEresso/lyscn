import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import logo from '../assets/logo.png';

export default function Login() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const { setSession } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ identifier, password }) => {
    setLoading(true);
    setAuthError('');
    try {
      const cleanId = identifier.trim();
      const { data } = await api.post('/auth/login', {
        identifier: cleanId,
        email: cleanId,
        password,
      });
      setSession(data);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Sign in failed. Check your credentials.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl gradient-brand mx-auto mb-4 flex items-center justify-center shadow-lg overflow-hidden">
            <img src={logo} alt="LayoScan" className="w-14 h-14 object-cover" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white tracking-tight">
            LayoScan
          </h1>
          <p className="text-white/45 text-sm mt-1.5">Dashboard · Sign in to continue</p>
        </div>

        {/* Error Alert Banner */}
        {authError && (
          <div className="mb-4 p-3.5 rounded-xl bg-danger/10 border border-danger/25 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-snug">{authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email or Phone number"
            type="text"
            placeholder="0911223344 or you@restaurant.com"
            autoComplete="username"
            error={errors.identifier?.message}
            {...register('identifier', {
              required: 'Email or phone number is required',
              validate: (value) => {
                const clean = value.trim();
                const isEmail = clean.includes('@') && /\S+@\S+\.\S+/.test(clean);
                const isPhone = /^(?:\+251|0)?[79]\d{8}$/.test(clean.replace(/[\s\-\(\)]/g, '')) || /^\+?\d{8,15}$/.test(clean.replace(/[\s\-\(\)]/g, ''));
                return isEmail || isPhone || 'Enter a valid email or phone number';
              },
            })}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              onClick={() => setShowPwd((p) => !p)}
              className="absolute right-3 top-7 text-ink-muted hover:text-ink transition-colors"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button
            type="submit"
            loading={loading}
            loadingText="Signing in…"
            className="w-full mt-2"
            size="lg"
          >
            Sign in
          </Button>
        </form>

        <p className="text-center text-white/40 text-sm mt-8">
          New to LayoScan?{' '}
          <Link to="/register" className="text-teal hover:text-teal/80 font-medium transition-colors">
            Create a restaurant account
          </Link>
        </p>
      </div>
    </div>
  );
}
