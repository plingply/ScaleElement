/**
 * ElementZoom - 元素放大缩小库（修复版） 
 */
class ElementZoom {
  constructor(target, options = {}) {
    this.target =
      typeof target === "string" ? document.querySelector(target) : target;

    this.container = this.target.parentElement;

    this.options = {
      minZoom: 1,
      maxZoom: 3,
      doubleClickZoom: true,
      ...options,
    };

    // 状态
    this.state = {
      scale: 1,
      translateX: 0,
      translateY: 0,
      isMoving: false,
      isZooming: false,
      imageWidth: 0,
      imageHeight: 0,
      containerWidth: 0,
      containerHeight: 0,
      initialScale: 1, // 添加初始缩放比例
    };

    // 触摸记录
    this.touch = {
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startTranslateX: 0,
      startTranslateY: 0,
      startScale: 1,
      startDistance: 0,
      lastCenter: null,
      startTime: 0,
      fingerNum: 0,
      moved: false,
      wasZooming: false, // 记录是否曾经进入过缩放模式
      velocityX: 0, // X轴速度
      velocityY: 0, // Y轴速度
      lastMoveTime: 0, // 上次移动时间
      lastMoveX: 0, // 上次移动的X位置
      lastMoveY: 0, // 上次移动的Y位置
    };

    this.inertiaAnimationId = null;
    this.doubleTapTimer = null;
    this.init();
  }

  init() {
    this.target.style.transformOrigin = "0 0";
    this.target.style.transition = "transform 0.3s";
    this.target.style.cursor = "grab";
    this.target.style.userSelect = "none";
    this.target.style.willChange = "transform";

    // 等待图片加载完成
    const img = this.target.querySelector("img");
    if (img) {
      if (img.complete) {
        this.target.style.width = img.width + 'px';
        this.target.style.height = img.height + 'px';
        this.updateImageSize();
        this.centerImage();
      } else {
        img.addEventListener("load", () => {
          this.target.style.width = img.width + 'px';
          this.target.style.height = img.height + 'px';
          this.updateImageSize();
          this.centerImage();
        });
      }
    } else {
      if (this.target.tagName === "IMG") {
        if (this.target.complete) {
          this.updateImageSize();
          this.centerImage();
        } else {
          this.target.addEventListener("load", () => {
            this.updateImageSize();
            this.centerImage();
          });
        }
      } else {
        this.updateImageSize();
        this.centerImage();
      }
    }

    this.bindEvents();
  }

  updateImageSize() {
    const rect = this.target.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    this.state.imageWidth = rect.width;
    this.state.imageHeight = rect.height;
    this.state.containerWidth = containerRect.width;
    this.state.containerHeight = containerRect.height;
  }

  /**
   * 计算初始缩放比例，使图片最大边能完整显示
   */
  calculateInitialScale() {
    const { imageWidth, imageHeight, containerWidth, containerHeight } = this.state;
    
    // 计算宽高各自的缩放比例
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    
    // 取较小的比例，确保图片完整显示
    // 但这里我们需要的是最大边完整显示，所以取较小的比例
    // 这样图片会被缩放以适应容器，最大边自然就能完整显示
    return Math.min(scaleX, scaleY);
  }

  /**
   * 初始化图片居中，并确保最大边完整显示
   */
  centerImage() {
    const { imageWidth, imageHeight, containerWidth, containerHeight } = this.state;

    // 计算初始缩放比例
    const initialScale = this.calculateInitialScale();
    
    // 设置初始缩放
    this.state.scale = initialScale;
    this.state.initialScale = initialScale;

    // 计算缩放后的尺寸
    const scaledWidth = imageWidth * initialScale;
    const scaledHeight = imageHeight * initialScale;

    // 计算居中的偏移量
    this.state.translateX = (containerWidth - scaledWidth) / 2;
    this.state.translateY = (containerHeight - scaledHeight) / 2;

    this.updateTransform();
  }

  bindEvents() {
    this.target.addEventListener("touchstart", this.onTouchStart.bind(this), {
      passive: false,
    });
    this.target.addEventListener("touchmove", this.onTouchMove.bind(this), {
      passive: false,
    });
    this.target.addEventListener("touchend", this.onTouchEnd.bind(this));
    this.target.addEventListener("touchcancel", this.onTouchEnd.bind(this));

    // 鼠标事件
    this.target.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.target.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.target.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.target.addEventListener("mouseleave", this.onMouseUp.bind(this));
    this.target.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
    this.target.addEventListener("dblclick", this.onDoubleClick.bind(this));

    // 窗口大小改变时重新计算并居中
    window.addEventListener("resize", () => {
      this.updateImageSize();
      this.centerImage(); // 改为调用centerImage，重新计算缩放
    });
  }

  getDistance(touches) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  }

  getCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 获取移动边界
   */
  getBoundaries() {
    const { scale, imageWidth, imageHeight, containerWidth, containerHeight } =
      this.state;

    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;

    let minX = 0,
      maxX = 0,
      minY = 0,
      maxY = 0;

    if (scaledWidth > containerWidth) {
      // 向左移动的最大距离（不能超过右侧边界）
      minX = containerWidth - scaledWidth;
      // 向右移动的最大距离（不能超过左侧边界）
      maxX = 0;
    } else {
      // 如果图片小于容器，居中显示
      minX = maxX = (containerWidth - scaledWidth) / 2;
    }

    if (scaledHeight > containerHeight) {
      // 向上移动的最大距离（不能超过下侧边界）
      minY = containerHeight - scaledHeight;
      // 向下移动的最大距离（不能超过上侧边界）
      maxY = 0;
    } else {
      // 如果图片小于容器，居中显示
      minY = maxY = (containerHeight - scaledHeight) / 2;
    }

    return { minX, maxX, minY, maxY };
  }

  /**
   * 限制位置在边界内
   */
  clampPosition() {
    const { minX, maxX, minY, maxY } = this.getBoundaries();

    this.state.translateX = this.clamp(this.state.translateX, minX, maxX);
    this.state.translateY = this.clamp(this.state.translateY, minY, maxY);
  }

  /**
   * 更新变换
   */
  updateTransform(animate = false) {
    const { scale, translateX, translateY } = this.state;

    if (!animate) {
      this.target.style.transition = "none";
    } else {
      this.target.style.transition = "transform 0.3s";
    }

    this.target.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  /**
   * 设置缩放
   * @param {number} newScale - 新的缩放比例
   * @param {object} center - 缩放中心点
   * @param {boolean} animate - 是否动画过渡
   * @param {boolean} allowExceed - 是否允许超出边界，默认false
   */
  setScale(newScale, center = null, animate = false, allowExceed = false) {
    const { minZoom, maxZoom } = this.options;
    const min = this.state.initialScale;

    if (!allowExceed) {
      newScale = this.clamp(newScale, min, maxZoom);
    }

    if (newScale === this.state.scale) return;

    const oldScale = this.state.scale;
    const scaleRatio = newScale / oldScale;

    if (center) {
      const { imageWidth, imageHeight, translateX, translateY } = this.state;
      const containerRect = this.container.getBoundingClientRect();
      
      // 计算当前缩放后的实际尺寸
      const currentWidth = imageWidth * oldScale;
      const currentHeight = imageHeight * oldScale;

      // 计算触摸点相对于容器左上角的坐标
      const relativeCenterX = center.x - containerRect.left;
      const relativeCenterY = center.y - containerRect.top;

      // 计算触摸点相对于图片左上角的偏移
      const offsetX = relativeCenterX - translateX;
      const offsetY = relativeCenterY - translateY;

      // 计算触摸点在图片上的相对位置（0-1之间）
      const relativeX = offsetX / currentWidth;
      const relativeY = offsetY / currentHeight;

      // 根据缩放比例调整位移，保持触摸点位置不变
      // 新的位移 = 旧位移 - (旧尺寸 * 缩放增量 * 相对位置)
      const newTranslateX = translateX - currentWidth * (scaleRatio - 1) * relativeX;
      const newTranslateY = translateY - currentHeight * (scaleRatio - 1) * relativeY;

      this.state.scale = newScale;
      this.state.translateX = newTranslateX;
      this.state.translateY = newTranslateY;
    } else {
      this.state.scale = newScale;
    }

    // 如果是动画模式，限制位置边界
    if (animate) {
      this.clampPosition();
    }
    this.updateTransform(animate);
  }

  reset() {
    this.centerImage(); // 使用centerImage重置到初始状态
    this.updateTransform(true);
  }

  onTouchStart(e) {
    e.preventDefault();

    const touches = e.touches;
    this.touch.fingerNum = touches.length;
    this.touch.startTime = Date.now();
    this.touch.moved = false;

    // 记录起始位置
    this.touch.startX = touches[0].clientX;
    this.touch.startY = touches[0].clientY;
    this.touch.lastX = this.touch.startX;
    this.touch.lastY = this.touch.startY;

    this.touch.startTranslateX = this.state.translateX;
    this.touch.startTranslateY = this.state.translateY;
    this.touch.startScale = this.state.scale;

    // 初始化速度和时间记录
    this.touch.velocityX = 0;
    this.touch.velocityY = 0;
    this.touch.lastMoveTime = Date.now();
    this.touch.lastMoveX = touches[0].clientX;
    this.touch.lastMoveY = touches[0].clientY;

    // 单指：允许移动（除非曾经进入过缩放模式）
    if (this.touch.fingerNum === 1 && !this.touch.wasZooming) {
      this.state.isMoving = true;
      this.touch.lastCenter = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
    }

    // 双指：缩放
    if (this.touch.fingerNum === 2) {
      this.state.isZooming = true;
      this.touch.wasZooming = true;
      this.touch.startDistance = this.getDistance(touches);
      this.touch.lastCenter = this.getCenter(touches);
    }
  }

  onTouchMove(e) {
    e.preventDefault();

    const touches = e.touches;

    // 单指移动
    if (this.state.isMoving && touches.length === 1) {
      this.touch.moved = true;

      const deltaX = touches[0].clientX - this.touch.startX;
      const deltaY = touches[0].clientY - this.touch.startY;

      this.state.translateX = this.touch.startTranslateX + deltaX;
      this.state.translateY = this.touch.startTranslateY + deltaY;

      this.touch.lastCenter = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };

      // 计算速度
      const currentTime = Date.now();
      const timeDiff = currentTime - this.touch.lastMoveTime;
      
      if (timeDiff > 0) {
        this.touch.velocityX = (touches[0].clientX - this.touch.lastMoveX) / timeDiff;
        this.touch.velocityY = (touches[0].clientY - this.touch.lastMoveY) / timeDiff;
      }
      
      this.touch.lastMoveTime = currentTime;
      this.touch.lastMoveX = touches[0].clientX;
      this.touch.lastMoveY = touches[0].clientY;

      this.updateTransform();
    }

    // 双指缩放
    if (this.state.isZooming && touches.length === 2) {
      this.touch.moved = true;

      const currentDistance = this.getDistance(touches);
      const currentCenter = this.getCenter(touches);

      // 计算理论上的缩放比例
      const rawScale =
        (this.touch.startScale * currentDistance) / this.touch.startDistance;

      // 应用阻尼效果
      const { maxZoom } = this.options;
      const min = this.state.initialScale;
      let newScale = rawScale;

      // 超出最大值时的阻尼
      if (rawScale > maxZoom) {
        const exceed = rawScale - maxZoom;
        const damping = 0.2;
        newScale = maxZoom + exceed * damping;
      }

      // 超出最小值时的阻尼
      if (rawScale < min) {
        const exceed = min - rawScale;
        const damping = 0.2;
        newScale = min - exceed * damping;
      }

      // 使用当前中心点进行缩放，允许超出边界
      this.setScale(newScale, currentCenter, false, true);

      this.touch.lastCenter = currentCenter;
    }
  }

  /**
   * 惯性滚动动画
   */
  startInertia() {
    // 如果速度太小，不启动惯性
    const speed = Math.hypot(this.touch.velocityX, this.touch.velocityY);
    if (speed < 0.1) {
      this.snapToBounds();
      return;
    }

    const friction = 0.9; // 摩擦系数
    let velocityX = this.touch.velocityX * 6; // 转换为每帧的像素
    let velocityY = this.touch.velocityY * 6;

    const animate = () => {
      // 获取边界
      const { minX, maxX, minY, maxY } = this.getBoundaries();

      // 检查是否超出边界
      let extraFriction = 1;
      const exceedThreshold = 50; // 超出多少像素开始增加阻力

      if (this.state.translateX < minX) {
        const exceed = minX - this.state.translateX;
        if (exceed > exceedThreshold) {
          extraFriction *= 0.85;
        } else {
          extraFriction *= 0.95;
        }
      } else if (this.state.translateX > maxX) {
        const exceed = this.state.translateX - maxX;
        if (exceed > exceedThreshold) {
          extraFriction *= 0.85;
        } else {
          extraFriction *= 0.95;
        }
      }

      if (this.state.translateY < minY) {
        const exceed = minY - this.state.translateY;
        if (exceed > exceedThreshold) {
          extraFriction *= 0.85;
        } else {
          extraFriction *= 0.95;
        }
      } else if (this.state.translateY > maxY) {
        const exceed = this.state.translateY - maxY;
        if (exceed > exceedThreshold) {
          extraFriction *= 0.85;
        } else {
          extraFriction *= 0.95;
        }
      }

      // 应用速度
      this.state.translateX += velocityX;
      this.state.translateY += velocityY;

      // 应用摩擦力（包括额外的边界阻力）
      velocityX *= friction * extraFriction;
      velocityY *= friction * extraFriction;

      // 检查是否应该停止
      const currentSpeed = Math.hypot(velocityX, velocityY);
      if (currentSpeed < 0.1) {
        this.inertiaAnimationId = null;
        this.snapToBounds();
        return;
      }

      this.updateTransform();
      this.inertiaAnimationId = requestAnimationFrame(animate);
    };

    this.inertiaAnimationId = requestAnimationFrame(animate);
  }

  /**
   * 回弹到边界
   */
  snapToBounds() {
    const { maxZoom } = this.options;
    const min = this.state.initialScale;
    const currentScale = this.state.scale;
    
    // 先处理缩放回弹
    if (currentScale < min || currentScale > maxZoom) {
      const targetScale = this.clamp(currentScale, min, maxZoom);
      this.setScale(targetScale, this.touch.lastCenter, true);
    } else {
      // 只需要限制位置
      this.clampPosition();
      this.updateTransform(true);
    }
  }

  onTouchEnd(e) {
    if (!e.touches.length) {
      // 检查是否是双击
      const timeDiff = Date.now() - this.touch.startTime;

      if (this.touch.fingerNum === 1 && !this.touch.moved && timeDiff < 300) {
        if (this.doubleTapTimer) {
          // 双击
          clearTimeout(this.doubleTapTimer);
          this.doubleTapTimer = null;

          if (this.options.doubleClickZoom) {
            const newScale = this.state.scale > this.state.initialScale ? 
              this.state.initialScale : 
              this.state.initialScale * 2;
            this.setScale(
              newScale,
              {
                x: this.touch.startX,
                y: this.touch.startY,
              },
              true
            );
          }
        } else {
          // 单击
          this.doubleTapTimer = setTimeout(() => {
            this.doubleTapTimer = null;
          }, 300);
        }
      }

      // 重置状态
      this.state.isMoving = false;
      this.state.isZooming = false;
      this.touch.wasZooming = false;

      // 如果有惯性动画，先取消
      if (this.inertiaAnimationId) {
        cancelAnimationFrame(this.inertiaAnimationId);
        this.inertiaAnimationId = null;
      }

      // 启动惯性滚动
      if (this.touch.moved && this.touch.fingerNum === 1) {
        this.startInertia();
      } else {
        // 没有拖动，直接回弹
        this.snapToBounds();
      }
    } else {
      // 还有手指在屏幕上，更新手指数量
      this.touch.fingerNum = e.touches.length;
      
      // 如果曾经进入过缩放模式，松开一个手指后不允许拖动
      if (this.touch.wasZooming) {
        this.state.isMoving = false;
        this.state.isZooming = false;
      }
    }
  }

  /**
   * 鼠标按下
   */
  onMouseDown(e) {
    e.preventDefault();

    this.touch.fingerNum = 1;
    this.touch.startTime = Date.now();
    this.touch.moved = false;

    this.touch.startX = e.clientX;
    this.touch.startY = e.clientY;
    this.touch.lastX = e.clientX;
    this.touch.lastY = e.clientY;

    this.touch.startTranslateX = this.state.translateX;
    this.touch.startTranslateY = this.state.translateY;
    this.touch.startScale = this.state.scale;

    this.touch.velocityX = 0;
    this.touch.velocityY = 0;
    this.touch.lastMoveTime = Date.now();
    this.touch.lastMoveX = e.clientX;
    this.touch.lastMoveY = e.clientY;

    this.state.isMoving = true;
    this.touch.lastCenter = {
      x: e.clientX,
      y: e.clientY,
    };
  }

  /**
   * 鼠标移动
   */
  onMouseMove(e) {
    e.preventDefault();

    if (this.state.isMoving) {
      this.touch.moved = true;

      const deltaX = e.clientX - this.touch.startX;
      const deltaY = e.clientY - this.touch.startY;

      this.state.translateX = this.touch.startTranslateX + deltaX;
      this.state.translateY = this.touch.startTranslateY + deltaY;

      this.touch.lastCenter = {
        x: e.clientX,
        y: e.clientY,
      };

      const currentTime = Date.now();
      const timeDiff = currentTime - this.touch.lastMoveTime;
      
      if (timeDiff > 0) {
        this.touch.velocityX = (e.clientX - this.touch.lastMoveX) / timeDiff;
        this.touch.velocityY = (e.clientY - this.touch.lastMoveY) / timeDiff;
      }
      
      this.touch.lastMoveTime = currentTime;
      this.touch.lastMoveX = e.clientX;
      this.touch.lastMoveY = e.clientY;

      this.updateTransform();
    }
  }

  /**
   * 鼠标松开
   */
  onMouseUp(e) {
    this.state.isMoving = false;

    if (this.inertiaAnimationId) {
      cancelAnimationFrame(this.inertiaAnimationId);
      this.inertiaAnimationId = null;
    }

    if (this.touch.moved) {
      this.startInertia();
    } else {
      this.snapToBounds();
    }
  }

  /**
   * 鼠标滚轮缩放
   */
  onWheel(e) {
    e.preventDefault();

    const { maxZoom } = this.options;
    const min = this.state.initialScale;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    let newScale = this.state.scale * (1 + delta);

    newScale = this.clamp(newScale, min, maxZoom);

    const center = {
      x: e.clientX,
      y: e.clientY,
    };

    this.touch.lastCenter = {
      x: e.clientX,
      y: e.clientY,
    };

    this.setScale(newScale, center, true);
  }

  /**
   * 鼠标双击
   */
  onDoubleClick(e) {
    if (this.options.doubleClickZoom) {
      const newScale = this.state.scale > this.state.initialScale ? 
        this.state.initialScale : 
        this.state.initialScale * 2;
      this.setScale(
        newScale,
        {
          x: e.clientX,
          y: e.clientY,
        },
        true
      );
    }
  }

  destroy() {
    if (this.inertiaAnimationId) {
      cancelAnimationFrame(this.inertiaAnimationId);
      this.inertiaAnimationId = null;
    }
    this.target.removeEventListener("touchstart", this.onTouchStart);
    this.target.removeEventListener("touchmove", this.onTouchMove);
    this.target.removeEventListener("touchend", this.onTouchEnd);
    this.target.removeEventListener("touchcancel", this.onTouchEnd);
    this.target.removeEventListener("mousedown", this.onMouseDown);
    this.target.removeEventListener("mousemove", this.onMouseMove);
    this.target.removeEventListener("mouseup", this.onMouseUp);
    this.target.removeEventListener("mouseleave", this.onMouseUp);
    this.target.removeEventListener("wheel", this.onWheel);
    this.target.removeEventListener("dblclick", this.onDoubleClick);
    window.removeEventListener("resize", this.updateImageSize);
  }
}

export default ElementZoom;