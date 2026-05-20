import localFont from "next/font/local";

export const inter = localFont({
  src: [
    {
      path: "../../public/fonts/inter-variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const playfairDisplay = localFont({
  src: [
    {
      path: "../../public/fonts/playfair-display-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/playfair-display-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/playfair-display-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/playfair-display-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-playfair",
  display: "swap",
});
