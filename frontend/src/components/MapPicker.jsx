import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to handle map click events and update view
function MapClickHandler({ onLocationSelect, latitude, longitude }) {
  const map = useMap();
  
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (latitude && longitude) {
      map.setView([latitude, longitude], map.getZoom());
    }
  }, [latitude, longitude, map]);

  return null;
}

// Geocoding function using Nominatim (OpenStreetMap)
async function geocodeAddress(query) {
  try {
    // Focus on Cairo, Egypt by default - expanded viewbox to cover Greater Cairo
    // viewbox format: min_lon,min_lat,max_lon,max_lat
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=eg&bounded=1&viewbox=31.0,29.8,31.5,30.3&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Khidma Platform'
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}

function MapPicker({ latitude, longitude, onLocationSelect, center }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState(
    latitude && longitude ? [latitude, longitude] : center || [30.0444, 31.2357]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLocationSelect = (lat, lng) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
    setShowResults(false);
  };

  const handleSearch = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);
    
    try {
      const results = await geocodeAddress(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  return (
    <div className="map-picker-container">
      <div className="map-search-container" ref={searchContainerRef}>
        <div className="map-search-form">
          <input
            type="text"
            className="map-search-input"
            placeholder={t('profile.mapSearchPlaceholder', 'Search for an address or location in Cairo...')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim() === '') {
                setShowResults(false);
              }
            }}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowResults(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(e);
              }
            }}
          />
          <button 
            type="button" 
            className="map-search-button" 
            disabled={isSearching}
            onClick={handleSearch}
          >
            {isSearching ? '...' : '🔍'}
          </button>
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="map-search-results">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="map-search-result-item"
                onClick={() => handleSelectResult(result)}
              >
                <div className="result-name">{result.display_name}</div>
                <div className="result-type">{result.type}</div>
              </div>
            ))}
          </div>
        )}
        {showResults && searchResults.length === 0 && !isSearching && searchQuery.trim() && (
          <div className="map-search-results">
            <div className="map-search-no-results">{t('profile.mapSearchNoResults', 'No results found')}</div>
          </div>
        )}
      </div>
      
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: '400px', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler 
          onLocationSelect={handleLocationSelect} 
          latitude={latitude}
          longitude={longitude}
        />
        {position && (
          <Marker position={position} />
        )}
      </MapContainer>
      <div className="map-instructions">
        <p>{t('profile.mapInstructions', 'Search for an address or click on the map to select your location')}</p>
        {latitude && longitude && (
          <p className="coordinates">
            {t('profile.coordinates', 'Coordinates')}: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
}

export default MapPicker;
