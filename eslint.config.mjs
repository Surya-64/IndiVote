import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        localStorage: "readonly",
        google: "readonly",
        IntersectionObserver: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        test: "readonly",
        __dirname: "readonly"
      }
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": "warn"
    }
  }
];
