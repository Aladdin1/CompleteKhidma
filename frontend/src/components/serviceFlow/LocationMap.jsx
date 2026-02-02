import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';

const defaultCenter = { lat: 30.0444, lng: 31.2357 };

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

const LocationMap = ({ location, onLocationChange, i18n }) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [locationType, setLocationType] = useState('map');
  const isAr = i18n?.language === 'ar';

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationType('current');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const address = await reverseGeocode(latitude, longitude);
          onLocationChange({
            lat: latitude,
            lng: longitude,
            address,
            type: 'current',
          });
          setIsGettingLocation(false);
        },
        () => {
          setIsGettingLocation(false);
          alert(isAr ? 'تعذر الحصول على موقعك. ابحث عن عنوان بدلاً من ذلك.' : 'Unable to get your location. Please search for an address instead.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setIsGettingLocation(false);
      alert(isAr ? 'المتصفح لا يدعم الموقع الجغرافي' : 'Geolocation is not supported by your browser');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        onLocationChange({
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          address: display_name,
          type: 'manual',
        });
        setLocationType('search');
      } else {
        alert(isAr ? 'لم يتم العثور على الموقع.' : 'Location not found. Please try a different search.');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapClick = async () => {
    const lat = defaultCenter.lat + (Math.random() - 0.5) * 0.1;
    const lng = defaultCenter.lng + (Math.random() - 0.5) * 0.1;
    setLocationType('map');
    const address = await reverseGeocode(lat, lng);
    onLocationChange({
      lat,
      lng,
      address,
      type: 'selected',
    });
  };

  const mapCenter = location || defaultCenter;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className={`location-option ${locationType === 'current' && location ? 'location-option-active' : ''}`}
        >
          {isGettingLocation ? (
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5 text-teal-600" />
          )}
          <div className="text-left">
            <p className="font-medium text-foreground">
              {isAr ? 'استخدم موقعي الحالي' : 'Use Current Location'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'اكتشاف موقعي تلقائياً' : 'Auto-detect my position'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleMapClick}
          className={`location-option ${locationType === 'map' && location ? 'location-option-active' : ''}`}
        >
          <MapPin className="w-5 h-5 text-amber-500" />
          <div className="text-left">
            <p className="font-medium text-foreground">
              {isAr ? 'اختر على الخريطة' : 'Select on Map'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'انقر لوضع علامة' : 'Tap to drop a pin'}
            </p>
          </div>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder={isAr ? 'ابحث عن موقع...' : 'Search for a location...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="input-field-flow pl-12 pr-20"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? 'بحث' : 'Search')}
        </button>
      </div>

      <div
        className="map-container-flow h-64 sm:h-80 bg-muted/50 relative overflow-hidden cursor-pointer"
        onClick={handleMapClick}
      >
        <img
          src={`https://staticmap.openstreetmap.de/staticmap.php?center=${mapCenter.lat},${mapCenter.lng}&zoom=14&size=800x400&maptype=mapnik${location ? `&markers=${location.lat},${location.lng},red-pushpin` : ''}`}
          alt="Map"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-teal-500/5 to-amber-500/5">
          {!location && (
            <div className="text-center">
              <MapPin className="w-12 h-12 text-teal-500/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isAr ? 'انقر لاختيار موقع' : 'Click to select a location'}
              </p>
            </div>
          )}
        </div>
        {location && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10">
            <MapPin className="w-10 h-10 text-teal-600 drop-shadow-lg" fill="currentColor" />
          </div>
        )}
      </div>

      {location && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-accent border border-teal-500/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {isAr ? 'الموقع المحدد' : 'Selected Location'}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2">{location.address}</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LocationMap;
