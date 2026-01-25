import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Clock, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { services } from '@/data/services';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Everyday life made easier
              </h1>
              <p className="text-xl text-gray-700 mb-8">
                Connect with skilled Taskers for help with everything from home repairs to errands.
              </p>
              <div className="flex gap-3 mb-6">
                <Input 
                  placeholder="What do you need help with?"
                  className="flex-1 h-12 text-base"
                />
                <Button className="bg-teal-600 hover:bg-teal-700 h-12 px-8">
                  Get Started
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-teal-600" size={20} />
                  <span>Vetted Taskers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-teal-600" size={20} />
                  <span>Same-day service</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600"
                alt="Tasker helping with home improvement"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Popular services</h2>
            <p className="text-xl text-gray-600">What can we help you with?</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <Link
                key={service.id}
                to={`/services/${service.id}`}
                className="group bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-teal-500 hover:shadow-xl transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4 text-4xl bg-white rounded-lg p-2 shadow-md">
                    {service.icon}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-teal-600">{service.averagePrice}</span>
                    <ArrowRight className="text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" size={20} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/services">
              <Button variant="outline" size="lg" className="border-2 hover:border-teal-600 hover:text-teal-600">
                View All Services
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-xl text-gray-600">Getting help is easier than ever</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Choose your task</h3>
              <p className="text-gray-600">
                Select from hundreds of services and describe what you need done.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Pick your Tasker</h3>
              <p className="text-gray-600">
                Browse trusted Taskers by reviews, skills, and price.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-teal-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Get it done</h3>
              <p className="text-gray-600">
                Your Tasker arrives and gets the job done right.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link to="/how-it-works">
              <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why TaskHelper?</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-blue-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Vetted Professionals</h3>
              <p className="text-gray-600 text-sm">
                All Taskers pass background checks and identity verification
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="text-purple-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reviewed & Rated</h3>
              <p className="text-gray-600 text-sm">
                Read reviews from customers just like you
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-green-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Same-Day Service</h3>
              <p className="text-gray-600 text-sm">
                Get help as soon as today with thousands of available Taskers
              </p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-orange-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Happiness Pledge</h3>
              <p className="text-gray-600 text-sm">
                If you're not satisfied, we'll work to make it right
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of people getting things done with TaskHelper
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/services">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-gray-100 px-8">
                Book a Task
              </Button>
            </Link>
            <Link to="/become-tasker">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-teal-600 px-8">
                Become a Tasker
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
