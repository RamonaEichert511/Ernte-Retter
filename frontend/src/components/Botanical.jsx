export default function Botanical({ className = "" }) {
  return (
    <svg
      className={`botanical ${className}`}
      viewBox="0 0 140 300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M68 294C60 225 86 130 72 14M64 265 28 221M67 226l43-59M72 191 29 141M75 151l39-52M76 110 46 68M75 69l21-37" />
      {[
        [28, 221, -40],
        [41, 237, -40],
        [53, 251, -40],
        [110, 167, 36],
        [95, 187, 36],
        [82, 206, 36],
        [29, 141, -40],
        [44, 158, -40],
        [58, 174, -40],
        [114, 99, 36],
        [98, 121, 36],
        [86, 138, 36],
        [46, 68, -40],
        [61, 88, -40],
        [96, 32, 36],
        [83, 51, 36],
        [72, 18, 0],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d="M0 0C-14-9-13-23 0-31 13-23 14-9 0 0ZM0 0v-26" />
        </g>
      ))}
    </svg>
  );
}
