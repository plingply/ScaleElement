### 介绍

此插件可以缩放移动 html 元素， js 实现，理论上兼容所有 js 框架
预览地址: https://plingply.github.io/ScaleElement/

### 参数

1. cssSelector

   css 合法选择器

2. options

```javascript
    parentWidth = document.body.clientWidth, // 父元素宽度
    parentHeight = document.body.clientHeight, // 父元素高度
    defaultScale = 1, // 默认缩放比例
    minScale = 0, // 最小缩放比例
    maxScale = 0, // 最大缩放比例
    limit = true, // 是否限制移动超出父级容器
    relateX = 0, // 横向移动比例
    relateY = 0, // 纵向移动比例
```

### 使用方式

此插件依赖 hammerjs，请先引入 hammerjs

```javascript
import scaleElement from "scale-element";
var scale = new scaleElement(".scale", {
  limit: true,
  // relateX: 0,
  // relateY: 0,
});
scale.init();
```
