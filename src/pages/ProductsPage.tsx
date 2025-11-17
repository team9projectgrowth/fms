import { MessageSquare, Users, BarChart3, Check, ArrowRight, Play } from 'lucide-react';

interface ProductsPageProps {
  onNavigate: (page: string) => void;
}

export default function ProductsPage({ onNavigate }: ProductsPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Our Products
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive solutions designed to streamline your workflow and accelerate growth.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-32">
            <div className="order-2 md:order-1">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="text-white" size={32} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Sahayak Connect
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Transform customer conversations into lasting relationships. Our intelligent messaging platform brings all your communication channels into one unified hub.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <Check className="text-teal-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Unified inbox for email, chat, and social media</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-teal-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">AI-powered smart responses and automation</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-teal-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Real-time collaboration tools for teams</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-teal-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Advanced analytics and reporting dashboard</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('register')}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2" size={18} />
              </button>
            </div>
            <div className="order-1 md:order-2">
              <div className="bg-gradient-to-br from-teal-100 to-blue-100 rounded-3xl h-96 shadow-xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-blue-600/20"></div>
                <button className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                  <Play className="text-teal-600 ml-1" size={32} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-32">
            <div>
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl h-96 shadow-xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20"></div>
                <button className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                  <Play className="text-blue-600 ml-1" size={32} />
                </button>
              </div>
            </div>
            <div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="text-white" size={32} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Sahayak Teams
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Empower your workforce with seamless collaboration tools. Built for remote and hybrid teams who need to stay connected and productive.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <Check className="text-blue-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Project management with Kanban boards and timelines</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-blue-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Video conferencing with screen sharing</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-blue-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Document collaboration and version control</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-blue-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Time tracking and productivity insights</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('register')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2" size={18} />
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="text-white" size={32} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Sahayak Analytics
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Turn data into decisions with powerful analytics. Get real-time insights into your business performance and customer behavior.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <Check className="text-purple-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Custom dashboards and data visualization</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-purple-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Predictive analytics powered by machine learning</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-purple-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Automated reports delivered to your inbox</span>
                </div>
                <div className="flex items-start">
                  <Check className="text-purple-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Integration with 100+ data sources</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('register')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2" size={18} />
              </button>
            </div>
            <div className="order-1 md:order-2">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl h-96 shadow-xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-600/20"></div>
                <button className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                  <Play className="text-purple-600 ml-1" size={32} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Try all our products free for 14 days. No credit card required.
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
              Schedule Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
