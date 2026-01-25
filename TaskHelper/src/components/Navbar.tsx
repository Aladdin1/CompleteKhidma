import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">TaskHelper</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/services" className="text-gray-700 hover:text-teal-600 font-medium transition-colors">
              Services
            </Link>
            <Link to="/how-it-works" className="text-gray-700 hover:text-teal-600 font-medium transition-colors">
              How it works
            </Link>
            <Link to="/become-tasker" className="text-gray-700 hover:text-teal-600 font-medium transition-colors">
              Become a Tasker
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" className="text-gray-700 hover:text-teal-600">
              <UserCircle className="mr-2 h-5 w-5" />
              Log in
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              Sign up
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-teal-600 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 pt-2 pb-4 space-y-3">
            <Link
              to="/services"
              className="block py-2 text-gray-700 hover:text-teal-600 font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Services
            </Link>
            <Link
              to="/how-it-works"
              className="block py-2 text-gray-700 hover:text-teal-600 font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              How it works
            </Link>
            <Link
              to="/become-tasker"
              className="block py-2 text-gray-700 hover:text-teal-600 font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Become a Tasker
            </Link>
            <div className="pt-2 space-y-2">
              <Button variant="outline" className="w-full">
                Log in
              </Button>
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                Sign up
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
