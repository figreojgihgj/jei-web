# Wiki 渲染器

一个支持块编辑器格式的 Wiki 文档渲染器，用于渲染类似 Notion 风格的块式文档。

## 功能特性

### 支持的块类型

1. **文本块 (Text Block)**
   - 支持多级标题 (heading1-heading6)
   - 支持正文 (body)
   - 支持文本对齐 (left, center, right)
   - 支持富文本样式：加粗、斜体、下划线、删除线、代码
   - 支持颜色系统

2. **表格块 (Table Block)**
   - 支持单元格合并 (rowSpan, colSpan)
   - 支持列宽度设置
   - 支持单元格样式 (背景色、边框色)
   - 支持嵌套内容

3. **列表块 (List Block)**
   - 无序列表 (unordered)
   - 有序列表 (ordered)
   - 支持嵌套列表项

4. **图片块 (Image Block)**
   - 支持图片显示
   - 支持图片描述
   - 支持自定义宽度

5. **引用块 (Quote Block)**
   - 支持引用样式
   - 支持嵌套内容

6. **分隔线 (Horizontal Line)**
   - 支持多种粗细样式 (kind: 1, 2, 3, 5)

### 内联元素

1. **文本内联 (Text Inline)**
   - 支持文本样式：bold, italic, underline, strikethrough, code
   - 支持颜色系统

2. **条目引用 (Entry Inline)**
   - 支持跨条目引用
   - 支持多种显示类型：link-imgText, card-big
   - 支持显示数量

## 使用方法

1. 访问 `/wiki-renderer` 页面
2. 点击"选择 Wiki JSON 文件"上传 JSON 文件
3. 查看渲染结果

## 数据格式

### 基本结构

```json
{
  "code": 0,
  "message": "OK",
  "timestamp": "1770138265",
  "data": {
    "item": {
      "itemId": "7",
      "document": {
        "documentMap": {
          "document-id": {
            "id": "document-id",
            "blockIds": ["block1", "block2"],
            "blockMap": {
              "block1": {
                /* Block 对象 */
              }
            }
          }
        }
      }
    }
  }
}
```

### Text Block 示例

```json
{
  "id": "RYvgdb",
  "parentId": "document-id",
  "align": "left",
  "kind": "text",
  "text": {
    "inlineElements": [
      {
        "kind": "text",
        "text": { "text": "这是一段文本" },
        "bold": true,
        "color": "light_text_primary"
      }
    ],
    "kind": "body"
  }
}
```

### Table Block 示例

```json
{
  "id": "lW2ce0",
  "parentId": "document-id",
  "kind": "table",
  "table": {
    "rowIds": ["row1", "row2"],
    "columnIds": ["col1", "col2"],
    "cellMap": {
      "row1_col1": {
        "id": "row1_col1",
        "childIds": ["text1"],
        "rowSpan": "1",
        "colSpan": "1"
      }
    }
  }
}
```

## 颜色系统

支持的预定义颜色：

- `light_text_primary`: 主要文本色 (#1f1f1f)
- `light_text_secondary`: 次要文本色 (#5f5f5f)
- `light_text_tertiary`: 三级文本色 (#8f8f8f)
- `light_text_quaternary`: 四级文本色 (#afafaf)
- `light_function_blue`: 功能蓝色 (#1976d2)
- `light_function_blueness`: 蓝色系 (#2196f3)
- `light_rank_blue`: 等级蓝色 (#42a5f5)
- `light_rank_yellow`: 等级黄色 (#ffa726)
- `light_rank_gray`: 等级灰色 (#9e9e9e)

## 技术栈

- Vue 3 + TypeScript
- Quasar Framework
- 组件化架构
- 类型安全

## 组件结构

```
WikiRendererPage.vue          # 主页面
├── WikiDocument.vue           # 文档容器
    └── WikiBlock.vue          # 块分发器
        ├── TextBlock.vue      # 文本块
        │   └── WikiInlineElement.vue
        │       ├── TextInline.vue
        │       └── EntryInline.vue
        ├── TableBlock.vue     # 表格块
        ├── ListBlock.vue      # 列表块
        ├── ImageBlock.vue     # 图片块
        ├── QuoteBlock.vue     # 引用块
        ├── HorizontalLineBlock.vue  # 分隔线
        └── UnknownBlock.vue   # 未知块类型
```

## 扩展性

系统设计为高度可扩展：

1. **新增块类型**：在 `WikiBlock.vue` 中添加新的 case，创建对应的组件
2. **新增内联元素**：在 `WikiInlineElement.vue` 中添加新的类型处理
3. **样式定制**：修改各个块组件的样式文件

## 测试文件

项目中包含了测试数据在 `temp/info/` 目录下：

- `id7.json` - 复杂的角色信息页面
- `id112.json` - 武器数据页面
- `id752.json` - 物品信息页面
- 等等...

可以使用这些文件来测试渲染器的各种功能。
