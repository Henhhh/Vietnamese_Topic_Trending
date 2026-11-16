import { formatDateTime } from '../labels'

// Links open in a new tab; the URL is the normalized RSS link.
export default function ArticleItem({ article }) {
  return (
    <article className="article">
      <div className="article-meta">
        {article.source.name} · {formatDateTime(article.published_at)}
      </div>
      <h3 className="article-title">{article.title}</h3>
      <p className="article-excerpt">{article.excerpt}</p>
      <a href={article.url} target="_blank" rel="noopener noreferrer">
        Đọc bài gốc ↗
      </a>
    </article>
  )
}
