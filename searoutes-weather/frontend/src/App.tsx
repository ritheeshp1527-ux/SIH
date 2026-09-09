import React, { useState } from 'react';
import { MapLibreViewer } from './components/MapLibreViewer';
import { VoyageInputForm } from './components/VoyageInputForm';
import { getVoyageRoute } from './services/apiClient';
import './index.css';

function App() {
  const [routePlan, setRoutePlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateRoute = async (requestData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getVoyageRoute(requestData);
      setRoutePlan(data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to generate route plan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h1>SeaRoute Engine</h1>
        <VoyageInputForm onSubmit={handleGenerateRoute} isLoading={isLoading} />
        {error && <div className="error-message">{error}</div>}
        
        {routePlan && routePlan.routes && routePlan.routes.length > 0 && (
          <div className="route-info glass-panel">
            <h3>Route Details</h3>
            <div className="info-row">
              <span className="info-label">Source</span>
              <span className="info-value">{routePlan.voyageRequest?.sourcePort}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Destination</span>
              <span className="info-value">{routePlan.voyageRequest?.destinationPort}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Distance</span>
              <span className="info-value highlight">{Math.round(routePlan.routes[0].distance / 1852)} NM <span style={{fontSize: '12px', color: '#94a3b8'}}>({Math.round(routePlan.routes[0].distance / 1000)} km)</span></span>
            </div>
            <div className="info-row">
              <span className="info-label">Travel Time</span>
              <span className="info-value">{routePlan.routes[0].duration > 0 ? `${Math.round(routePlan.routes[0].duration / 3600000)} hours` : 'N/A'}</span>
            </div>
            {routePlan.voyageRequest?.vesselSpeed && (
              <div className="info-row">
                <span className="info-label">Speed</span>
                <span className="info-value">{routePlan.voyageRequest.vesselSpeed} knots</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Environmental Data</span>
              <span className="info-value highlight">{routePlan.routes[0].environmentalPoints?.length || 0} pts</span>
            </div>
          </div>
        )}
      </div>
      <div className="map-area">
        <MapLibreViewer routePlan={routePlan} />
      </div>
    </div>
  );
}

export default App;
