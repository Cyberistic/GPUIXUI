// The recording page's Vite config: the scenes and the kit share the skill's
// own React 18 (the repo's React 19 never reaches the page).
import { fileURLToPath } from "node:url";
import react from "../../.media/stageshow/node_modules/@vitejs/plugin-react/dist/index.js";

const at = (path) => fileURLToPath(new URL(path, import.meta.url));
const modules = at("../../.media/stageshow/node_modules/");

export default {
  root: at("."),
  plugins: [react()],
  resolve: {
    alias: {
      react: `${modules}react`,
      "react-dom": `${modules}react-dom`,
      "lucide-react": `${modules}lucide-react`,
    },
  },
  server: { fs: { allow: [at("../../../..")] } },
};
