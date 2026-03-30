import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, X, MapPin, Users, Calendar, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const CITY_COORDS = {
  'berhampur':   [84.7941, 19.3149],
  'bhubaneswar': [85.8245, 20.2961],
  'cuttack':     [85.8830, 20.4625],
  'puri':        [85.8312, 19.8135],
  'rourkela':    [84.8536, 22.2604],
  'sambalpur':   [83.9756, 21.4669],
  'mumbai':      [72.8777, 19.0760],
  'delhi':       [77.2090, 28.6139],
  'bangalore':   [77.5946, 12.9716],
  'hyderabad':   [78.4867, 17.3850],
  'chennai':     [80.2707, 13.0827],
  'kolkata':     [88.3639, 22.5726],
  'pune':        [73.8567, 18.5204],
  'jaipur':      [75.7873, 26.9124],
};

const getCityCoords = (city) => city ? CITY_COORDS[city.toLowerCase()] || null : null;

export default function MapPage() {
  const { user } = useAuth();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [matches, setMatches] = useState([]);
  const [activeMatches, setActiveMatches] = useState([]);
  const [events, setEvents] = useState([]);
  const [destination, setDestination] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({ matches: 0, connections: 0, events: 0 });
  const [routeAdded, setRouteAdded] = useState(false);

  const myCoords = getCityCoords(user?.location?.city);

  useEffect(() => {
    Promise.all([
      api.get('/matches/suggestions').catch(() => ({ data: { matches: [] } })),
      api.get('/matches/active').catch(() => ({ data: { matches: [] } })),
      api.get('/events').catch(() => ({ data: { events: [] } })),
    ]).then(([sugg, active, evts]) => {
      setMatches(sugg.data.matches || []);
      setActiveMatches(active.data.matches || []);
      setEvents(evts.data.events || []);
      setStats({
        matches: sugg.data.matches?.length || 0,
        connections: active.data.matches?.length || 0,
        events: evts.data.events?.length || 0,
      });
    });
  }, []);

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: myCoords || [85.8245, 20.2961],
      zoom: 9,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');
  }, []);

  // Clear and re-add markers when tab or data changes
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const addMarker = (coords, label, color, popupHTML) => {
      const el = document.createElement('div');
      el.style.cssText = `width:36px;height:36px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:2px solid white;cursor:pointer;font-family:Inter,sans-serif`;
      el.innerHTML = label;

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
        .setHTML(`<div style="font-family:Inter,sans-serif;padding:4px">${popupHTML}</div>`);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current);

      markersRef.current.push(marker);
    };

    // My location
    if (myCoords) {
      addMarker(myCoords, 'ME', 'linear-gradient(135deg,#7C3AED,#2DD4BF)',
        `<b style="color:#7C3AED">You</b><br/><span style="color:#666">${user?.location?.city}</span>`
      );
    }

    // Match suggestions
    if (activeTab === 'all' || activeTab === 'matches') {
      matches.forEach(({ user: u, totalScore }) => {
        const coords = getCityCoords(u?.location?.city);
        if (!coords) return;
        addMarker(coords, 'M', '#7C3AED',
          `<b style="color:#7C3AED">${u.name}</b><br/>
           <span style="color:#7C3AED;font-weight:600">${Math.round(totalScore)}% match</span><br/>
           <span style="color:#666;font-size:12px">${u.interests?.slice(0, 3).join(', ')}</span>`
        );
      });
    }

    // Active connections + lines
    if (activeTab === 'all' || activeTab === 'active') {
      activeMatches.forEach((m) => {
        const other = m.requester?._id === user?._id ? m.receiver : m.requester;
        const coords = getCityCoords(other?.location?.city);
        if (!coords) return;
        addMarker(coords, 'C', '#34D399',
          `<b style="color:#34D399">${other?.name}</b><br/>
           <span style="color:#34D399;font-weight:600">Active Connection</span><br/>
           <span style="color:#666;font-size:12px">${other?.vibeTag || ''}</span>`
        );

        // Draw connection line
        if (myCoords && map.current.isStyleLoaded()) {
          const lineId = `line-${other?._id}`;
          if (!map.current.getSource(lineId)) {
            map.current.addSource(lineId, {
              type: 'geojson',
              data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [myCoords, coords] } }
            });
            map.current.addLayer({
              id: lineId, type: 'line', source: lineId,
              paint: { 'line-color': '#34D399', 'line-width': 2, 'line-opacity': 0.5, 'line-dasharray': [2, 2] }
            });
          }
        }
      });
    }

    // Events
    if (activeTab === 'all' || activeTab === 'events') {
      events.forEach((e) => {
        const coords = e.location?.lat && e.location?.lng
          ? [e.location.lng, e.location.lat]
          : getCityCoords(e.location?.city);
        if (!coords) return;
        addMarker(coords, 'E', '#F43F5E',
          `<b style="color:#F43F5E">${e.title}</b><br/>
           <span style="color:#666;font-size:12px">${new Date(e.date).toDateString()}</span><br/>
           <span style="color:#666;font-size:12px">${e.location?.city || ''}</span>`
        );
      });
    }
  }, [matches, activeMatches, events, activeTab]);

  const handleRoute = () => {
    const destCoords = getCityCoords(destination.trim());
    if (!destCoords) return toast.error('City not found. Try: Bhubaneswar, Mumbai, Delhi...');
    if (!myCoords) return toast.error('Please set your city in profile first.');

    // Add destination marker
    const el = document.createElement('div');
    el.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#FBBF24;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:2px solid white;font-family:Inter,sans-serif';
    el.innerHTML = 'GO';
    new mapboxgl.Marker(el).setLngLat(destCoords).addTo(map.current);

    // Draw route line
    if (map.current.getSource('route')) {
      map.current.getSource('route').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [myCoords, destCoords] }
      });
    } else {
      map.current.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [myCoords, destCoords] } }
      });
      map.current.addLayer({
        id: 'route', type: 'line', source: 'route',
        paint: { 'line-color': '#7C3AED', 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': [2, 1] }
      });
    }

    // Fit map to show both points
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(myCoords);
    bounds.extend(destCoords);
    map.current.fitBounds(bounds, { padding: 80, duration: 1500 });

    setRouteAdded(true);
    toast.success(`Route to ${destination} added!`);
  };

  const clearRoute = () => {
    if (map.current.getLayer('route')) map.current.removeLayer('route');
    if (map.current.getSource('route')) map.current.removeSource('route');
    setDestination('');
    setRouteAdded(false);
  };

  const tabs = [
    { key: 'all',     label: 'All',        icon: MapPin },
    { key: 'matches', label: 'Matches',     icon: Zap },
    { key: 'active',  label: 'Connections', icon: Users },
    { key: 'events',  label: 'Events',      icon: Calendar },
  ];

  return (
    <AppLayout noPadding>
      <div style={{ position: 'relative', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* Mapbox container */}
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

        {/* Search bar */}
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
          <input value={destination} onChange={e => setDestination(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRoute()}
            placeholder="Enter destination city..."
            style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(15,11,33,0.9)', backdropFilter: 'blur(12px)', color: '#F1F0F7', padding: '0 16px', fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none' }}
          />
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleRoute}
            style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#2DD4BF)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={18} color="white" />
          </motion.button>
          {routeAdded && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={clearRoute}
              style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#F87171" />
            </motion.button>
          )}
        </div>

        {/* Legend */}
        <div style={{ position: 'absolute', top: 72, left: 16, zIndex: 10, background: 'rgba(15,11,33,0.9)', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.2)', padding: '10px 14px' }}>
          {[
            { label: 'You',         color: '#A8A3C7', dot: '#7C3AED' },
            { label: 'Match',        color: '#7C3AED', dot: '#7C3AED' },
            { label: 'Connected',    color: '#34D399', dot: '#34D399' },
            { label: 'Event',        color: '#F43F5E', dot: '#F43F5E' },
            { label: 'Destination',  color: '#FBBF24', dot: '#FBBF24' },
          ].map(({ label, color, dot }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color, fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Tab filter + stats */}
        <div style={{ position: 'absolute', bottom: 80, left: 16, right: 16, zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
            {tabs.map(({ key, label, icon: Icon }) => (
              <motion.button key={key} whileTap={{ scale: 0.93 }} onClick={() => setActiveTab(key)}
                style={{ height: 36, padding: '0 14px', borderRadius: 20, border: `1px solid ${activeTab === key ? 'transparent' : 'rgba(124,58,237,0.3)'}`, background: activeTab === key ? 'linear-gradient(135deg,#7C3AED,#2DD4BF)' : 'rgba(15,11,33,0.85)', backdropFilter: 'blur(12px)', color: activeTab === key ? 'white' : '#A8A3C7', fontSize: 13, fontWeight: activeTab === key ? 600 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon size={13} />{label}
              </motion.button>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(15,11,33,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1px solid rgba(124,58,237,0.2)', padding: '10px 16px', display: 'flex', justifyContent: 'space-around' }}>
            {[
              { label: 'Matches',    value: stats.matches,     color: '#7C3AED' },
              { label: 'Connected',  value: stats.connections,  color: '#34D399' },
              { label: 'Events',     value: stats.events,       color: '#F43F5E' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color, margin: 0 }}>{value}</p>
                <p style={{ fontSize: 11, color: '#6E6893', margin: 0 }}>{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
