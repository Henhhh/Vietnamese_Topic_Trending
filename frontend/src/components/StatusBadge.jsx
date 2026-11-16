import { FEED_STATUS, RUN_STATUS, STEP_STATUS, TOPIC_STATUS, label } from '../labels'

// Each kind of status has its own codes and labels; the tone is the colour family from the design.
const KINDS = {
  topic: { labels: TOPIC_STATUS, tones: { rising: 'success', new: 'new', stable: 'stable', falling: 'danger' } },
  feed: { labels: FEED_STATUS, tones: { ok: 'success', error: 'danger', no_data: 'neutral' } },
  run: { labels: RUN_STATUS, tones: { running: 'new', completed: 'success', partial: 'warning', failed: 'danger' } },
  step: { labels: STEP_STATUS, tones: { completed: 'success', running: 'new', pending: 'neutral', failed: 'danger' } },
}

export default function StatusBadge({ kind = 'topic', status }) {
  const { labels, tones } = KINDS[kind]
  return (
    <span className={`badge ${tones[status] ?? 'neutral'}`}>
      <span className="badge-dot" />
      {label(labels, status)}
    </span>
  )
}
