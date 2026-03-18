### 介绍

ImageZoom 是一个功能强大的图片缩放库，支持移动端触摸操作和 PC 端鼠标操作。使用原生 JavaScript 实现，兼容所有 JS 框架。

预览地址: https://plingply.github.io/ScaleElement/

### 功能特性

- **移动端支持**
  - 单指拖动图片
  - 双指缩放（支持阻尼效果）
  - 双击缩放
  - 惯性滚动
  - 边界回弹

- **PC 端支持**
  - 鼠标拖动图片
  - 滚轮缩放
  - 双击缩放
  - 惯性滚动
  - 边界回弹

- **其他特性**
  - 自动计算初始缩放比例，确保图片完整显示
  - 缩放超出边界时有阻尼效果
  - 拖动超出边界时有阻力效果
  - 松开手指/鼠标后平滑回弹到边界
  - 以触摸点/鼠标位置为中心缩放

### 参数

```javascript
{
  minZoom: 1,           // 最小缩放比例，默认为 1（实际使用 initialScale）
  maxZoom: 3,           // 最大缩放比例，默认为 3
  doubleClickZoom: true,  // 是否启用双击缩放，默认为 true
}
```

### 使用方式

#### 基础使用

```javascript
import ImageZoom from './src/main.js';

const zoom = new ImageZoom("#zoomImage", {
  minZoom: 1,
  maxZoom: 4,
  doubleClickZoom: true,
});
```

#### HTML 结构

```html
<div class="container">
  <div id="zoomImage">
    <img src="your-image.jpg" alt="图片" />
  </div>
</div>
```

#### 方法调用

```javascript
// 重置缩放和位置到初始状态
zoom.reset();

// 销毁实例，移除所有事件监听器
zoom.destroy();
```

### 操作说明

#### 移动端

- **单指拖动**：按住图片拖动
- **双指缩放**：使用两个手指捏合或张开进行缩放
- **双击缩放**：双击图片在初始缩放和 2 倍初始缩放之间切换

#### PC 端

- **鼠标拖动**：按住鼠标左键拖动图片
- **滚轮缩放**：向上滚动放大，向下滚动缩小
- **双击缩放**：双击图片在初始缩放和 2 倍初始缩放之间切换

### 注意事项

1. 目标元素需要有父容器
2. 图片会自动居中并计算初始缩放比例
3. 缩放和拖动都支持超出边界，松开后会自动回弹
4. 快速拖动时有惯性滚动效果
5. 缩放超出边界时有阻尼效果，手感更自然
