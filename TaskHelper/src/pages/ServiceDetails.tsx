import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { services } from '@/data/services';

const ServiceDetails = () => {
  const { categoryId } = useParams();
  const service = services.find(s => s.id === categoryId);

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Service not found</h1>
            <Link to="/services">
              <Button variant="outline">Browse All Services</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const mockTaskers = [
    {
      id: '1',
      name: 'Sarah Johnson',
      rating: 4.9,
      reviews: 247,
      completedTasks: 312,
      hourlyRate: 65,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      distance: '2.3 miles away'
    },
    {
      id: '2',
      name: 'Michael Chen',
      rating: 5.0,
      reviews: 189,
      completedTasks: 256,
      hourlyRate: 70,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      distance: '3.1 miles away'
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      rating: 4.8,
      reviews: 321,
      completedTasks: 398,
      hourlyRate: 60,
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      distance: '1.8 miles away'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1">
        {/* Service Header */}
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link to="/services" className="inline-flex items-center text-gray-700 hover:text-teal-600 mb-6 transition-colors">
              <ArrowLeft className="mr-2" size={20} />
              Back to services
            </Link>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="text-6xl mb-4">{service.icon}</div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{service.name}</h1>
                <p className="text-xl text-gray-700 mb-6">{service.description}</p>
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-2">
                    <Star className="text-yellow-500 fill-yellow-500" size={20} />
                    <span className="font-semibold">4.9</span> average rating
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="font-semibold">{service.averagePrice}</span>
                </div>
              </div>
              <div>
                <img
                  src={service.image}
                  alt={service.name}
                  className="rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Popular Tasks */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular tasks</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {service.popularTasks.map((task, index) => (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-teal-600 flex-shrink-0" size={20} />
                    <span className="text-gray-900 font-medium">{task}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Available Taskers */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Available Taskers</h2>
              <span className="text-gray-600">{mockTaskers.length} Taskers nearby</span>
            </div>

            <div className="space-y-4">
              {mockTaskers.map((tasker) => (
                <Card key={tasker.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row gap-6">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={tasker.image} alt={tasker.name} />
                      <AvatarFallback>{tasker.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{tasker.name}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Star className="text-yellow-500 fill-yellow-500" size={16} />
                              <span className="font-semibold">{tasker.rating}</span>
                              <span>({tasker.reviews} reviews)</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="text-green-600" size={16} />
                              {tasker.completedTasks} tasks completed
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="text-gray-400" size={16} />
                              {tasker.distance}
                            </span>
                          </div>
                        </div>
                        <div className="text-right mt-4 md:mt-0">
                          <div className="text-2xl font-bold text-gray-900">${tasker.hourlyRate}/hr</div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <Link to={`/book/${service.id}?tasker=${tasker.id}`} className="flex-1">
                          <Button className="w-full bg-teal-600 hover:bg-teal-700">
                            Select & Continue
                          </Button>
                        </Link>
                        <Button variant="outline" className="flex-1">
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default ServiceDetails;
