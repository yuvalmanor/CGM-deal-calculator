// Section cards for the deal page: a white card with an uppercase blue title,
// plus the ⓘ formula hint shown before every label that opens a formula modal.

/** ⓘ before a label that opens a formula. Drawn in SVG so the label's text is unchanged. */
export function InfoIcon() {
  return (
    <svg className="info-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.35" y="6.9" width="1.3" height="4.8" rx="0.65" fill="currentColor" />
      <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
    </svg>
  )
}

interface SectionCardProps {
  title: string
  /** Small caption beside the title (e.g. "Advanced Metrics" on the cards that hold its tiles). */
  caption?: string
  /** Half width on desktop — two such cards sit side by side. */
  half?: boolean
  children: React.ReactNode
}

export function SectionCard({ title, caption, half, children }: SectionCardProps) {
  return (
    <section className={`section-card${half ? ' section-card-half' : ''}`}>
      <header className="section-card-head">
        <h2 className="section-card-title">{title}</h2>
        {caption && <span className="section-card-caption">{caption}</span>}
      </header>
      {children}
    </section>
  )
}
