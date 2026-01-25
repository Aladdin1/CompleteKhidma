import React from 'react';
import { Link } from 'react-router-dom';
import { Search, UserCheck, Calendar, CheckCircle, Shield, Star, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">How TaskHelper Works</h1>
            <p className="text-xl text-gray-700">
              Getting help with your to-do list has never been easier
            </p>
          </div>
        </section>

        {/* Main Steps */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-16">
              {/* Step 1 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                  <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600"
                    alt="Choose your task"
                    className="rounded-2xl shadow-xl"
                  />
                </div>
                <div className="order-1 md:order-2">
                  <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <Search className="text-teal-600" size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">1. Choose your task</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Browse hundreds of services from furniture assembly to home repairs. Describe what you need done and when you'd like it completed.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">Select from 100+ service categories</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">Set your preferred date and time</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">Add details about your task</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <UserCheck className="text-purple-600" size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">2. Pick your Tasker</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Browse trusted Taskers based on reviews, skills, and price. Chat with them to confirm details before booking.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">View profiles with ratings and reviews</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">Compare prices and availability</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">Message before you book</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600"
                    alt="Pick your Tasker"
                    className="rounded-2xl shadow-xl"
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                  <img
                    src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600"
                    alt="Get it done"
                    className="rounded-2xl shadow-xl"
                  />
                </div>
                <div className="order-1 md:order-2">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="text-green-600" size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">3. Get it done</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Your Tasker arrives on time and gets the job done right. Pay securely through the platform when the task is complete.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">Track your Tasker in real-time</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">Secure payment through the app</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-700">Leave a review after completion</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Why people love TaskHelper</h2>
              <p className="text-xl text-gray-600">Trusted by thousands of customers</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Vetted & Safe</h3>
                <p className="text-gray-600">
                  All Taskers pass background checks and identity verification
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="text-yellow-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Top Rated</h3>
                <p className="text-gray-600">
                  Choose from thousands of highly-rated Taskers
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-green-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Service</h3>
                <p className="text-gray-600">
                  Get help as soon as today with same-day availability
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="text-purple-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Fair Prices</h3>
                <p className="text-gray-600">
                  Transparent pricing with no hidden fees
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to check something off your list?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Get started today and experience the convenience of TaskHelper
            </p>
            <Link to="/services">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-gray-100 px-8">
                Book Your First Task
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default HowItWorks;
