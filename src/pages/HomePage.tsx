import { ArrowRight, Zap, Shield, TrendingUp, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'CEO, TechStart Inc',
      content: 'Sahayak transformed our business operations. Their solutions are innovative and incredibly reliable.',
      rating: 5,
      company: 'TechStart'
    },
    {
      name: 'Michael Chen',
      role: 'CTO, DataCorp',
      content: 'Outstanding service and support. The team went above and beyond to ensure our success.',
      rating: 5,
      company: 'DataCorp'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Product Manager, InnovateLab',
      content: 'The best investment we made this year. ROI was visible within the first quarter.',
      rating: 5,
      company: 'InnovateLab'
    }
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="relative bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Your Business with
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600"> Smart Solutions</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Empower your team with cutting-edge technology that drives growth, efficiency, and customer satisfaction.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => onNavigate('register')}
                  className="px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center"
                >
                  Get Started
                  <ArrowRight className="ml-2" size={20} />
                </button>
                <button
                  onClick={() => onNavigate('support')}
                  className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold border-2 border-gray-300 hover:border-teal-500 transition-colors"
                >
                  Book a Demo
                </button>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="w-full h-96 bg-gradient-to-br from-teal-400 to-blue-500 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Products for Modern Teams
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to succeed in one integrated platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-teal-500 hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Zap className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-600 mb-6">
                Experience blazing-fast performance that keeps your team productive and your customers happy.
              </p>
              <button
                onClick={() => onNavigate('products')}
                className="text-teal-600 font-semibold flex items-center hover:text-teal-700"
              >
                Learn More
                <ArrowRight className="ml-2" size={18} />
              </button>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-teal-500 hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Shield className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Enterprise Security</h3>
              <p className="text-gray-600 mb-6">
                Bank-level security with end-to-end encryption to keep your data safe and compliant.
              </p>
              <button
                onClick={() => onNavigate('products')}
                className="text-teal-600 font-semibold flex items-center hover:text-teal-700"
              >
                Learn More
                <ArrowRight className="ml-2" size={18} />
              </button>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-teal-500 hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Growth Analytics</h3>
              <p className="text-gray-600 mb-6">
                Get actionable insights with real-time analytics and reporting that drive smarter decisions.
              </p>
              <button
                onClick={() => onNavigate('products')}
                className="text-teal-600 font-semibold flex items-center hover:text-teal-700"
              >
                Learn More
                <ArrowRight className="ml-2" size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-lg text-gray-600">
              See what our customers have to say about us
            </p>
          </div>

          <div className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="flex mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="text-yellow-400 fill-current" size={24} />
                ))}
              </div>
              <p className="text-xl md:text-2xl text-gray-700 mb-6 italic">
                "{testimonials[currentTestimonial].content}"
              </p>
              <div className="mb-2">
                <p className="font-bold text-gray-900">{testimonials[currentTestimonial].name}</p>
                <p className="text-gray-600">{testimonials[currentTestimonial].role}</p>
                <p className="text-sm text-teal-600 font-semibold">{testimonials[currentTestimonial].company}</p>
              </div>
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 left-4 md:-left-6">
              <button
                onClick={prevTestimonial}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-teal-50 transition-colors"
              >
                <ChevronLeft className="text-gray-700" />
              </button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 md:-right-6">
              <button
                onClick={nextTestimonial}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-teal-50 transition-colors"
              >
                <ChevronRight className="text-gray-700" />
              </button>
            </div>
          </div>

          <div className="flex justify-center mt-6 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentTestimonial ? 'bg-teal-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of companies already using Sahayak to accelerate their growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-white text-teal-600 rounded-lg font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => onNavigate('support')}
              className="px-8 py-4 bg-transparent text-white rounded-lg font-semibold border-2 border-white hover:bg-white hover:text-teal-600 transition-all"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
