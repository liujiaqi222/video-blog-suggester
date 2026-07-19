<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 注释规范

- 代码注释使用中文，优先说明意图、业务约束、边界条件和设计取舍，不重复代码本身已经表达的信息。
- 对包含多个阶段的工作流、数据处理或较长函数，使用 `// ── 步骤 N：说明 ──` 形式标明关键阶段；子步骤使用 `N.1`、`N.2`。
- 注释应简洁、准确，并在修改相关逻辑时同步更新；过时或与实现不符的注释应删除或修正。
