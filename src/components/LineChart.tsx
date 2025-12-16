/**
 * LineChart Component
 *
 * An interactive line chart displaying airline performance metrics over time (2010-2024).
 * Features two display modes controlled by the parent component:
 *
 * 1. Single Airline Mode (singleAirlineMode=true):
 *    - Hovering over a line highlights only that airline
 *    - Other lines fade to low opacity (0.08)
 *    - Tooltip shows only the hovered airline's data
 *
 * 2. Classic Mode (singleAirlineMode=false):
 *    - All visible lines remain at full opacity
 *    - Tooltip shows all visible airlines' values at the hovered X position
 *
 * The chart includes:
 * - 12 airlines split into two groups (Operating and Discontinued)
 * - Interactive legend with show/hide functionality per airline or per group
 * - Hover effects with visual feedback (line thickness, opacity)
 * - Monthly data points with smooth transitions between values
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import './LineChart.css'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents a single data point in the chart.
 * Contains a year (as decimal to represent months) and values for each airline.
 * Example: { year: 2020.5, LX: 3200, BA: 2800, ... }
 */
interface DataPoint {
  year: number
  [key: string]: number
}

/**
 * Represents an airline with its display properties.
 */
interface Airline {
  code: string                          // IATA-style code (e.g., "LX", "BA")
  name: string                          // Full display name
  color: string                         // Line color (hex)
  group: 'operating' | 'discontinued'   // Determines styling (solid vs dashed)
}

// =============================================================================
// COLOR PALETTES
// =============================================================================

// Vivid colors for Operating Airlines (solid lines)
const operatingColors = [
  '#1f77b4', // Dark blue
  '#2ca02c', // Green
  '#ff7f0e', // Orange
  '#d62728', // Red
  '#9467bd', // Purple
  '#8c564b', // Brown
  '#e377c2', // Pink
  '#7f7f7f', // Gray
  '#bcbd22', // Yellow-green
  '#17becf', // Cyan
]

// Pastel colors for Discontinued Airlines (dashed lines)
// Lighter shades to visually distinguish from operating airlines
const discontinuedColors = [
  '#aec7e8', // Pastel blue
  '#98df8a', // Pastel green
  '#ffbb78', // Pastel orange
  '#ff9896', // Pastel red
  '#c5b0d5', // Pastel purple
  '#c49c94', // Pastel brown
  '#f7b6d3', // Pastel pink
  '#c7c7c7', // Pastel gray
  '#dbdb8d', // Pastel yellow-green
  '#9edae5', // Pastel cyan
]

// =============================================================================
// DATA GENERATION
// =============================================================================

/**
 * Creates the list of airlines with their properties.
 * Returns 12 airlines: 6 operating (solid lines) + 6 discontinued (dashed lines).
 */
const generateAirlines = (): Airline[] => {
  const operatingAirlines: Airline[] = ['LX', 'BA', 'AF', 'LH', 'KL', 'IB'].map(
    (code, index) => ({
      code,
      name: `Airline ${code}`,
      color: operatingColors[index],
      group: 'operating' as const,
    })
  )

  const discontinuedAirlines: Airline[] = ['CX', 'LZ', 'C3', 'UL', 'AA', 'DL'].map(
    (code, index) => ({
      code,
      name: `Airline ${code}`,
      color: discontinuedColors[index],
      group: 'discontinued' as const,
    })
  )

  return [...operatingAirlines, ...discontinuedAirlines]
}

/**
 * Generates simulated monthly data for all airlines from 2010 to 2024.
 *
 * Data characteristics:
 * - Monthly granularity (year stored as decimal: 2020.5 = June 2020)
 * - Smooth transitions: max 8% variation between consecutive months
 * - Operating airlines: higher initial values (2000-4000), with COVID impact in 2020
 * - Discontinued airlines: lower values (1000-2500), with gradual decline after 2015
 *
 * @param airlines - List of airlines to generate data for
 * @returns Array of 180 data points (15 years × 12 months)
 */
const generateData = (airlines: Airline[]): DataPoint[] => {
  const years = Array.from({ length: 15 }, (_, i) => 2010 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const data: DataPoint[] = []

  // Track last value per airline to ensure smooth month-to-month transitions
  const lastValues: { [key: string]: number } = {}

  // Initialize with random starting values (operating airlines start higher)
  airlines.forEach((airline) => {
    if (airline.group === 'operating') {
      lastValues[airline.code] = Math.random() * 2000 + 2000 // Range: 2000-4000
    } else {
      lastValues[airline.code] = Math.random() * 1500 + 1000 // Range: 1000-2500
    }
  })

  years.forEach((year) => {
    months.forEach((month) => {
      // Year as decimal allows precise X-axis positioning (e.g., 2020.25 = April 2020)
      const dataPoint: DataPoint = { year: year + (month - 1) / 12 }

      airlines.forEach((airline) => {
        const lastValue = lastValues[airline.code]

        // Limit variation to ±8% for smooth, realistic-looking lines
        const maxVariation = lastValue * 0.08
        const variation = (Math.random() - 0.5) * 2 * maxVariation

        let newValue = lastValue + variation

        // Apply different trends based on airline group
        if (airline.group === 'operating') {
          // Simulate COVID-19 impact: sharp drop March-June 2020
          if (year === 2020 && month >= 3 && month <= 6) {
            newValue *= 0.85
          }
          // Simulate post-COVID recovery: gradual increase in 2021-mid 2022
          if (year === 2021 || (year === 2022 && month <= 6)) {
            newValue *= 1.02
          }
          // Clamp to valid range for operating airlines
          newValue = Math.max(800, Math.min(5500, newValue))
        } else {
          // Discontinued airlines: gradual decline starting 2015
          if (year > 2015) {
            newValue *= 0.997 // ~0.3% monthly decline
          }
          // Accelerated decline after 2018
          if (year > 2018) {
            newValue *= 0.995 // Additional ~0.5% monthly decline
          }
          // Clamp to valid range for discontinued airlines
          newValue = Math.max(100, Math.min(3500, newValue))
        }

        lastValues[airline.code] = newValue
        dataPoint[airline.code] = Math.round(newValue)
      })

      data.push(dataPoint)
    })
  })

  return data
}

// =============================================================================
// COMPONENT
// =============================================================================

interface LineChartProps {
  /**
   * Controls the hover behavior:
   * - true: Single Airline mode - only hovered line is highlighted, others fade
   * - false: Classic mode - all lines visible, tooltip shows all values
   */
  singleAirlineMode: boolean
}

const LineChart: React.FC<LineChartProps> = ({ singleAirlineMode }) => {
  // Generate data once on mount (memoized to prevent regeneration on re-renders)
  const airlines = useMemo(() => generateAirlines(), [])
  const data = useMemo(() => generateData(airlines), [airlines])

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Tracks which individual airlines are hidden via legend click
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set())

  // Tracks which groups (operating/discontinued) are hidden via group header click
  const [hiddenGroups, setHiddenGroups] = useState<Set<'operating' | 'discontinued'>>(new Set())

  // Currently hovered airline code (null when not hovering any line)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Index of the data point being hovered (for tooltip positioning)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // ---------------------------------------------------------------------------
  // VISIBILITY HANDLERS
  // ---------------------------------------------------------------------------

  /** Toggle visibility of a single airline when clicked in legend */
  const toggleItem = (code: string) => {
    setHiddenItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(code)) {
        newSet.delete(code)
      } else {
        newSet.add(code)
      }
      return newSet
    })
  }

  /** Toggle visibility of an entire group when group header is clicked */
  const toggleGroup = (group: 'operating' | 'discontinued') => {
    setHiddenGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(group)) {
        newSet.delete(group)
      } else {
        newSet.add(group)
      }
      return newSet
    })
  }

  /** Check if an airline should be displayed (not hidden individually or by group) */
  const isItemVisible = useCallback((airline: Airline): boolean => {
    if (hiddenGroups.has(airline.group)) return false
    if (hiddenItems.has(airline.code)) return false
    return true
  }, [hiddenGroups, hiddenItems])

  // ---------------------------------------------------------------------------
  // LINE STYLING CALLBACKS
  // ---------------------------------------------------------------------------

  /**
   * Determines line opacity based on visibility state and hover mode.
   * In Single Airline mode, non-hovered lines fade to 0.08 opacity.
   */
  const getLineOpacity = useCallback((airline: Airline): number => {
    if (hiddenGroups.has(airline.group)) return 0
    if (hiddenItems.has(airline.code)) return 0
    if (!singleAirlineMode) return 1
    if (hoveredItem === null) return 1
    if (hoveredItem === airline.code) return 1
    return 0.08 // Faded opacity for non-hovered lines in Single Airline mode
  }, [hiddenGroups, hiddenItems, singleAirlineMode, hoveredItem])

  /** Hovered lines are slightly thicker for emphasis */
  const getLineWidth = useCallback((airline: Airline): number => {
    if (hoveredItem === airline.code) return 3
    return 2
  }, [hoveredItem])


  // ---------------------------------------------------------------------------
  // TOOLTIP
  // ---------------------------------------------------------------------------

  /**
   * Converts decimal year to human-readable date string.
   * Example: 2020.5 -> "Jul 2020"
   */
  const formatDate = (yearDecimal: number): string => {
    const year = Math.floor(yearDecimal)
    const monthIndex = Math.round((yearDecimal - year) * 12)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[monthIndex]} ${year}`
  }

  /**
   * Custom tooltip component that adapts to the current mode:
   * - Single Airline mode: shows only the hovered airline's value
   * - Classic mode: shows all visible airlines' values at the current X position
   */
  const CustomTooltip = () => {
    if (activeIndex === null) return null

    const dataPoint = data[activeIndex]
    if (!dataPoint) return null

    // SINGLE AIRLINE MODE: Show only the hovered airline's data
    if (singleAirlineMode) {
      if (!hoveredItem) return null

      const airline = airlines.find((a) => a.code === hoveredItem)
      if (!airline) return null

      const value = dataPoint[hoveredItem]

      return (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: `2px solid ${airline.color}`,
            borderRadius: '4px',
            padding: '8px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '3px',
                backgroundColor: airline.color,
                borderRadius: '1px',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#333' }}>
              {airline.code}
            </span>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {formatDate(dataPoint.year)}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>
              {value?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      )
    }

    // CLASSIC MODE: Show all visible airlines' values at the current X position
    const visibleAirlines = airlines.filter((a) => isItemVisible(a))
    if (visibleAirlines.length === 0) return null

    return (
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          maxHeight: '300px',
          overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
          {formatDate(dataPoint.year)}
        </div>
        {visibleAirlines.map((airline) => {
          const value = dataPoint[airline.code]
          return (
            <div
              key={airline.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '2px 0',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '3px',
                  backgroundColor: airline.color,
                  borderRadius: '1px',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#333', minWidth: '24px' }}>
                {airline.code}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#333' }}>
                {value?.toLocaleString() || 0}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // MOUSE HANDLERS
  // ---------------------------------------------------------------------------

  // Throttle mouse move updates to ~60fps for performance
  const lastUpdateRef = useRef<number>(0)
  const throttleMs = 16 // 16ms ≈ 60fps

  /**
   * Handles mouse movement on chart area.
   * Updates activeIndex to show tooltip at the nearest data point.
   * Throttled to prevent excessive re-renders during fast mouse movement.
   */
  const handleMouseMove = useCallback((state: any) => {
    const now = Date.now()
    if (now - lastUpdateRef.current < throttleMs) return
    lastUpdateRef.current = now

    if (state && state.activeTooltipIndex !== undefined) {
      setActiveIndex(state.activeTooltipIndex)
    }
  }, [])

  /** Reset tooltip when mouse leaves the chart area */
  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null)
  }, [])

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------

  // Split airlines by group for legend rendering
  const operatingAirlines = useMemo(() => airlines.filter((a) => a.group === 'operating'), [airlines])
  const discontinuedAirlines = useMemo(() => airlines.filter((a) => a.group === 'discontinued'), [airlines])

  /**
   * Sort airlines so the hovered line renders last (on top of others).
   * SVG renders elements in order, so later elements appear on top.
   */
  const sortedAirlines = useMemo(() => {
    return [...airlines].sort((a, b) => {
      if (a.code === hoveredItem) return 1  // Hovered item goes to end (renders on top)
      if (b.code === hoveredItem) return -1
      return 0
    })
  }, [airlines, hoveredItem])

  // ---------------------------------------------------------------------------
  // LEGEND RENDERER
  // ---------------------------------------------------------------------------

  /**
   * Renders the interactive legend with two groups (Operating and Discontinued).
   *
   * Interactions:
   * - Click on group header: toggles visibility of all airlines in that group
   * - Click on airline item: toggles visibility of that specific airline
   * - Hover on airline item: highlights that airline's line in the chart
   *
   * Visual indicators:
   * - Operating airlines: solid color indicator
   * - Discontinued airlines: dashed color indicator (matches line style)
   * - Hidden items: have 'hidden' class applied for styling
   */
  const renderLegend = () => {
    return (
      <div className="legend-container">
        {/* OPERATING AIRLINES GROUP */}
        <div className={`legend-group ${hiddenGroups.has('operating') ? 'group-hidden' : ''}`}>
          <div
            className="legend-group-header"
            onClick={() => toggleGroup('operating')}
          >
            <span className="legend-group-title">Operating</span>
          </div>
          <div className="legend-items">
            {operatingAirlines.map((airline) => (
              <div
                key={airline.code}
                className={`legend-item ${hiddenItems.has(airline.code) || hiddenGroups.has('operating') ? 'hidden' : ''}`}
                onClick={() => toggleItem(airline.code)}
                onMouseEnter={() => setHoveredItem(airline.code)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span
                  className="legend-color"
                  style={{ backgroundColor: airline.color }}
                />
                <span className="legend-label">{airline.code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* DISCONTINUED AIRLINES GROUP */}
        <div className={`legend-group ${hiddenGroups.has('discontinued') ? 'group-hidden' : ''}`}>
          <div
            className="legend-group-header"
            onClick={() => toggleGroup('discontinued')}
          >
            <span className="legend-group-title">Discontinued</span>
          </div>
          <div className="legend-items">
            {discontinuedAirlines.map((airline) => (
              <div
                key={airline.code}
                className={`legend-item ${hiddenItems.has(airline.code) || hiddenGroups.has('discontinued') ? 'hidden' : ''}`}
                onClick={() => toggleItem(airline.code)}
                onMouseEnter={() => setHoveredItem(airline.code)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Dashed indicator to match the dashed line style */}
                <span
                  className="legend-color legend-color-dashed"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, ${airline.color} 0px, ${airline.color} 3px, transparent 3px, transparent 6px)`
                  }}
                />
                <span className="legend-label">{airline.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="line-chart-container">
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={data}
            margin={{ top: 5, right: 20, left: 10, bottom: 25 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => Math.floor(value).toString()}
              ticks={[2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024]}
            />
            <YAxis
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={singleAirlineMode ? false : { stroke: '#999', strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />

            {/*
              Lines are rendered in sortedAirlines order so the hovered line
              appears on top (SVG renders later elements above earlier ones)
            */}
            {sortedAirlines.map((airline) => (
              <React.Fragment key={airline.code}>
                {/*
                  INVISIBLE HIT AREA LINE
                  A thick (20px) invisible line that provides a larger hover target.
                  This improves UX by making it easier to hover over thin lines.
                */}
                <Line
                  type="monotone"
                  dataKey={airline.code}
                  stroke={airline.color}
                  strokeWidth={20}
                  strokeOpacity={0}
                  dot={false}
                  activeDot={false}
                  hide={!isItemVisible(airline)}
                  onMouseEnter={() => setHoveredItem(airline.code)}
                  onMouseLeave={() => setHoveredItem(null)}
                  isAnimationActive={false}
                />

                {/*
                  VISIBLE LINE
                  The actual displayed line with dynamic styling based on:
                  - Group: discontinued airlines use dashed lines
                  - Hover state: hovered lines are thicker
                  - Mode: in Single Airline mode, non-hovered lines fade
                */}
                <Line
                  type="monotone"
                  dataKey={airline.code}
                  stroke={airline.color}
                  strokeWidth={getLineWidth(airline)}
                  strokeOpacity={getLineOpacity(airline)}
                  strokeDasharray={airline.group === 'discontinued' ? '5 5' : undefined}
                  dot={false}
                  activeDot={
                    // Show active dot only when hovering and line should display it
                    activeIndex !== null && (
                      singleAirlineMode
                        ? hoveredItem === airline.code  // Single mode: only hovered line
                        : isItemVisible(airline)         // Classic mode: all visible lines
                    )
                      ? {
                          r: singleAirlineMode ? 6 : 4,   // Larger dot in single mode
                          fill: airline.color,
                          stroke: '#fff',
                          strokeWidth: 2,
                          style: { pointerEvents: 'none' },
                        }
                      : false
                  }
                  hide={!isItemVisible(airline)}
                  style={{ pointerEvents: 'none' }}  // Prevent interference with hit area line
                  isAnimationActive={false}
                />
              </React.Fragment>
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      {renderLegend()}
    </div>
  )
}

export default LineChart

