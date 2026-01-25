import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { services } from '@/data/services';
import { useToast } from '@/hooks/use-toast';

const BookTask = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const service = services.find(s => s.id === serviceId);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    details: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Booking submitted:', formData);
    toast({
      title: "Task booked successfully!",
      description: "Your Tasker will be in touch shortly.",
    });
    setTimeout(() => navigate('/'), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Service not found</h1>
            <Link to="/services">
              <Button variant="outline">Browse Services</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={`/services/${serviceId}`} className="inline-flex items-center text-gray-700 hover:text-teal-600 mb-6 transition-colors">
            <ArrowLeft className="mr-2" size={20} />
            Back to service
          </Link>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="md:col-span-2">
              <Card className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Book your task</h1>
                <p className="text-gray-600 mb-8">Tell us the details of your {service.name.toLowerCase()} task</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="date" className="flex items-center gap-2 mb-2">
                        <Calendar size={18} className="text-gray-500" />
                        Task Date
                      </Label>
                      <Input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="h-12"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="time" className="flex items-center gap-2 mb-2">
                        <Clock size={18} className="text-gray-500" />
                        Preferred Time
                      </Label>
                      <Input
                        type="time"
                        id="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="h-12"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="location" className="flex items-center gap-2 mb-2">
                      <MapPin size={18} className="text-gray-500" />
                      Task Location
                    </Label>
                    <Input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Enter your address"
                      className="h-12"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="details" className="flex items-center gap-2 mb-2">
                      <MessageSquare size={18} className="text-gray-500" />
                      Task Details
                    </Label>
                    <Textarea
                      id="details"
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      placeholder="Describe what you need done, including any specific requirements or preferences..."
                      rows={5}
                      className="resize-none"
                      required
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base"
                    >
                      Confirm & Book
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div>
              <Card className="p-6 sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{service.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
                      <p className="text-sm text-gray-600">{service.description}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Estimated cost</span>
                      <span className="font-semibold text-gray-900">{service.averagePrice}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Final price will be confirmed by your Tasker based on task details
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <h4 className="font-semibold text-gray-900 text-sm">What's included:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Skilled & vetted Tasker</li>
                      <li>• TaskHelper Happiness Pledge</li>
                      <li>• Secure payment protection</li>
                      <li>• 24/7 customer support</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-6 mt-4 bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Need help?</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Our team is here to assist you with any questions about booking.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BookTask;
