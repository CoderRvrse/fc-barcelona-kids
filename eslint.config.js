export default [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        navigator: "readonly",
        location: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly"
      }
    },
    rules: {
      "no-cond-assign": ["error", "always"],
      "no-unsafe-optional-chaining": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "off",
      "no-unexpected-multiline": "error"
    }
  },
  {
    files: ["sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        clients: "readonly",
        importScripts: "readonly",
        skipWaiting: "readonly",
        addEventListener: "readonly"
      }
    }
  },
  {
    ignores: [
      "node_modules/",
      "dist/",
      "**/*.min.js"
    ]
  }
];