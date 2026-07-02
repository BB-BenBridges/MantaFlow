import { createTheme, type MantineColorsTuple } from "@mantine/core";

const accent: MantineColorsTuple = [
  "#eef1fe",
  "#dbe0fb",
  "#b3bdf5",
  "#8998f0",
  "#6577eb",
  "#4f63e8",
  "#4257e6",
  "#3448cc",
  "#2c3fb7",
  "#2135a1",
];

export const theme = createTheme({
  fontFamily: "var(--font-hanken), system-ui, sans-serif",
  fontFamilyMonospace: "var(--font-jetbrains), monospace",
  primaryColor: "accent",
  colors: { accent },
  defaultRadius: "md",
  components: {
    Modal: {
      defaultProps: {
        radius: "lg",
        centered: true,
      },
    },
  },
});
