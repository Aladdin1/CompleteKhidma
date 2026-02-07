import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getGeoapifyTileUrl, searchAddresses, EGYPT_BOUNDS } from '@/services/geoapify';

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
  const debounceRef = useRef(null);

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Debounced search-as-you-type (min 2 chars)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAddresses(q, {
          lat: position[0],
          lon: position[1],
          radius: 50000,
          limit: 6,
        });
        setSearchResults(results);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        debounceRef.current = null;
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, position[0], position[1]]);

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
      const results = await searchAddresses(searchQuery, {
        lat: position[0],
        lon: position[1],
        radius: 50000,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result) => {
    const lat = result.lat != null ? parseFloat(result.lat) : position[0];
    const lng = result.lon != null ? parseFloat(result.lon) : position[1];
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
    setSearchQuery(result.display_name || result.formatted || '');
    setShowResults(false);
  };

  return (
    <div className="map-picker-container">
      <div className="map-search-container" ref={searchContainerRef}>
        <div className="map-search-form">
          <input
            type="text"
            className="map-search-input"
            placeholder={t('profile.mapSearchPlaceholder', 'Search for an address in Egypt...')}
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
                key={result.place_id || index}
                className="map-search-result-item"
                onClick={() => handleSelectResult(result)}
              >
                <div className="result-name">{result.display_name || result.formatted}</div>
                {result.result_type && <div className="result-type">{result.result_type}</div>}
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
        maxBounds={L.latLngBounds(EGYPT_BOUNDS[0], EGYPT_BOUNDS[1])}
        maxBoundsViscosity={1}
        minZoom={6}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.geoapify.com/">Geoapify</a>'
          url={getGeoapifyTileUrl('osm-bright')}
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
        <p>{t('profile.mapInstructions', 'Search for an address in Egypt or click on the map to select your location')}</p>
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
