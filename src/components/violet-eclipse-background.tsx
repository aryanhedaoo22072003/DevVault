export function VioletEclipseBackground() {
  return (
    <div className="eclipse-scene" aria-hidden="true">
      <div className="eclipse-glow eclipse-glow-primary" />
      <div className="eclipse-glow eclipse-glow-gold" />
      <div className="eclipse-glow eclipse-glow-depth" />
      <div className="eclipse-grid" />
      <div className="eclipse-vignette" />
    </div>
  );
}
