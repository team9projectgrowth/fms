import { Target, Eye, Heart, Award } from 'lucide-react';

export default function AboutPage() {
  const milestones = [
    { year: '2018', title: 'Company Founded', description: 'Started with a vision to revolutionize business technology' },
    { year: '2019', title: '1,000 Customers', description: 'Reached our first thousand happy customers' },
    { year: '2021', title: 'Series A Funding', description: 'Raised $20M to accelerate growth and innovation' },
    { year: '2023', title: 'Global Expansion', description: 'Opened offices in 5 countries across 3 continents' },
    { year: '2025', title: '50,000+ Users', description: 'Serving businesses of all sizes worldwide' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            About Sahayak
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We are on a mission to empower businesses with innovative technology solutions that drive real results.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Our Story
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                Sahayak was born from a simple idea: technology should empower, not complicate. Founded in 2018 by a team of passionate engineers and entrepreneurs, we set out to create solutions that businesses actually want to use.
              </p>
              <p className="text-lg text-gray-600 mb-4">
                Today, we serve thousands of companies worldwide, from scrappy startups to Fortune 500 enterprises. Our commitment to innovation, customer success, and ethical business practices drives everything we do.
              </p>
              <p className="text-lg text-gray-600">
                We believe the best technology feels invisible. It just works, enabling teams to focus on what matters most: growing their business and delighting their customers.
              </p>
            </div>
            <div className="bg-gradient-to-br from-teal-100 to-blue-100 rounded-3xl h-96 shadow-xl"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="text-center p-8 bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-600">
                To democratize enterprise-grade technology, making it accessible and affordable for businesses of all sizes.
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Eye className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-600">
                A world where every business has the tools and insights needed to reach its full potential.
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h3>
              <p className="text-gray-600">
                Customer obsession, relentless innovation, transparency, and doing the right thing, always.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Journey
            </h2>
            <p className="text-lg text-gray-600">
              Key milestones that shaped our story
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-teal-500 to-blue-600 hidden md:block"></div>

            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex flex-col md:flex-row items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="text-3xl font-bold text-teal-600 mb-2">{milestone.year}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{milestone.title}</h3>
                      <p className="text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <Award className="text-white" size={32} />
                    </div>
                  </div>
                  <div className="flex-1 hidden md:block"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Join Us on Our Journey
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            We're always looking for talented individuals who share our passion for innovation and customer success.
          </p>
          <button className="px-8 py-4 bg-white text-teal-600 rounded-lg font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1">
            View Open Positions
          </button>
        </div>
      </section>
    </div>
  );
}
