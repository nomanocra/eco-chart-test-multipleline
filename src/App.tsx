import React, { useState } from 'react'
import LineChart from './components/LineChart'
import './App.css'

function App() {
  const [singleAirlineMode, setSingleAirlineMode] = useState(true)

  return (
    <div className="app">
      <div className="app-header">
        <h1>Historical Direct Flights per Airline</h1>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={singleAirlineMode}
            onChange={(e) => setSingleAirlineMode(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Single Airline Hover</span>
        </label>
      </div>
      <LineChart singleAirlineMode={singleAirlineMode} />
    </div>
  )
}

export default App

