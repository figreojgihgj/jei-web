# Circuit Puzzle 题目收录目录规范

## 目录结构

```text
public/
  circuit-puzzle-levels/
    index.json
    your-level.json
    your-level.md
```

## index.json 格式

```json
{
  "version": 1,
  "title": "Circuit Puzzle 题目收录",
  "basePath": "/circuit-puzzle-levels",
  "entries": [
    {
      "id": "your-level-id",
      "title": "你的题目名",
      "json": "your-level.json",
      "markdown": "your-level.md",
      "difficulty": "normal",
      "author": "your-name",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

`json` 为必填，`markdown` 为可选。
