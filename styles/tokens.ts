// ── Primitive tokens ──────────────────────────────────────────────
// Raw values with no semantic meaning. Never reference directly in components.

export const primitive = {
  color: {
    gold100: "#fffbf0",
    gold200: "#f5e6c4",
    gold300: "#e5c587",
    gold400: "#c8aa6e",
    gold500: "#a68b4b",

    cyan100: "#ccfefe",
    cyan300: "#66fdfd",
    cyan500: "#00fbfb",

    purple300: "#e4b9ff",

    red400: "#f87171",
    green400: "#34d399",

    neutral0: "#ffffff",
    neutral50: "#f8fafc",
    neutral100: "#dbe3f2",
    neutral200: "#d0c5b5",
    neutral400: "#94a3b8",
    neutral600: "#475569",
    neutral700: "#323a45",
    neutral800: "#1e293b",
    neutral850: "#18202b",
    neutral900: "#0c141e",
    neutral950: "#070f19",
    neutral1000: "#000000",
  },

  font: {
    display: "'Space Grotesk', sans-serif",
    body: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  },

  fontSize: {
    xs: "9px",
    "2xs": "10px",
    sm: "11px",
    md: "14px",
    lg: "18px",
    xl: "24px",
    "2xl": "30px",
    "3xl": "36px",
    "4xl": "48px",
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },

  spacing: {
    "2xs": "4px",
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
    "3xl": "64px",
  },

  radius: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },

  breakpoint: {
    md: "768px",
    lg: "1024px",
  },
} as const;

// ── Semantic tokens ──────────────────────────────────────────────
// Map primitives to UI roles. Components reference these.

export const semantic = {
  color: {
    // Surfaces
    bgPrimary: primitive.color.neutral900,
    bgElevated: primitive.color.neutral950,
    bgCard: "rgba(12, 20, 30, 0.7)",
    bgHover: "rgba(229, 197, 135, 0.05)",
    bgInput: "rgba(7, 15, 25, 0.5)",

    // Text
    textPrimary: primitive.color.neutral100,
    textSecondary: primitive.color.neutral200,
    textMuted: "rgba(208, 197, 181, 0.6)",
    textDisabled: "rgba(208, 197, 181, 0.4)",

    // Accent
    accent: primitive.color.gold300,
    accentDark: primitive.color.gold400,
    accentHover: "rgba(229, 197, 135, 0.2)",

    // Feedback
    info: primitive.color.cyan500,
    infoMuted: "rgba(0, 251, 251, 0.3)",
    success: primitive.color.green400,
    danger: primitive.color.red400,
    highlight: primitive.color.purple300,

    // Borders
    borderSubtle: "rgba(229, 197, 135, 0.1)",
    borderDefault: "rgba(229, 197, 135, 0.2)",
    borderHover: "rgba(229, 197, 135, 0.4)",
    borderInfo: "rgba(0, 251, 251, 0.3)",
    borderDim: "rgba(255, 255, 255, 0.05)",

    // Chart-specific (used as raw Recharts prop values)
    chartGrid: "rgba(229, 197, 135, 0.07)",      // subtle grid lines
    chartHighlight: "rgba(229, 197, 135, 0.08)", // reference area fill
    chartStroke: "rgba(229, 197, 135, 0.25)",    // reference area stroke
  },

  shadow: {
    glassInset: "inset 0 0 20px rgba(229, 197, 135, 0.05)",
    glowGold: "0 0 15px rgba(229, 197, 135, 0.15)",
    glowCyan: "0 0 15px rgba(0, 251, 251, 0.15)",
    buttonGold: "0 10px 15px -3px rgba(229, 197, 135, 0.1)",
  },

  font: {
    display: primitive.font.display,
    body: primitive.font.body,
  },

  typography: {
    heading: {
      fontFamily: primitive.font.display,
      fontWeight: primitive.fontWeight.bold,
      letterSpacing: "-0.05em",
    },
    label: {
      fontFamily: primitive.font.display,
      fontSize: "12px",
      fontWeight: primitive.fontWeight.bold,
      letterSpacing: "0.05em",
      lineHeight: 1,
    },
    data: {
      fontFamily: primitive.font.display,
      fontSize: "14px",
      fontWeight: primitive.fontWeight.medium,
      letterSpacing: "0.02em",
      lineHeight: 1,
    },
    body: {
      fontFamily: primitive.font.body,
      fontWeight: primitive.fontWeight.regular,
    },
  },
} as const;

// ── Component tokens ─────────────────────────────────────────────
// Pre-composed values for specific UI patterns.

export const component = {
  sidebar: {
    width: "224px",
    collapsedWidth: "56px",
    bg: "rgba(7, 15, 25, 0.95)",
    borderColor: semantic.color.borderSubtle,
  },

  bottomNav: {
    height: "64px",
    bg: "rgba(7, 15, 25, 0.95)",
  },

  glassCard: {
    bg: semantic.color.bgCard,
    border: semantic.color.borderDefault,
    shadow: semantic.shadow.glassInset,
    radius: primitive.radius.lg,
    padding: primitive.spacing.lg,
    backdropBlur: "24px",
  },

  table: {
    headerBg: "rgba(7, 15, 25, 0.4)",
    rowHoverBg: semantic.color.bgHover,
    borderColor: "rgba(229, 197, 135, 0.05)",
  },

  input: {
    bg: semantic.color.bgInput,
    borderColor: semantic.color.borderDefault,
    focusBorderColor: semantic.color.info,
  },

  progressBar: {
    trackBg: primitive.color.neutral950,
    height: "4px",
  },
} as const;
