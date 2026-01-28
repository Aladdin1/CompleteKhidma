import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { taskerAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Calendar } from 'lucide-react';

export default function OpenForBidsPage() {
  const { i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await taskerAPI.getOpenForBidTasks({ limit: 50 });
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load tasks open for bids');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {i18n.language === 'ar' ? 'مهام مفتوحة للعروض' : 'Tasks open for bids'}
      </h1>
      <p className="text-gray-600 mb-6">
        {i18n.language === 'ar' ? 'مهام اختار أصحابها "مفتوحة للعروض" – يمكنك تقديم سعرك لأي منها.' : 'Tasks that clients posted as open for bids – you can submit your quote for any of them.'}
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-4 text-sm">{error}</div>
      )}

      {items.length === 0 ? (
        <Card className="p-8 text-center text-gray-600">
          <p className="text-lg mb-2">
            {i18n.language === 'ar' ? 'لا توجد مهام مفتوحة للعروض حالياً' : 'No tasks open for bids right now'}
          </p>
          <p className="text-sm">
            {i18n.language === 'ar' ? 'يجب أن تكون المهمة في نطاقك وفئتك' : 'Tasks must match your categories and service area'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((task) => (
            <Card key={task.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 capitalize">{task.category}</div>
                  <p className="text-gray-700 mt-1 line-clamp-2">{task.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                    {task.location?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {task.location.city}
                      </span>
                    )}
                    {task.schedule?.starts_at && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> {new Date(task.schedule.starts_at).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en')}
                      </span>
                    )}
                    {task.distance_km != null && (
                      <span>{task.distance_km} km</span>
                    )}
                  </div>
                </div>
                <Button className="bg-teal-600 hover:bg-teal-700 shrink-0" asChild>
                  <Link to={`/dashboard/tasks/${task.id}`}>
                    {i18n.language === 'ar' ? 'تقديم السعر' : 'Submit quote'}
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
