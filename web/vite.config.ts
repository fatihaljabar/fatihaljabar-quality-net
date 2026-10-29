import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ command }) => ({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    // A dependency reads the whole `import.meta.env` object, and the bundler then copies every VITE_ variable into the
    // public files. The development token is meant for `npm run dev` only, so a build never receives it (spec 011).
    define: command === "build" ? { "import.meta.env.VITE_DEV_TOKEN": "undefined" } : {},
    test: {
        environment: "jsdom",
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    "vendor-react": ["react", "react-dom", "react-router-dom"],
                    "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs", "@radix-ui/react-alert-dialog", "@radix-ui/react-dropdown-menu"],
                    "vendor-misc": ["axios", "jotai", "lucide-react", "react-hook-form"],
                },
            },
        },
    },
}));
