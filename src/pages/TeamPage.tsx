import { Linkedin, Mail, ArrowRight } from 'lucide-react';

export default function TeamPage() {
  const team = [
    {
      name: 'Sarah Mitchell',
      role: 'CEO & Co-Founder',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
      linkedin: '#'
    },
    {
      name: 'David Chen',
      role: 'CTO & Co-Founder',
      image: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
      linkedin: '#'
    },
    {
      name: 'Emily Rodriguez',
      role: 'VP of Product',
      image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
      linkedin: '#'
    },
    {
      name: 'Michael Johnson',
      role: 'VP of Engineering',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
      linkedin: '#'
    },
    {
      name: 'Lisa Thompson',
      role: 'Head of Design',
      image: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400',
      linkedin: '#'
    },
    {
      name: 'James Wilson',
      role: 'Head of Marketing',
      image: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
      linkedin: '#'
    },
    {
      name: 'Maria Garcia',
      role: 'Head of Sales',
      image: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400',
      linkedin: '#'
    },
    {
      name: 'Alex Kumar',
      role: 'Head of Customer Success',
      image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
      linkedin: '#'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Meet Our Team
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Passionate innovators dedicated to building products that make a real difference.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {team.map((member, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2"
              >
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-teal-600 font-medium mb-4">{member.role}</p>
                  <div className="flex space-x-3">
                    <a
                      href={member.linkedin}
                      className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-teal-50 transition-colors group/icon"
                    >
                      <Linkedin className="text-gray-600 group-hover/icon:text-teal-600" size={20} />
                    </a>
                    <a
                      href="#"
                      className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-teal-50 transition-colors group/icon"
                    >
                      <Mail className="text-gray-600 group-hover/icon:text-teal-600" size={20} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-3xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              We're Growing!
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Join our talented team and help us build the future of business technology. We offer competitive salaries, great benefits, and a culture that values innovation and work-life balance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center">
                View Open Positions
                <ArrowRight className="ml-2" size={20} />
              </button>
              <button className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold border-2 border-gray-300 hover:border-teal-500 transition-colors">
                Learn About Our Culture
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Join Sahayak?
            </h2>
            <p className="text-lg text-gray-600">
              More than just a job, it's a mission
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Innovation First</h3>
              <p className="text-gray-600">
                Work on cutting-edge projects that push the boundaries of what's possible in tech.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Remote Friendly</h3>
              <p className="text-gray-600">
                Work from anywhere with flexible hours and unlimited PTO.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Continuous Learning</h3>
              <p className="text-gray-600">
                Annual learning budget and access to conferences, courses, and mentorship.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
