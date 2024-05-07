import babel from "rollup-plugin-babel";
import { terser } from "rollup-plugin-terser";
export default {
  input: "src/main.js",
  output: {
    file: "scale-element.min.js",
    name: "scaleElement",
    format: "umd",
  },
  plugins: [babel({ exclude: "node_modules/**" }), terser()],
};
