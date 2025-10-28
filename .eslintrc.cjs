module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  },
  plugins: ['vue', '@typescript-eslint'],
  rules: {
    // Vue 规则
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-components': 'warn', // 检测未使用的组件
    'vue/no-unused-vars': 'warn', // 检测未使用的模板变量

    // TypeScript 规则
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_', // 忽略以 _ 开头的参数
        varsIgnorePattern: '^_', // 忽略以 _ 开头的变量
        caughtErrors: 'all', // 检测 catch 中未使用的错误
        ignoreRestSiblings: true // 忽略解构剩余参数
      }
    ],

    // JavaScript 规则
    'no-unused-vars': 'off', // 关闭 JS 规则，使用 TS 规则
    'no-console': [
      'warn',
      {
        // 警告 console，但允许 warn 和 error
        allow: ['warn', 'error', 'log']
      }
    ]
  }
}
