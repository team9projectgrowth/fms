import { useState } from 'react';
import { Mail, Phone, Building, MapPin, User, ArrowRight, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { tenantsService } from '../services/tenants.service';

interface TenantRegistrationPageProps {
  onNavigate: (page: string) => void;
}

export default function TenantRegistrationPage({ onNavigate }: TenantRegistrationPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contactPerson: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState<{ email: string; password: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const tenant = await tenantsService.createTenant(
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          contact_person: formData.contactPerson || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          country: formData.country || undefined,
          postal_code: formData.postalCode || undefined,
          subscription_status: 'trial',
          max_users: 10,
        },
        formData.adminEmail || formData.email,
        formData.adminPassword,
        formData.adminName || formData.contactPerson || 'Tenant Admin'
      );

      setAdminCredentials({
        email: formData.adminEmail || formData.email,
        password: formData.adminPassword,
      });
      setSuccess(true);
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        contactPerson: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        adminEmail: '',
        adminPassword: '',
        adminName: '',
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        onNavigate('home');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to register tenant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success && adminCredentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your tenant account has been created successfully. Your admin account has been set up.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-gray-700 mb-2">Admin Login Credentials:</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Email:</span> {adminCredentials.email}</p>
              <p className="text-sm text-gray-600"><span className="font-medium">Password:</span> {adminCredentials.password}</p>
              <p className="text-xs text-orange-600 mt-2">Please save these credentials. You will need them to login.</p>
            </div>
            <button
              onClick={() => {
                onNavigate('login');
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              <Building size={32} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Tenant Registration</h2>
            <p className="text-gray-600">Register your organization to get started</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="text-red-500 mr-3 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                    placeholder="Your Organization Name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
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
                    placeholder="contact@organization.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="contactPerson" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Person
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                    placeholder="123 Main Street"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                  placeholder="New York"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                  placeholder="NY"
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                  placeholder="United States"
                />
              </div>

              <div>
                <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-700 mb-2">
                  Postal/ZIP Code
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                  placeholder="10001"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Account Setup</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label htmlFor="adminName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Admin Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      id="adminName"
                      name="adminName"
                      value={formData.adminName}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                      placeholder="Admin Full Name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="adminEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                    Admin Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      id="adminEmail"
                      name="adminEmail"
                      value={formData.adminEmail}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                      placeholder="admin@organization.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="adminPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Admin Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="password"
                      id="adminPassword"
                      name="adminPassword"
                      value={formData.adminPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none transition-colors"
                      placeholder="Create a strong password"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Registering...' : 'Register Organization'}
              {!isSubmitting && <ArrowRight className="ml-2" size={20} />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already registered?{' '}
              <button
                onClick={() => onNavigate('login')}
                className="font-semibold text-teal-600 hover:text-teal-700"
              >
                Sign in
              </button>
            </p>
          </div>

          <div className="mt-6 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Free trial available
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                No credit card required
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

