import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                T
              </div>
              <span className="ml-3 text-xl font-bold text-white">Sahayak</span>
            </div>
            <p className="text-sm">
              Empowering businesses with innovative technology solutions for a better tomorrow.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-teal-400 transition-colors">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('team')} className="hover:text-teal-400 transition-colors">
                  Our Team
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('products')} className="hover:text-teal-400 transition-colors">
                  Products
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('testimonials')} className="hover:text-teal-400 transition-colors">
                  Testimonials
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-teal-400 transition-colors">
                  FAQ
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('support')} className="hover:text-teal-400 transition-colors">
                  Contact Us
                </button>
              </li>
              <li>
                <a href="#" className="hover:text-teal-400 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-teal-400 transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <Mail size={16} className="mt-1 mr-2 text-teal-400" />
                <span>support@techflow.com</span>
              </li>
              <li className="flex items-start">
                <Phone size={16} className="mt-1 mr-2 text-teal-400" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start">
                <MapPin size={16} className="mt-1 mr-2 text-teal-400" />
                <span>123 Tech Street, San Francisco, CA 94103</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm">
            © 2025 Sahayak. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-teal-400 transition-colors">
              <Linkedin size={20} />
            </a>
            <a href="#" className="hover:text-teal-400 transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="hover:text-teal-400 transition-colors">
              <Facebook size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
