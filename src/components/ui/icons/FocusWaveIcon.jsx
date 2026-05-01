export default function FocusWaveIcon() {
  return (
    <svg className="wave" viewBox="0 0 22 12" fill="none" aria-hidden="true">
      {[2, 6.5, 11, 15.5, 20].map((x) => (
        <rect
          key={x}
          className="bar"
          x={x - 1}
          y="1"
          width="2"
          height="10"
          rx="1"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
