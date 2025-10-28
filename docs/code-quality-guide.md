# 代码质量检查指南

## 🔍 代码检查配置

本项目已配置完善的代码检查工具，帮助您保持代码质量和一致性。

## 工具配置

### 1. ESLint（代码规范检查）

**配置文件：** `.eslintrc.cjs`

**检查规则：**
- ✅ 未使用的变量
- ✅ 未使用的导入
- ✅ 未使用的组件
- ✅ 未使用的模板变量
- ✅ catch 中未使用的错误对象
- ⚠️ console 语句（允许 log/warn/error）
- ⚠️ any 类型（警告）

### 2. TypeScript（类型检查）

**配置文件：** `tsconfig.json`

**检查项：**
- ✅ 类型错误
- ✅ 类型推断
- ✅ 严格模式

### 3. Prettier（代码格式化）

**配置文件：** `.prettierrc`

**格式化规则：**
- 单引号
- 无分号
- 2 空格缩进
- 尾随逗号

## 📋 使用方法

### 运行检查

```bash
# 检查所有文件
npm run lint

# 自动修复问题
npm run lint -- --fix

# 检查特定文件
npm run lint src/views/dashboard/index.vue

# 类型检查
npm run type-check

# 格式化代码
npm run format
```

### VS Code 集成

项目已配置 `.vscode/settings.json`，VS Code 将：
1. **保存时自动修复** ESLint 问题
2. **保存时自动格式化** 代码（Prettier）
3. **实时显示** 代码问题

**推荐安装的 VS Code 插件：**
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Volar (Vue.volar)

### Cursor 集成

在 Cursor 中，代码检查会：
1. 实时显示问题（波浪线）
2. 鼠标悬停显示详细信息
3. 提供快速修复建议

## 🚨 常见未使用代码检测

### 1. 未使用的导入

```typescript
// ❌ 错误 - 导入了但未使用
import { ref, computed } from 'vue'

const count = ref(0)
// computed 未使用！

// ✅ 正确 - 移除未使用的导入
import { ref } from 'vue'

const count = ref(0)
```

### 2. 未使用的变量

```typescript
// ❌ 错误 - 定义了但未使用
const handleClick = () => {
  const data = fetchData()
  const result = processData(data)
  // result 未使用！
}

// ✅ 正确 - 移除或使用
const handleClick = () => {
  const data = fetchData()
  const result = processData(data)
  console.log(result)  // 使用它
}
```

### 3. 未使用的组件

```vue
<script setup lang="ts">
// ❌ 错误 - 导入了但未在模板中使用
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
</script>

<template>
  <div>
    <Button>点击</Button>
    <!-- Card 组件未使用！-->
  </div>
</template>
```

### 4. 未使用的参数

```typescript
// ❌ 错误 - 参数未使用
function processData(data: any, options: any) {
  return data.map(item => item.value)
  // options 参数未使用！
}

// ✅ 正确 - 使用下划线前缀忽略警告
function processData(data: any, _options: any) {
  return data.map(item => item.value)
}
```

### 5. catch 中未使用的错误

```typescript
// ❌ 错误 - catch 中的 error 未使用
try {
  await doSomething()
} catch (error) {
  // error 未使用！
  toast({ title: '操作失败' })
}

// ✅ 正确 - 使用错误信息
try {
  await doSomething()
} catch (error: any) {
  toast({ 
    title: '操作失败',
    description: error.message 
  })
}

// ✅ 正确 - 如果确实不需要，使用下划线
try {
  await doSomething()
} catch (_error) {
  toast({ title: '操作失败' })
}
```

## 📊 检查结果示例

运行 `npm run lint` 后：

```bash
✖ 3 problems (0 errors, 3 warnings)

/src/views/dashboard/index.vue
  5:10  warning  'computed' is defined but never used  @typescript-eslint/no-unused-vars
  
/src/components/ServerCard.vue
  12:7  warning  'processData' is defined but never used  @typescript-eslint/no-unused-vars
  15:9  warning  'result' is assigned a value but never used  @typescript-eslint/no-unused-vars
```

## 🔧 自动修复

很多问题可以自动修复：

```bash
# 自动移除未使用的导入
npm run lint -- --fix

# 检查是否还有问题
npm run lint
```

## 📝 最佳实践

### 1. 编码时
- ✅ 使用 VS Code/Cursor 的实时检查
- ✅ 看到波浪线立即修复
- ✅ 保存时自动格式化

### 2. 提交前
```bash
# 运行所有检查
npm run lint
npm run type-check

# 如果有错误，修复后再提交
npm run lint -- --fix
```

### 3. CI/CD
项目可以配置 GitHub Actions 在 PR 时自动运行检查：

```yaml
name: Code Quality
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
```

## 🎯 目标

通过这些工具，我们希望：
1. ✅ 减少未使用的代码（提高可读性）
2. ✅ 保持代码风格一致
3. ✅ 及早发现潜在问题
4. ✅ 提高代码质量

## 💡 忽略规则

某些情况下需要忽略规则：

```typescript
// 忽略下一行
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const unusedVar = 'value'

// 忽略整个文件
/* eslint-disable @typescript-eslint/no-unused-vars */

// 忽略块
/* eslint-disable */
const a = 1
const b = 2
/* eslint-enable */
```

**注意：** 请谨慎使用 eslint-disable，尽量修复问题而不是忽略。

## 📚 参考文档

- [ESLint 规则](https://eslint.org/docs/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/rules/)
- [Vue ESLint Plugin](https://eslint.vuejs.org/)
- [Prettier](https://prettier.io/docs/en/options.html)

