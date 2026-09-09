import React, { useState } from 'react';

interface VoyageInputFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const VoyageInputForm: React.FC<VoyageInputFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    sourcePort: 'USNYC',
    destinationPort: 'NLRTM',
    departureTimestamp: new Date().toISOString().slice(0, 16),
    vesselImo: '',
    vesselDraft: '',
    vesselSpeed: '',
    avoidSeca: false,
    avoidHra: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      departureTimestamp: new Date(formData.departureTimestamp).toISOString(),
      vesselDraft: formData.vesselDraft ? parseFloat(formData.vesselDraft) : undefined,
      vesselSpeed: formData.vesselSpeed ? parseFloat(formData.vesselSpeed) : undefined,
    };
    onSubmit(payload);
  };

  return (
    <div className="form-container glass-panel">
      <h2>Voyage Configuration</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Source Port</label>
          <input name="sourcePort" value={formData.sourcePort} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Destination Port</label>
          <input name="destinationPort" value={formData.destinationPort} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Departure Date/Time</label>
          <input type="datetime-local" name="departureTimestamp" value={formData.departureTimestamp} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Vessel IMO</label>
          <input name="vesselImo" value={formData.vesselImo} onChange={handleChange} />
        </div>
        <div className="form-group-row">
          <div className="form-group">
            <label>Draft (m)</label>
            <input type="number" step="0.1" name="vesselDraft" value={formData.vesselDraft} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Speed (kts)</label>
            <input type="number" step="0.1" name="vesselSpeed" value={formData.vesselSpeed} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group-checkboxes">
          <label>
            <input type="checkbox" name="avoidSeca" checked={formData.avoidSeca} onChange={handleChange} />
            Avoid SECA
          </label>
          <label>
            <input type="checkbox" name="avoidHra" checked={formData.avoidHra} onChange={handleChange} />
            Avoid HRA
          </label>
        </div>
        <button type="submit" disabled={isLoading} className="submit-btn">
          {isLoading ? 'Calculating...' : 'Generate RoutePlan'}
        </button>
      </form>
    </div>
  );
};
