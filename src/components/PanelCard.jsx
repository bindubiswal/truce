import './PanelCard.css'

function PanelCard({ title, children }) {
  return (
    <section className="panel-card">
      {title && <h2 className="panel-card-title">{title}</h2>}
      {children}
    </section>
  )
}

export default PanelCard
