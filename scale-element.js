(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('hammerjs')) :
  typeof define === 'function' && define.amd ? define(['hammerjs'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.scaleElement = factory(global.Hammer));
})(this, (function (Hammer) { 'use strict';

  class ScaleElement {
    constructor(cssSelector, options) {
      const {
        parentWidth = document.body.clientWidth,
        parentHeight = document.body.clientHeight,
        defaultScale = 1,
        minScale = 0,
        maxScale = 0,
        limit = true,
        relateX = 0,
        relateY = 0
      } = options;
      if (!cssSelector) {
        throw new Error("cssSelector is required");
      }
      if (parentWidth <= 0 || parentHeight <= 0) {
        throw new Error("parentWidth parentHeight 必须大于0，如果不传则取 document.body.clientWidth document.body.clientHeight");
      }
      if (minScale < 0 || maxScale < 0) {
        throw new Error("minScale and maxScale must be greater than 0");
      }
      if (minScale > maxScale) {
        throw new Error("minScale must be less than maxScale");
      }
      if (minScale > 0 && maxScale > 0 && (defaultScale < minScale || defaultScale > maxScale)) {
        throw new Error("defaultScale must be between minScale and maxScale");
      }
      this._element = document.querySelector(cssSelector);
      if (!this._element) {
        throw new Error("Element not found");
      }
      this.mc = new Hammer.Manager(this._element);
      this.timer = false;
      this.translateX = 0;
      this.translateY = 0;
      this.scale = defaultScale;
      this.minScale = minScale;
      this.maxScale = maxScale;
      this.firstTouch = true; //用户第一次触摸
      this._relateX = relateX;
      this._relateY = relateY;
      this.parentWidth = parentWidth;
      this.parentHeight = parentHeight;
      this._oldX = 0;
      this._oldY = 0;
      this._oldScale = 1;
      this._position = null;
      this._limit = limit;
    }
    animate() {
      return window[Hammer.prefixed(window, "requestAnimationFrame")] || function (callback) {
        setTimeout(callback, 1000 / 60);
      };
    }
    _setPosition() {
      if (!this._element) return;
      this._selfPosition({
        translateX: this._relateX,
        translateY: this._relateY,
        scale: this.scale
      });
    }
    _selfPosition(pos) {
      var that = this;
      var _pos = function () {
        var _style = ["translate3d(" + pos.translateX + "px," + pos.translateY + "px,0)", "scale(" + pos.scale + "," + pos.scale + ")"];
        if (!that._element) return;
        that._element.style.transform = _style.join(" ");
      };
      that._animate(_pos);
    }
    _animate(fn) {
      return this.animate()(fn);
    }
    init() {
      var that = this;
      if (!that.mc) return;
      that.mc.on("hammer.input", function (ev) {
        if (ev.isFinal) {
          that._oldX = that.translateX;
          that._oldY = that.translateY;
          that._oldScale = that.scale;
        }
      });
      that.mc.add(new Hammer.Pan({
        direction: Hammer.DIRECTION_ALL,
        threshold: 0,
        pointers: 0
      }));
      that.mc.add(new Hammer.Pinch({
        threshold: 0
      })).recognizeWith(that.mc.get("pan"));
      that.mc.on("panstart panmove", _onPan);
      that.mc.on("pinchstart pinchmove", _onPinch);
      that._setPosition();
      function _onPan(ev) {
        if (!that._element) return;
        if (that.firstTouch) {
          that._oldX = that._relateX;
          that._oldY = that._relateY;
        }
        that.translateX = that._oldX + ev.deltaX;
        that.translateY = that._oldY + ev.deltaY;
        const {
          width,
          height
        } = that._element.getBoundingClientRect();
        const ow = width / that.scale / 2;
        const oh = height / that.scale / 2;
        const minWidth = ow * (that.scale - 1);
        const maxWidth = that.parentWidth - width + minWidth;
        const minHeight = oh * (that.scale - 1);
        const maxHeight = that.parentHeight - height + minHeight;

        // 限制越界
        if (that._limit) {
          if (width <= that.parentWidth) {
            if (that.translateX < minWidth) {
              that.translateX = minWidth;
            }
            if (that.translateX >= maxWidth) {
              that.translateX = maxWidth;
            }
          } else {
            if (that.translateX > minWidth) {
              that.translateX = minWidth;
            }
            if (that.translateX < maxWidth) {
              that.translateX = maxWidth;
            }
          }
          if (height <= that.parentHeight) {
            if (that.translateY < minHeight) {
              that.translateY = minHeight;
            }
            if (that.translateY >= maxHeight) {
              that.translateY = maxHeight;
            }
          } else {
            if (that.translateY > minHeight) {
              that.translateY = minHeight;
            }
            if (that.translateY < maxHeight) {
              that.translateY = maxHeight;
            }
          }
        }
        var _position = {
          translateX: that.translateX,
          translateY: that.translateY,
          scale: that.scale
        };
        that._selfPosition(_position);
        that.firstTouch = false;
      }
      function _onPinch(ev) {
        that.scale = that._oldScale * ev.scale;
        if (that.maxScale > 0 && that.maxScale > 0) {
          if (that.scale < that.minScale) {
            that.scale = that.minScale;
          }
          if (that.scale > that.maxScale) {
            that.scale = that.maxScale;
          }
        }
        that._selfPosition({
          translateX: that.translateX,
          translateY: that.translateY,
          scale: that.scale
        });
        that._selfPosition(that._position);
      }
    }
    resetSize(scale = 1) {
      this.scale = scale;
      this._oldScale = scale;
      this._oldX = 0;
      this._oldY = 0;
      this._setPosition();
    }
  }

  return ScaleElement;

}));
