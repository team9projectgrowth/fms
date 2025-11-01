import { Star, Quote, Play } from 'lucide-react';

interface TestimonialsPageProps {
  onNavigate: (page: string) => void;
}

export default function TestimonialsPage({ onNavigate }: TestimonialsPageProps) {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'CEO',
      company: 'TechStart Inc',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 5,
      quote: 'Sahayak transformed our business operations. Their solutions are innovative and incredibly reliable. We saw a 40% increase in productivity within the first quarter.',
      logo: 'TS'
    },
    {
      name: 'Michael Chen',
      role: 'CTO',
      company: 'DataCorp',
      image: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 5,
      quote: 'Outstanding service and support. The team went above and beyond to ensure our success. The integration was seamless and the platform is incredibly intuitive.',
      logo: 'DC'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Product Manager',
      company: 'InnovateLab',
      image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 5,
      quote: 'The best investment we made this year. ROI was visible within the first quarter. Sahayak has become an integral part of our daily operations.',
      logo: 'IL'
    },
    {
      name: 'David Martinez',
      role: 'Operations Director',
      company: 'GrowthCo',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 5,
      quote: 'We consolidated five different tools into Sahayak and saved both money and headaches. The unified platform is exactly what we needed.',
      logo: 'GC'
    },
    {
      name: 'Lisa Thompson',
      role: 'Marketing Director',
      company: 'BrandBuilders',
      image: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 5,
      quote: 'Customer support is exceptional. They respond quickly and actually solve problems. The analytics features have given us insights we never had before.',
      logo: 'BB'
    },
    {
      name: 'James Wilson',
      role: 'VP of Sales',
      company: 'SalesForce Pro',
      image: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
      rating: 5,
      quote: 'Sahayak helped us scale our operations without adding complexity. Our team adopted it instantly, which speaks volumes about the user experience.',
      logo: 'SF'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Customer Stories
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how businesses like yours are achieving remarkable results with Sahayak.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-teal-500 hover:shadow-xl transition-all"
              >
                <div className="flex items-start mb-6">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{testimonial.name}</h3>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                    <div className="flex items-center mt-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded text-white text-xs font-bold flex items-center justify-center mr-2">
                        {testimonial.logo}
                      </div>
                      <span className="text-sm font-semibold text-teal-600">{testimonial.company}</span>
                    </div>
                  </div>
                  <Quote className="text-teal-200" size={40} />
                </div>

                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="text-yellow-400 fill-current" size={20} />
                  ))}
                </div>

                <p className="text-gray-700 leading-relaxed">
                  "{testimonial.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Video Testimonials
            </h2>
            <p className="text-lg text-gray-600">
              Hear directly from our customers about their experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-teal-100 to-blue-100 rounded-2xl aspect-video relative overflow-hidden shadow-xl group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/30 to-blue-600/30 group-hover:from-teal-500/40 group-hover:to-blue-600/40 transition-all"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="text-teal-600 ml-1" size={28} />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white font-semibold">Sarah's Success Story</p>
                <p className="text-white/80 text-sm">TechStart Inc</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl aspect-video relative overflow-hidden shadow-xl group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-600/30 group-hover:from-blue-500/40 group-hover:to-purple-600/40 transition-all"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="text-blue-600 ml-1" size={28} />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white font-semibold">Michael's Journey</p>
                <p className="text-white/80 text-sm">DataCorp</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl aspect-video relative overflow-hidden shadow-xl group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-600/30 group-hover:from-purple-500/40 group-hover:to-pink-600/40 transition-all"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play className="text-purple-600 ml-1" size={28} />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white font-semibold">Emily's Experience</p>
                <p className="text-white/80 text-sm">InnovateLab</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Leading Companies
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands of businesses worldwide
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            {['TS', 'DC', 'IL', 'GC', 'BB', 'SF', 'TC', 'DP'].map((logo, index) => (
              <div
                key={index}
                className="flex items-center justify-center p-8 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{logo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Join Our Success Stories?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Start your free trial today and see why thousands of businesses trust Sahayak.
          </p>
          <button
            onClick={() => onNavigate('register')}
            className="px-8 py-4 bg-white text-teal-600 rounded-lg font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            Start Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}
