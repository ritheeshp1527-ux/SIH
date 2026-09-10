import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapLibreViewerProps {
  routePlan?: any;
}

export const MapLibreViewer: React.FC<MapLibreViewerProps> = ({ routePlan }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return; 
    
    const styleUrl = import.meta.env.VITE_GEOAPIFY_API_KEY
      ? `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${import.meta.env.VITE_GEOAPIFY_API_KEY}`
      : 'https://demotiles.maplibre.org/style.json';

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [0, 20],
      zoom: 2,
      attributionControl: false // Disable default to add custom one with proper credits
    });

    // Add navigation controls (zoom, compass)
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    // Add proper attribution for Geoapify & OSM
    map.current.addControl(new maplibregl.AttributionControl({
      customAttribution: '© <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }), 'bottom-right');

    map.current.on('load', () => {
      // Modular source and layer setup for future GeoJSON maritime route
      map.current?.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.current?.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00ffcc', 
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
      
      map.current?.addSource('env-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
      
      map.current?.addLayer({
        id: 'env-points-layer',
        type: 'circle',
        source: 'env-points',
        paint: {
          'circle-radius': 5,
          'circle-color': '#fcd34d', 
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Phase 5B: Wind Visualization Layer
      map.current?.addLayer({
        id: 'env-wind-layer',
        type: 'symbol',
        source: 'env-points',
        filter: [
          'all',
          ['has', 'windSpeed'],
          ['!=', ['get', 'windSpeed'], null],
          ['has', 'windDirection'],
          ['!=', ['get', 'windDirection'], null]
        ],
        layout: {
          'text-field': '↑',
          'text-rotate': ['+', ['get', 'windDirection'], 180],
          'text-rotation-alignment': 'map',
          'text-allow-overlap': true,
          'text-size': [
            'interpolate',
            ['linear'],
            ['get', 'windSpeed'],
            0, 14,
            50, 26
          ]
        },
        paint: {
          'text-color': [
            'interpolate',
            ['linear'],
            ['get', 'windSpeed'],
            0, '#4ade80',  // Green (calm)
            15, '#facc15', // Yellow (moderate)
            30, '#f97316', // Orange (strong)
            50, '#ef4444'  // Red (gale/storm)
          ],
          'text-halo-color': '#0f172a',
          'text-halo-width': 1.5
        }
      });
    });
  }, []);

  useEffect(() => {
    // If we have a route passed in from the backend (no fake data)
    if (!map.current || !routePlan || !routePlan.routes || routePlan.routes.length === 0) return;

    const primaryRoute = routePlan.routes.find((r: any) => r.isPrimary) || routePlan.routes[0];
    
    if (primaryRoute && primaryRoute.geometry) {
      const source: any = map.current.getSource('route');
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: primaryRoute.geometry
        });
        
        const coordinates = primaryRoute.geometry.coordinates;
        if (coordinates && coordinates.length > 0) {
            const bounds = new maplibregl.LngLatBounds(
                coordinates[0] as [number, number],
                coordinates[0] as [number, number]
            );
            
            for (const coord of coordinates) {
                bounds.extend(coord as [number, number]);
            }
            
            map.current.fitBounds(bounds, { padding: 50 });
        }
      }
      
      if (primaryRoute.environmentalPoints) {
         const pointsSource: any = map.current.getSource('env-points');
         if (pointsSource) {
            pointsSource.setData({
                type: 'FeatureCollection',
                features: primaryRoute.environmentalPoints.map((pt: any) => ({
                    type: 'Feature',
                    properties: pt,
                    geometry: {
                        type: 'Point',
                        coordinates: [pt.longitude, pt.latitude]
                    }
                }))
            });
         }
      }
    }
  }, [routePlan]);

  useEffect(() => {
    if (!map.current) return;

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px'
    });

    const formatVal = (val: any, unit: string) => val !== undefined && val !== null ? `${val} ${unit}` : null;
    const renderRow = (label: string, valStr: string | null) => `
      <div class="env-popup-row">
        <span class="env-popup-label">${label}</span>
        <span class="env-popup-value ${!valStr ? 'na' : ''}">${valStr || 'N/A'}</span>
      </div>
    `;

    const handleMouseEnter = () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    };

    const handleClick = (e: any) => {
      if (!e.features || e.features.length === 0 || !map.current) return;

      const feature = e.features[0];
      const props = feature.properties as any;
      const coordinates = (feature.geometry as any).coordinates.slice();

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      const utcTime = new Date(props.timestamp).toUTCString();
      const isMarineMissing = props.waveHeight === undefined || props.waveHeight === null;

      const htmlContent = `
        <div class="env-popup-header">Environmental Conditions</div>
        <div class="env-popup-time">${utcTime}</div>
        <div class="env-popup-time" style="margin-top:-16px; margin-bottom:16px;">Lat: ${props.latitude.toFixed(4)}, Lon: ${props.longitude.toFixed(4)}</div>
        
        <div class="env-popup-section">
          <div class="env-popup-section-title">Wind</div>
          ${renderRow('Speed', formatVal(props.windSpeed, 'kts'))}
          ${renderRow('Direction', formatVal(props.windDirection, '°'))}
        </div>

        <div class="env-popup-section">
          <div class="env-popup-section-title">Waves</div>
          ${renderRow('Height', formatVal(props.waveHeight, 'm'))}
          ${renderRow('Direction', formatVal(props.waveDirection, '°'))}
          ${props.wavePeriod !== undefined && props.wavePeriod !== null ? renderRow('Period', formatVal(props.wavePeriod, 's')) : ''}
        </div>

        <div class="env-popup-section">
          <div class="env-popup-section-title">Ocean Current</div>
          ${renderRow('Velocity', formatVal(props.oceanCurrentVelocity, 'kts'))}
          ${renderRow('Direction', formatVal(props.oceanCurrentDirection, '°'))}
        </div>
        
        ${isMarineMissing ? '<span class="env-popup-note">Marine forecast unavailable beyond the 8-day forecast horizon.</span>' : ''}
      `;

      popup.setLngLat(coordinates as [number, number]).setHTML(htmlContent).addTo(map.current);
    };

    map.current.on('mouseenter', 'env-points-layer', handleMouseEnter);
    map.current.on('mouseleave', 'env-points-layer', handleMouseLeave);
    map.current.on('click', 'env-points-layer', handleClick);

    return () => {
      popup.remove();
      if (map.current) {
        map.current.off('mouseenter', 'env-points-layer', handleMouseEnter);
        map.current.off('mouseleave', 'env-points-layer', handleMouseLeave);
        map.current.off('click', 'env-points-layer', handleClick);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <div className="map-legend">
        <div className="legend-title">Legend</div>
        <div className="legend-item">
          <div className="legend-swatch route"></div>
          <span className="legend-label">Maritime Route</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch point"></div>
          <span className="legend-label">Environmental Observation</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch wind-vector" style={{ fontSize: '16px', color: '#facc15', textAlign: 'center', width: '16px', fontWeight: 'bold' }}>↑</div>
          <span className="legend-label">Wind Vector</span>
        </div>
      </div>
    </div>
  );
};
