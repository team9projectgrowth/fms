import { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { authService } from '../services/auth.service';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await authService.signIn(formData.email, formData.password);

      if (user.role === 'admin' || user.role === 'executor') {
        onNavigate('login');
      } else {
        setError('Invalid user type for login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              T
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your Sahayak account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="ml-2" size={20} />
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-colors font-medium text-gray-700">
                Google
              </button>
              <button className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition-colors font-medium text-gray-700">
                Microsoft
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => onNavigate('register')}
                className="font-semibold text-teal-600 hover:text-teal-700"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
          By signing in, you agree to our{' '}
          <a href="#" className="text-teal-600 hover:text-teal-700">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-teal-600 hover:text-teal-700">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
