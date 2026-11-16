// Page heading with an optional small line above it (the status page uses it).
export default function PageIntro({ eyebrow, title, subtitle }) {
  return (
    <div className="page-intro">
      {eyebrow && <div className="breadcrumb">{eyebrow}</div>}
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}
