import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import logo from '../assets/logo.png';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const { setSession } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm();

  const onSubmit = async ({ restaurantName, ownerName, email, password }) => {
    setLoading(true);
    setRegError('');
    try {
      // 1. Register restaurant + owner + default branch (created server-side)
      const { data } = await api.post('/auth/register', {
        restaurantName,
        ownerName,
        email: email.trim(),
        password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });

      // Persist session immediately so subsequent calls have auth headers
      setSession(data);

      toast.success('Restaurant created — welcome to LayoScan!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setRegError(msg);
      toast.error(msg);

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((validationErr) => {
          if (validationErr.path) {
            setError(validationErr.path, { type: 'server', message: validationErr.msg });
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl gradient-brand mx-auto mb-4 flex items-center justify-center shadow-lg overflow-hidden">
            <img src={logo} alt="LayoScan" className="w-14 h-14 object-cover" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white tracking-tight">
            Create your restaurant
          </h1>
          <p className="text-white/45 text-sm mt-1.5">
            Set up your LayoScan account — takes less than a minute.
          </p>
        </div>

        {/* Error Alert Banner */}
        {regError && (
          <div className="mb-4 p-3.5 rounded-xl bg-danger/10 border border-danger/25 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-snug">{regError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Restaurant name"
            placeholder="The Green Bistro"
            error={errors.restaurantName?.message}
            {...register('restaurantName', { required: 'Restaurant name is required' })}
          />
          <Input
            label="Your name"
            placeholder="Alex Johnson"
            error={errors.ownerName?.message}
            {...register('ownerName', { required: 'Your name is required' })}
          />

          <div className="border-t border-white/8 pt-4">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">
              Login credentials
            </p>
            <div className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="alex@restaurant.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
                })}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            loadingText="Creating your restaurant…"
            className="w-full"
            size="lg"
          >
            Create restaurant & continue →
          </Button>
        </form>

        <p className="text-center text-white/40 text-sm mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-teal hover:text-teal/80 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
