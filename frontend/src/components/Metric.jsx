import Icon from './Icon'

// One summary card. `tooltip` adds an info button that explains the number; `alert` colours the value red.
export default function Metric({ label, value, helper, icon, tooltip, alert = false }) {
  return (
    <div className={alert ? 'metric-card alert' : 'metric-card'}>
      <div className="metric-label">
        {icon && (
          <span className="metric-icon">
            <Icon name={icon} size={16} />
          </span>
        )}
        <span>{label}</span>
        {tooltip && (
          <span className="tooltip-wrap">
            <button type="button" className="info-button" aria-label="Giải thích chỉ số">
              <Icon name="info" size={15} />
            </button>
            <span className="tooltip" role="tooltip">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <div className="metric-value">{value}</div>
      {helper && <div className="metric-helper">{helper}</div>}
    </div>
  )
}
