export const colors = {
  felt: "#0B3D2E",
  feltDeep: "#072A20",
  feltEdge: "#0F5440",
  surface: "#10241D",
  surfaceRaised: "#17352B",
  border: "#1F5142",
  card: "#FAF7F0",
  cardEdge: "#D8D2C4",
  cardBack: "#123E5C",
  ink: "#F2F6F4",
  inkMuted: "#9DBBAF",
  inkDim: "#6D8C80",
  red: "#C3291F",
  black: "#1A1A1A",
  accent: "#E8B33D",
  accentInk: "#2A1D00",
  danger: "#E4573D",
  good: "#4FBF8B",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 30, fontWeight: "800" },
  heading: { fontSize: 20, fontWeight: "700" },
  body: { fontSize: 15, fontWeight: "500" },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
} as const;
