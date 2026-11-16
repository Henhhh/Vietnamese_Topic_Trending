import { formatDateTime } from '../labels'
import Icon from './Icon'

// Short logo text per source; unknown sources fall back to the first letters of the name.
const LOGO = { vnexpress: 'VnE', tuoitre: 'TT', thanhnien: 'TN', dantri: 'DT' }
const initials = (source) => LOGO[source.code] ?? source.name.slice(0, 2).toUpperCase()
const tone = (source) => (LOGO[source.code] ? `s-${source.code}` : 's-other')

// Links open in a new tab; the URL is the normalized RSS link. The excerpt can be empty (RSS item
// without a description), in which case it is left out.
// variant "featured" is the representative article; "list" is a row of the related articles.
export default function ArticleItem({ article, variant = 'list' }) {
  const link = (
    <a href={article.url} target="_blank" rel="noopener noreferrer">
      Đọc bài gốc <Icon name="external" size={14} />
    </a>
  )
  const time = <time dateTime={article.published_at}>{formatDateTime(article.published_at)}</time>

  if (variant === 'featured') {
    return (
      <article>
        <div className="article-meta">
          <span className={`source-logo ${tone(article.source)}`}>{initials(article.source)}</span>
          <strong>{article.source.name}</strong>
          <span>•</span>
          {time}
        </div>
        <h3>{article.title}</h3>
        {article.excerpt && (
          <>
            <div className="excerpt-label">TRÍCH ĐOẠN BÀI VIẾT</div>
            <p>{article.excerpt}</p>
          </>
        )}
        {link}
      </article>
    )
  }

  return (
    <article className="article-item">
      <div className={`article-thumb ${tone(article.source)}`} aria-hidden="true">
        {initials(article.source)}
      </div>
      <div className="article-copy">
        <div className="article-meta">
          <strong>{article.source.name}</strong>
          <span>•</span>
          {time}
        </div>
        <h3>{article.title}</h3>
        {article.excerpt && <p>{article.excerpt}</p>}
        {link}
      </div>
    </article>
  )
}
