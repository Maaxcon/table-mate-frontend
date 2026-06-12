import "./BarChart.css"

export type BarChartDatum = { label: string; value: number }

type BarChartProps = {
  data: BarChartDatum[]
  formatValue?: (value: number) => string
  emptyText?: string
}

/** A simple horizontal bar chart (CSS bars, no charting dependency). */
function BarChart({ data, formatValue = String, emptyText = "No data yet" }: BarChartProps) {
  if (data.length === 0) return <p className="bar-chart__empty">{emptyText}</p>
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="bar-chart">
      {data.map((d, i) => (
        <li key={`${d.label}-${i}`} className="bar-chart__row">
          <span className="bar-chart__label" title={d.label}>
            {d.label}
          </span>
          <span className="bar-chart__track">
            <span className="bar-chart__bar" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="bar-chart__value">{formatValue(d.value)}</span>
        </li>
      ))}
    </ul>
  )
}

export default BarChart
