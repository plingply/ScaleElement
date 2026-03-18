import babel from "rollup-plugin-babel";
import { terser } from "rollup-plugin-terser";
export default {
  input: "src/main.js",
  output: {
    file: "elementZoom.min.js",
    name: "elementZoom",
    format: "umd",
  },
  plugins: [babel({ exclude: "node_modules/**" }), terser()],
};
