import { TOPIC_STATUS, label } from '../labels'

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{label(TOPIC_STATUS, status)}</span>
}
