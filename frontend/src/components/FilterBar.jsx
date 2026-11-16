import { useEffect, useState } from 'react'
import { RANGES, SORTS } from '../labels'
import Icon from './Icon'

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
    <div className="filters">
      <label className="search-box">
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder="Tìm kiếm chủ đề hoặc từ khóa…"
          aria-label="Tìm kiếm chủ đề hoặc từ khóa"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text && (
          <button type="button" onClick={() => setText('')} aria-label="Xóa tìm kiếm">
            <Icon name="close" size={16} />
          </button>
        )}
      </label>

      <div className="filter-group range-group" role="group" aria-label="Khoảng thời gian">
        {Object.entries(RANGES).map(([code, name]) => (
          <button
            type="button"
            key={code}
            className={code === filters.range ? 'selected' : ''}
            aria-pressed={code === filters.range}
            onClick={() => onChange('range', code)}
          >
            {name}
          </button>
        ))}
      </div>

      <label className="select-wrap">
        <span className="sr-only">Nguồn báo</span>
        <select value={filters.source} onChange={(e) => onChange('source', e.target.value)}>
          <option value="">Tất cả nguồn</option>
          {sources.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="select-wrap sort">
        <span className="select-prefix">Sắp xếp:</span>
        <select aria-label="Sắp xếp" value={filters.sort} onChange={(e) => onChange('sort', e.target.value)}>
          {Object.entries(SORTS).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="reset-button" onClick={onReset} disabled={!canReset}>
        Xóa bộ lọc
      </button>
    </div>
  )
}
