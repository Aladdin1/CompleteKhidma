import React from 'react';
import { DollarSign, Calendar, TrendingUp, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const BecomeTasker = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-teal-600 to-blue-600 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-white">
                <h1 className="text-5xl font-bold mb-6">Earn money your way</h1>
                <p className="text-xl mb-8 text-white/90">
                  Be your own boss. Set your own schedule. Keep more of what you earn.
                </p>
                <div className="bg-white rounded-xl p-6 text-gray-900">
                  <h3 className="font-semibold mb-4">Get started in 3 steps:</h3>
                  <form className="space-y-4">
                    <Input placeholder="Full name" className="h-12" />
                    <Input type="email" placeholder="Email address" className="h-12" />
                    <Input placeholder="ZIP code" className="h-12" />
                    <Button className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base">
                      Sign Up Now
                      <ArrowRight className="ml-2" size={20} />
                    </Button>
                  </form>
                </div>
              </div>
              <div>
                <img
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600"
                  alt="Become a Tasker"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Why become a Tasker?</h2>
              <p className="text-xl text-gray-600">Join thousands earning on their own terms</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 text-center hover:shadow-xl transition-shadow">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="text-green-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Great Pay</h3>
                <p className="text-gray-600">
                  Set your own rates and keep 85% of what you earn
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-xl transition-shadow">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Flexibility</h3>
                <p className="text-gray-600">
                  Work when you want, where you want
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-xl transition-shadow">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="text-purple-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Grow Your Business</h3>
                <p className="text-gray-600">
                  Build your reputation and client base
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-xl transition-shadow">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-orange-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Community</h3>
                <p className="text-gray-600">
                  Join a supportive network of Taskers
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* How to Get Started */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">How to get started</h2>
            </div>

            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <div className="bg-teal-600 text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Sign up for free</h3>
                  <p className="text-lg text-gray-600">
                    Create your account in minutes. No fees to join, and you can start right away.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="bg-teal-600 text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete your profile</h3>
                  <p className="text-lg text-gray-600">
                    Tell us about your skills, experience, and the services you want to offer. Upload a photo and set your rates.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="bg-teal-600 text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pass a background check</h3>
                  <p className="text-lg text-gray-600">
                    We run a quick background check to keep our community safe. Most are completed within 2-3 business days.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="bg-teal-600 text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Start earning</h3>
                  <p className="text-lg text-gray-600">
                    Once approved, you can browse available tasks and start accepting jobs. Get paid directly to your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Earnings Potential */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Earnings potential</h2>
              <p className="text-xl text-gray-600">See what Taskers in your area are making</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-8 text-center">
                <div className="text-5xl font-bold text-teal-600 mb-2">$1,200</div>
                <p className="text-gray-600 text-lg mb-2">per week</p>
                <p className="text-sm text-gray-500">Part-time (15-20 hours)</p>
              </Card>

              <Card className="p-8 text-center bg-teal-50 border-2 border-teal-600">
                <div className="text-5xl font-bold text-teal-600 mb-2">$2,800</div>
                <p className="text-gray-600 text-lg mb-2">per week</p>
                <p className="text-sm text-gray-500">Full-time (35-40 hours)</p>
              </Card>

              <Card className="p-8 text-center">
                <div className="text-5xl font-bold text-teal-600 mb-2">$65-120</div>
                <p className="text-gray-600 text-lg mb-2">per hour</p>
                <p className="text-sm text-gray-500">Average hourly rate</p>
              </Card>
            </div>

            <p className="text-center text-sm text-gray-500 mt-8">
              * Earnings vary based on location, skills, and hours worked
            </p>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Requirements</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Age 18 or older</h4>
                  <p className="text-gray-600 text-sm">Must be at least 18 years old</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Background check</h4>
                  <p className="text-gray-600 text-sm">Pass our screening process</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Smartphone</h4>
                  <p className="text-gray-600 text-sm">iOS or Android device required</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Bank account</h4>
                  <p className="text-gray-600 text-sm">For receiving payments</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Skills or tools</h4>
                  <p className="text-gray-600 text-sm">For your chosen services</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="text-teal-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Reliable transportation</h4>
                  <p className="text-gray-600 text-sm">To reach client locations</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to start earning?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join our community of Taskers today. It's free to sign up.
            </p>
            <Button size="lg" className="bg-white text-teal-600 hover:bg-gray-100 px-8">
              Apply to Become a Tasker
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default BecomeTasker;
