import { useEffect, useState } from 'react'
import { RANGES, SORTS } from '../labels'

// Controls only report changes; the page owns the filter state (it lives in the URL).
export default function FilterBar({ filters, sources, onChange, onReset, canReset }) {
  // The search box keeps its own text while typing and reports it after a short pause.
  const [text, setText] = useState(filters.q)
  useEffect(() => setText(filters.q), [filters.q])
  useEffect(() => {
    if (text === filters.q) return
    const timer = setTimeout(() => onChange('q', text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="filters">
      <input
        type="search"
        className="search"
        placeholder="Tìm kiếm chủ đề hoặc từ khóa…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <select aria-label="Khoảng thời gian" value={filters.range} onChange={(e) => onChange('range', e.target.value)}>
        {Object.entries(RANGES).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      <select aria-label="Nguồn báo" value={filters.source} onChange={(e) => onChange('source', e.target.value)}>
        <option value="">Tất cả nguồn</option>
        {sources.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
      <select aria-label="Sắp xếp" value={filters.sort} onChange={(e) => onChange('sort', e.target.value)}>
        {Object.entries(SORTS).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      <button type="button" onClick={onReset} disabled={!canReset}>
        Xóa bộ lọc
      </button>
    </section>
  )
}
