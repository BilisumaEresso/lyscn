import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import logo from '../assets/logo.png';

export default function Login() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sign in failed. Check your credentials.');
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

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="you@restaurant.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
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
            disabled={loading}
            className="w-full mt-2"
            size="lg"
          >
            {loading ? 'Signing in…' : 'Sign in'}
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
