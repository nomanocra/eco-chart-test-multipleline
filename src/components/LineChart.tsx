import React, { useState, useMemo, useCallback } from 'react'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Customized,
} from 'recharts'
import './LineChart.css'

interface DataPoint {
  year: number
  [key: string]: number
}

interface Airline {
  code: string
  name: string
  color: string
  group: 'operating' | 'discontinued'
}

// Couleurs normales pour les Operating Airlines
const operatingColors = [
  '#1f77b4', // Bleu foncé
  '#2ca02c', // Vert
  '#ff7f0e', // Orange
  '#d62728', // Rouge
  '#9467bd', // Violet
  '#8c564b', // Marron
  '#e377c2', // Rose
  '#7f7f7f', // Gris
  '#bcbd22', // Jaune-vert
  '#17becf', // Cyan
]

// Couleurs pastel pour les Discontinued Airlines
const discontinuedColors = [
  '#aec7e8', // Bleu pastel
  '#98df8a', // Vert pastel
  '#ffbb78', // Orange pastel
  '#ff9896', // Rouge pastel
  '#c5b0d5', // Violet pastel
  '#c49c94', // Marron pastel
  '#f7b6d3', // Rose pastel
  '#c7c7c7', // Gris pastel
  '#dbdb8d', // Jaune-vert pastel
  '#9edae5', // Cyan pastel
]

// Génération des codes d'airlines
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

// Génération de données mensuelles avec transitions douces
const generateData = (airlines: Airline[]): DataPoint[] => {
  const years = Array.from({ length: 15 }, (_, i) => 2010 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const data: DataPoint[] = []

  // Stocker la dernière valeur par airline pour limiter les variations
  const lastValues: { [key: string]: number } = {}

  // Initialiser les valeurs de départ
  airlines.forEach((airline) => {
    if (airline.group === 'operating') {
      lastValues[airline.code] = Math.random() * 2000 + 2000 // 2000-4000
    } else {
      lastValues[airline.code] = Math.random() * 1500 + 1000 // 1000-2500
    }
  })

  years.forEach((year) => {
    months.forEach((month) => {
      const dataPoint: DataPoint = { year: year + (month - 1) / 12 }

      airlines.forEach((airline) => {
        const lastValue = lastValues[airline.code]

        // Variation max de 8% par mois pour des lignes cohérentes
        const maxVariation = lastValue * 0.08
        const variation = (Math.random() - 0.5) * 2 * maxVariation

        let newValue = lastValue + variation

        // Appliquer les tendances
        if (airline.group === 'operating') {
          // COVID drop en 2020
          if (year === 2020 && month >= 3 && month <= 6) {
            newValue *= 0.85
          }
          // Reprise progressive après COVID
          if (year === 2021 || (year === 2022 && month <= 6)) {
            newValue *= 1.02
          }
          // Maintenir dans une fourchette raisonnable
          newValue = Math.max(800, Math.min(5500, newValue))
        } else {
          // Discontinued: déclin progressif après 2015
          if (year > 2015) {
            newValue *= 0.997 // Déclin lent mais constant
          }
          if (year > 2018) {
            newValue *= 0.995
          }
          // Maintenir dans une fourchette raisonnable
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

interface LineChartProps {
  singleAirlineMode: boolean
}

const LineChart: React.FC<LineChartProps> = ({ singleAirlineMode }) => {
  const airlines = useMemo(() => generateAirlines(), [])
  const data = useMemo(() => generateData(airlines), [airlines])

  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set())
  const [hiddenGroups, setHiddenGroups] = useState<Set<'operating' | 'discontinued'>>(new Set())
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

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

  const isItemVisible = (airline: Airline): boolean => {
    if (hiddenGroups.has(airline.group)) return false
    if (hiddenItems.has(airline.code)) return false
    return true
  }

  const getLineOpacity = (airline: Airline): number => {
    if (!isItemVisible(airline)) return 0
    if (!singleAirlineMode) return 1 // Mode classique: pas d'opacité réduite
    if (hoveredItem === null) return 1
    if (hoveredItem === airline.code) return 1
    return 0.15
  }

  const getLineWidth = (airline: Airline): number => {
    if (hoveredItem === airline.code) return 3
    return 2
  }


  // Formater la date à partir de la valeur décimale
  const formatDate = (yearDecimal: number): string => {
    const year = Math.floor(yearDecimal)
    const monthIndex = Math.round((yearDecimal - year) * 12)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[monthIndex]} ${year}`
  }

  // Tooltip personnalisé
  const CustomTooltip = () => {
    if (activeIndex === null) return null

    const dataPoint = data[activeIndex]
    if (!dataPoint) return null

    // Mode Single Airline
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

    // Mode classique - afficher toutes les airlines visibles
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

  // Gestion du mouvement de la souris sur le graphique
  const handleMouseMove = (state: any) => {
    if (state && state.activeTooltipIndex !== undefined) {
      setActiveIndex(state.activeTooltipIndex)
    }
  }

  const handleMouseLeave = () => {
    setActiveIndex(null)
    if (!singleAirlineMode) {
      // En mode classique, pas besoin de reset hoveredItem
      return
    }
  }

  const operatingAirlines = airlines.filter((a) => a.group === 'operating')
  const discontinuedAirlines = airlines.filter((a) => a.group === 'discontinued')

  const renderLegend = () => {
    return (
      <div className="legend-container">
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
                <span
                  className="legend-color"
                  style={{ backgroundColor: airline.color, border: '1px dashed #999' }}
                />
                <span className="legend-label">{airline.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
            {/* Lignes triées pour que la ligne survolée soit au-dessus */}
            {[...airlines]
              .sort((a, b) => {
                // La ligne survolée doit être rendue en dernier (au-dessus)
                if (a.code === hoveredItem) return 1
                if (b.code === hoveredItem) return -1
                return 0
              })
              .map((airline) => (
              <React.Fragment key={airline.code}>
                {/* Ligne invisible pour zone de hover plus grande */}
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
                {/* Ligne visible */}
                <Line
                  type="monotone"
                  dataKey={airline.code}
                  stroke={airline.color}
                  strokeWidth={getLineWidth(airline)}
                  strokeOpacity={getLineOpacity(airline)}
                  strokeDasharray={airline.group === 'discontinued' ? '5 5' : undefined}
                  dot={(props: any) => {
                    const { cx, cy, index } = props
                    // Mode Single: point uniquement sur la ligne survolée
                    if (singleAirlineMode) {
                      if (hoveredItem === airline.code && activeIndex === index) {
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={airline.color}
                            stroke="#fff"
                            strokeWidth={2}
                            style={{ pointerEvents: 'none' }}
                          />
                        )
                      }
                    } else {
                      // Mode classique: points sur toutes les lignes visibles
                      if (activeIndex === index && isItemVisible(airline)) {
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={airline.color}
                            stroke="#fff"
                            strokeWidth={2}
                            style={{ pointerEvents: 'none' }}
                          />
                        )
                      }
                    }
                    return <circle cx={cx} cy={cy} r={0} />
                  }}
                  activeDot={false}
                  hide={!isItemVisible(airline)}
                  style={{ pointerEvents: 'none' }}
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

