import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: 'home' },
    { name: 'About', path: 'about' },
    { name: 'Products', path: 'products' },
    { name: 'Team', path: 'team' },
    { name: 'Testimonials', path: 'testimonials' },
    { name: 'FAQ', path: 'faq' },
    { name: 'Support', path: 'support' },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              T
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">Sahayak</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => onNavigate(link.path)}
                className={`text-sm font-medium transition-colors ${
                  currentPage === link.path
                    ? 'text-teal-600'
                    : 'text-gray-700 hover:text-teal-600'
                }`}
              >
                {link.name}
              </button>
            ))}
            <button
              onClick={() => onNavigate('login')}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg hover:shadow-lg transition-shadow"
            >
              Dashboard Login
            </button>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  onNavigate(link.path);
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  currentPage === link.path
                    ? 'bg-teal-50 text-teal-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.name}
              </button>
            ))}
            <button
              onClick={() => {
                onNavigate('login');
                setIsMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg"
            >
              Dashboard Login
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
