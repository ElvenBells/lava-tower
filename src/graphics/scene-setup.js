/* ==========================================================================
   Инициализация Babylon.js движка (BABYLON.Engine), сцены (BABYLON.Scene),
   камеры (BABYLON.FreeCamera), освещения, тумана, тональной компрессии ACES
   и базовых расширений графа сцены Babylon.js
   ========================================================================== */

const canvas = document.createElement('canvas');
document.body.prepend(canvas);

/* ---------- 1. Расширения математических типов и узлов Babylon.js ---------- */

(function extendBabylonCore() {
  const B = BABYLON;

  function hslToRgb(h, s, l) {
    h = ((h % 1) + 1) % 1;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    if (s === 0) return [l, l, l];
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
  }

  function rgbToHsl(r, g, b) {
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) * 0.5;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  // Расширение BABYLON.Color3 для работы с hex, HSL и реактивной синхронизацией материалов
  const cProto = B.Color3.prototype;
  cProto._notify = function () {
    if (this._onChange) this._onChange();
    return this;
  };
  cProto.setHex = function (hex) {
    const n = (hex >>> 0) & 0xffffff;
    this.r = ((n >> 16) & 255) / 255;
    this.g = ((n >> 8) & 255) / 255;
    this.b = (n & 255) / 255;
    return this._notify();
  };
  cProto.getHex = function () {
    const r = Math.max(0, Math.min(255, Math.round(this.r * 255)));
    const g = Math.max(0, Math.min(255, Math.round(this.g * 255)));
    const b = Math.max(0, Math.min(255, Math.round(this.b * 255)));
    return (r << 16) | (g << 8) | b;
  };
  cProto.copy = function (other) {
    if (other) {
      this.r = other.r;
      this.g = other.g;
      this.b = other.b;
    }
    return this._notify();
  };
  cProto.multiplyScalar = function (s) {
    this.r *= s;
    this.g *= s;
    this.b *= s;
    return this._notify();
  };
  cProto.setHSL = function (h, s, l) {
    const [r, g, b] = hslToRgb(h, s, l);
    this.r = r;
    this.g = g;
    this.b = b;
    return this._notify();
  };
  cProto.offsetHSL = function (dh, ds, dl) {
    const [h, s, l] = rgbToHsl(this.r, this.g, this.b);
    return this.setHSL(h + (dh || 0), s + (ds || 0), l + (dl || 0));
  };

  class BabylonColor extends B.Color3 {
    constructor(r, g, b) {
      super(1, 1, 1);
      if (r !== undefined && g === undefined) {
        if (typeof r === 'number') {
          this.setHex(r);
        } else if (typeof r === 'string') {
          const c = B.Color3.FromHexString(r);
          this.set(c.r, c.g, c.b);
        } else if (r && typeof r.r === 'number') {
          this.set(r.r, r.g, r.b);
        }
      } else if (r !== undefined) {
        this.set(r, g || 0, b || 0);
      }
    }
    clone() {
      return new BabylonColor(this.r, this.g, this.b);
    }
  }
  B.Color = BabylonColor;
  B.Color3.FromHex = (hex) => new BabylonColor(hex);

  // Расширение BABYLON.Vector3
  const vProto = B.Vector3.prototype;
  const origVecSet = vProto.set;
  vProto.set = function (x, y, z) {
    if (origVecSet) {
      origVecSet.call(this, x, y, z);
    } else {
      this.x = +x || 0;
      this.y = +y || 0;
      this.z = +z || 0;
    }
    if (this._onEulerChange) this._onEulerChange();
    return this;
  };
  vProto.setScalar = function (s) {
    this.x = s;
    this.y = s;
    this.z = s;
    return this;
  };
  vProto.copy = function (v) {
    if (v) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
    }
    if (this._onEulerChange) this._onEulerChange();
    return this;
  };
  vProto.multiplyScalar = function (s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  };
  vProto.add = function (v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  };
  vProto.sub = function (v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  };
  vProto.applyMatrix4 = function (m) {
    const e = m.m || m.elements;
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15] || 1);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  };

  // Расширение BABYLON.Euler и BABYLON.Quaternion
  class BabylonEuler {
    constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
      this.x = x;
      this.y = y;
      this.z = z;
      this.order = order;
    }
    set(x, y, z, order) {
      this.x = x || 0;
      this.y = y || 0;
      this.z = z || 0;
      if (order) this.order = order;
      return this;
    }
  }
  B.Euler = BabylonEuler;

  const qProto = B.Quaternion.prototype;
  qProto.identity = function () {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
    if (this._ownerNode) {
      this._ownerNode._useQuat = false;
      this._ownerNode.rotationQuaternion = null;
    }
    return this;
  };
  qProto.copy = function (q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    if (this._ownerNode) {
      this._ownerNode._useQuat = true;
      this._ownerNode.rotationQuaternion = this;
    }
    return this;
  };
  qProto.multiply = function (q) {
    const ax = this.x, ay = this.y, az = this.z, aw = this.w;
    const bx = q.x, by = q.y, bz = q.z, bw = q.w;
    this.x = ax * bw + aw * bx + ay * bz - az * by;
    this.y = ay * bw + aw * by + az * bx - ax * bz;
    this.z = az * bw + aw * bz + ax * by - ay * bx;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    if (this._ownerNode) {
      this._ownerNode._useQuat = true;
      this._ownerNode.rotationQuaternion = this;
    }
    return this;
  };
  qProto.setFromAxisAngle = function (axis, angle) {
    const half = angle * 0.5;
    const s = Math.sin(half);
    const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z) || 1;
    this.x = (axis.x / len) * s;
    this.y = (axis.y / len) * s;
    this.z = (axis.z / len) * s;
    this.w = Math.cos(half);
    if (this._ownerNode) {
      this._ownerNode._useQuat = true;
      this._ownerNode.rotationQuaternion = this;
    }
    return this;
  };
  qProto.setFromEuler = function (euler) {
    const x = (euler.x || 0) * 0.5;
    const y = (euler.y || 0) * 0.5;
    const z = (euler.z || 0) * 0.5;
    const c1 = Math.cos(x), s1 = Math.sin(x);
    const c2 = Math.cos(y), s2 = Math.sin(y);
    const c3 = Math.cos(z), s3 = Math.sin(z);
    this.x = s1 * c2 * c3 + c1 * s2 * s3;
    this.y = c1 * s2 * c3 - s1 * c2 * s3;
    this.z = c1 * c2 * s3 + s1 * s2 * c3;
    this.w = c1 * c2 * c3 - s1 * s2 * s3;
    return this;
  };
  qProto.setFromUnitVectors = function (vFrom, vTo) {
    let r = vFrom.x * vTo.x + vFrom.y * vTo.y + vFrom.z * vTo.z + 1;
    if (r < 1e-6) {
      r = 0;
      if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
        this.x = -vFrom.y;
        this.y = vFrom.x;
        this.z = 0;
        this.w = r;
      } else {
        this.x = 0;
        this.y = -vFrom.z;
        this.z = vFrom.y;
        this.w = r;
      }
    } else {
      this.x = vFrom.y * vTo.z - vFrom.z * vTo.y;
      this.y = vFrom.z * vTo.x - vFrom.x * vTo.z;
      this.z = vFrom.x * vTo.y - vFrom.y * vTo.x;
      this.w = r;
    }
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w) || 1;
    this.x /= len;
    this.y /= len;
    this.z /= len;
    this.w /= len;
    return this;
  };

  // Расширение BABYLON.Matrix / Matrix4
  const mProto = B.Matrix.prototype;
  if (!Object.getOwnPropertyDescriptor(mProto, 'elements')) {
    Object.defineProperty(mProto, 'elements', {
      get() {
        return this.m;
      },
      configurable: true
    });
  }
  mProto.copy = function (other) {
    if (other && other.m) {
      this.m.set(other.m);
    }
    return this;
  };
  B.Matrix4 = B.Matrix;

  // Расширение BABYLON.Node, BABYLON.TransformNode, BABYLON.Light, BABYLON.Material
  if (B.Node && !Object.getOwnPropertyDescriptor(B.Node.prototype, 'userData')) {
    Object.defineProperty(B.Node.prototype, 'userData', {
      get() {
        if (!this.metadata) this.metadata = {};
        return this.metadata;
      },
      set(val) {
        this.metadata = val;
      },
      configurable: true
    });
  }
  if (B.Material && !Object.getOwnPropertyDescriptor(B.Material.prototype, 'userData')) {
    Object.defineProperty(B.Material.prototype, 'userData', {
      get() {
        if (!this.metadata) this.metadata = {};
        return this.metadata;
      },
      set(val) {
        this.metadata = val;
      },
      configurable: true
    });
  }
  if (B.Light && !Object.getOwnPropertyDescriptor(B.Light.prototype, 'color')) {
    Object.defineProperty(B.Light.prototype, 'color', {
      get() {
        return this.diffuse;
      },
      set(val) {
        if (val) this.diffuse.copyFrom(val);
      },
      configurable: true
    });
  }

  const tnProto = B.TransformNode.prototype;
  if (!Object.getOwnPropertyDescriptor(tnProto, 'up')) {
    Object.defineProperty(tnProto, 'up', {
      get() {
        if (!this._upVector) this._upVector = new B.Vector3(0, 1, 0);
        return this._upVector;
      },
      set(v) {
        if (v) this.up.copyFrom(v);
      },
      configurable: true
    });
  }
  if (!Object.getOwnPropertyDescriptor(tnProto, 'scale')) {
    Object.defineProperty(tnProto, 'scale', {
      get() {
        return this.scaling;
      },
      set(val) {
        if (val) this.scaling.copyFrom(val);
      },
      configurable: true
    });
  }
  if (!Object.getOwnPropertyDescriptor(tnProto, 'visible')) {
    Object.defineProperty(tnProto, 'visible', {
      get() {
        return this._visibleFlag !== false;
      },
      set(val) {
        const b = Boolean(val);
        this._visibleFlag = b;
        if ('isVisible' in this) {
          this.isVisible = b && (!this._isThinInstanced || this._instanceCount > 0);
        }
        if (this.parent) {
          this.setEnabled(b);
        }
      },
      configurable: true
    });
  }
  if (!Object.getOwnPropertyDescriptor(tnProto, 'children')) {
    Object.defineProperty(tnProto, 'children', {
      get() {
        return this.getChildren ? this.getChildren() : this._children || [];
      },
      configurable: true
    });
  }
  if (!Object.getOwnPropertyDescriptor(tnProto, 'quaternion')) {
    Object.defineProperty(tnProto, 'quaternion', {
      get() {
        if (!this._quatProxy) {
          this._quatProxy = new B.Quaternion(0, 0, 0, 1);
          this._quatProxy._ownerNode = this;
          this.rotation._onEulerChange = () => {
            this._useQuat = false;
            this.rotationQuaternion = null;
          };
        }
        return this._quatProxy;
      },
      set(q) {
        if (q) this.quaternion.copy(q);
      },
      configurable: true
    });
  }
  if (!Object.getOwnPropertyDescriptor(tnProto, 'matrix')) {
    Object.defineProperty(tnProto, 'matrix', {
      get() {
        if (!this._composedLocalMatrix) this._composedLocalMatrix = new B.Matrix();
        return this._composedLocalMatrix;
      },
      configurable: true
    });
  }
  if (!Object.getOwnPropertyDescriptor(tnProto, 'matrixWorld')) {
    Object.defineProperty(tnProto, 'matrixWorld', {
      get() {
        if (!this._composedWorldMatrix) this._composedWorldMatrix = new B.Matrix();
        return this._composedWorldMatrix;
      },
      configurable: true
    });
  }

  tnProto.add = function (...items) {
    for (let i = 0; i < items.length; i++) {
      const child = items[i];
      if (!child || child === this) continue;
      child.parent = this;
      child.setEnabled(child._visibleFlag !== false);
    }
    return this;
  };
  tnProto.remove = function (...items) {
    for (let i = 0; i < items.length; i++) {
      const child = items[i];
      if (child && child.parent === this) {
        child.parent = null;
        child.setEnabled(false);
      }
    }
    return this;
  };
  tnProto.clear = function () {
    const ch = (this.getChildren ? this.getChildren() : []).slice();
    for (let i = 0; i < ch.length; i++) {
      ch[i].dispose(false, false);
    }
    return this;
  };
  tnProto.traverse = function (callback) {
    callback(this);
    const ch = this.getChildren ? this.getChildren() : [];
    for (let i = 0; i < ch.length; i++) {
      if (ch[i] && typeof ch[i].traverse === 'function') {
        ch[i].traverse(callback);
      } else if (ch[i]) {
        callback(ch[i]);
      }
    }
  };
  tnProto.getWorldPosition = function (target) {
    this.computeWorldMatrix(true);
    const abs = this.getAbsolutePosition();
    if (target) {
      target.copyFrom(abs);
      return target;
    }
    return abs.clone();
  };

  const _composeQuat = new B.Quaternion();
  tnProto.updateMatrix = function () {
    if (this._useQuat && this._quatProxy) {
      _composeQuat.copyFrom(this._quatProxy);
    } else {
      _composeQuat.setFromEuler(this.rotation);
    }
    B.Matrix.ComposeToRef(this.scaling, _composeQuat, this.position, this.matrix);
    return this.matrix;
  };
  tnProto.updateMatrixWorld = function (force) {
    this.updateMatrix();
    if (this.parent && this.parent.matrixWorld && this.parent.name !== 'sceneRoot') {
      B.Matrix.MultiplyToRef(this.parent.matrixWorld, this.matrix, this.matrixWorld);
    } else {
      this.matrixWorld.copyFrom(this.matrix);
    }
    const ch = this.getChildren ? this.getChildren() : [];
    for (let i = 0; i < ch.length; i++) {
      if (ch[i] && typeof ch[i].updateMatrixWorld === 'function') {
        ch[i].updateMatrixWorld(force);
      }
    }
  };

  // lookAt и локальные повороты rotateX/Y/Z для сборки составных мешей
  tnProto.lookAt = function (xOrVec, y, z) {
    const tx = typeof xOrVec === 'object' ? xOrVec.x : xOrVec;
    const ty = typeof xOrVec === 'object' ? xOrVec.y : y;
    const tz = typeof xOrVec === 'object' ? xOrVec.z : z;
    let zx = tx - this.position.x;
    let zy = ty - this.position.y;
    let zz = tz - this.position.z;
    const zlen = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (zlen < 1e-8) {
      zx = 0; zy = 0; zz = 1;
    } else {
      zx /= zlen; zy /= zlen; zz /= zlen;
    }
    let ux = this._upVector ? this._upVector.x : 0;
    let uy = this._upVector ? this._upVector.y : 1;
    let uz = this._upVector ? this._upVector.z : 0;
    if (Math.abs(zx * ux + zy * uy + zz * uz) > 0.999) {
      ux = 0; uy = 0; uz = zy > 0 ? 1 : -1;
    }
    let xx = uy * zz - uz * zy;
    let xy = uz * zx - ux * zz;
    let xz = ux * zy - uy * zx;
    const xlen = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1;
    xx /= xlen; xy /= xlen; xz /= xlen;
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    const trace = xx + yy + zz;
    const q = this.quaternion;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      q.w = 0.25 / s;
      q.x = (yz - zy) * s;
      q.y = (zx - xz) * s;
      q.z = (xy - yx) * s;
    } else if (xx > yy && xx > zz) {
      const s = 2.0 * Math.sqrt(1.0 + xx - yy - zz);
      q.w = (yz - zy) / s;
      q.x = 0.25 * s;
      q.y = (xy + yx) / s;
      q.z = (xz + zx) / s;
    } else if (yy > zz) {
      const s = 2.0 * Math.sqrt(1.0 + yy - xx - zz);
      q.w = (zx - xz) / s;
      q.x = (xy + yx) / s;
      q.y = 0.25 * s;
      q.z = (yz + zy) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + zz - xx - yy);
      q.w = (xy - yx) / s;
      q.x = (xz + zx) / s;
      q.y = (yz + zy) / s;
      q.z = 0.25 * s;
    }
    this._useQuat = true;
    this.rotationQuaternion = q;
    return this;
  };

  const _rotAxisQuat = new B.Quaternion();
  tnProto.rotateX = function (angle) {
    if (!this._useQuat) {
      this.quaternion.setFromEuler(this.rotation);
      this._useQuat = true;
    }
    _rotAxisQuat.setFromAxisAngle({ x: 1, y: 0, z: 0 }, angle);
    this.quaternion.multiply(_rotAxisQuat);
    return this;
  };
  tnProto.rotateY = function (angle) {
    if (!this._useQuat) {
      this.quaternion.setFromEuler(this.rotation);
      this._useQuat = true;
    }
    _rotAxisQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
    this.quaternion.multiply(_rotAxisQuat);
    return this;
  };
  tnProto.rotateZ = function (angle) {
    if (!this._useQuat) {
      this.quaternion.setFromEuler(this.rotation);
      this._useQuat = true;
    }
    _rotAxisQuat.setFromAxisAngle({ x: 0, y: 0, z: 1 }, angle);
    this.quaternion.multiply(_rotAxisQuat);
    return this;
  };
})();

/* ---------- 2. Инициализация движка, сцены, камеры и освещения ---------- */

let maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
let currentPixelRatio = maxPixelRatio;

const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: true,
  adaptToDeviceRatio: true
});
engine.setHardwareScalingLevel(1 / currentPixelRatio);

const scene = new BABYLON.Scene(engine);
scene.useRightHandedSystem = true;
scene.ambientColor = new BABYLON.Color3(1, 1, 1);
scene.skipPointerMovePicking = true;

if (scene.imageProcessingConfiguration) {
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType =
    BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.2;
}

// Корневой узел сцены для единообразного управления иерархией (scene.add / scene.remove)
const sceneRoot = new BABYLON.TransformNode('sceneRoot', scene);
scene.add = function (...items) {
  for (let i = 0; i < items.length; i++) {
    const child = items[i];
    if (!child) continue;
    child.parent = sceneRoot;
    child.setEnabled(child._visibleFlag !== false);
  }
  return scene;
};
scene.remove = function (...items) {
  for (let i = 0; i < items.length; i++) {
    const child = items[i];
    if (!child) continue;
    if (child.parent === sceneRoot || !child.parent) {
      child.parent = null;
      child.setEnabled(false);
    }
  }
  return scene;
};

// Камера Babylon.js
const camera = new BABYLON.FreeCamera('mainCamera', new BABYLON.Vector3(0, 16, 23), scene);
camera.fov = (70 * Math.PI) / 180;
camera.minZ = 0.1;
camera.maxZ = 300;
scene.activeCamera = camera;

const _cameraLookTarget = new BABYLON.Vector3();
camera.lookAt = function (x, y, z) {
  if (typeof x === 'object') {
    _cameraLookTarget.copyFrom(x);
  } else {
    _cameraLookTarget.set(x, y, z);
  }
  this.setTarget(_cameraLookTarget);
};
camera.updateProjectionMatrix = function () {};

// Адаптер рендерера для вызовов рендера и контроля разрешения
const renderer = {
  render(targetScene) {
    (targetScene || scene).render();
  },
  compile(targetScene) {
    (targetScene || scene).render();
  },
  setPixelRatio(ratio) {
    engine.setHardwareScalingLevel(1 / (ratio || 1));
  },
  setSize() {
    engine.resize();
  }
};

// Обёртка процедурных 2D-текстур на базе BABYLON.DynamicTexture
BABYLON.RepeatWrapping = BABYLON.Texture.WRAP_ADDRESSMODE;
BABYLON.CanvasTexture = function createBabylonCanvasTexture(texCanvas) {
  const dynTex = new BABYLON.DynamicTexture(
    'canvasTex_' + Math.random().toString(36).slice(2, 7),
    texCanvas,
    scene,
    true
  );
  dynTex.hasAlpha = true;
  dynTex.update(true);

  const offsetProxy = {
    get x() {
      return dynTex.uOffset;
    },
    set x(v) {
      dynTex.uOffset = v;
    },
    get y() {
      return dynTex.vOffset;
    },
    set y(v) {
      dynTex.vOffset = v;
    }
  };
  const repeatProxy = {
    set(rx, ry) {
      dynTex.uScale = rx;
      dynTex.vScale = ry;
    }
  };
  const centerProxy = {
    set(cx, cy) {
      dynTex.uRotationCenter = cx;
      dynTex.vRotationCenter = cy;
    }
  };
  Object.defineProperty(dynTex, 'offset', { get: () => offsetProxy, configurable: true });
  Object.defineProperty(dynTex, 'repeat', { get: () => repeatProxy, configurable: true });
  Object.defineProperty(dynTex, 'center', { get: () => centerProxy, configurable: true });
  Object.defineProperty(dynTex, 'wrapS', {
    get: () => dynTex.wrapU,
    set: (v) => {
      dynTex.wrapU = v;
    },
    configurable: true
  });
  Object.defineProperty(dynTex, 'wrapT', {
    get: () => dynTex.wrapV,
    set: (v) => {
      dynTex.wrapV = v;
    },
    configurable: true
  });
  Object.defineProperty(dynTex, 'rotation', {
    get: () => dynTex.wAng,
    set: (v) => {
      dynTex.wAng = v;
    },
    configurable: true
  });
  return dynTex;
};

/**
 * Создаёт вертикальную градиентную текстуру фона неба/башни.
 * @param {string} topColor
 * @param {string} midColor
 * @param {string} bottomColor
 * @returns {BABYLON.DynamicTexture}
 */
function createBackgroundGradientTexture(topColor, midColor, bottomColor) {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 256;
  const ctx = bgCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(0.55, midColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new BABYLON.CanvasTexture(bgCanvas);
  tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  tex._midColor = new BABYLON.Color(midColor);
  return tex;
}

const backgroundLayer = new BABYLON.Layer('backgroundLayer', null, scene, true);
let _currentBgTex = null;
Object.defineProperty(scene, 'background', {
  get() {
    return _currentBgTex;
  },
  set(tex) {
    _currentBgTex = tex;
    backgroundLayer.texture = tex;
    if (tex && tex._midColor) {
      scene.clearColor.set(tex._midColor.r, tex._midColor.g, tex._midColor.b, 1.0);
    }
  },
  configurable: true
});

// Фон и экспоненциальный туман по умолчанию (Пепельная башня)
const defaultBackgroundTexture = createBackgroundGradientTexture('#1c0f30', '#2b0f22', '#4a1207');
scene.background = defaultBackgroundTexture;

scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogColor = new BABYLON.Color(0x140a18);
scene.fogDensity = 0.012;
scene.fog = {
  color: scene.fogColor,
  get density() {
    return scene.fogDensity;
  },
  set density(v) {
    scene.fogDensity = v;
  }
};

// Постоянные источники света Babylon.js
const hemiLight = new BABYLON.HemisphericLight('hemiLight', new BABYLON.Vector3(0, 1, 0), scene);
hemiLight.diffuse = new BABYLON.Color(0x8a7bb0);
hemiLight.groundColor = new BABYLON.Color(0x3a1408);
hemiLight.intensity = 0.6;

const dirLight = new BABYLON.DirectionalLight(
  'dirLight',
  new BABYLON.Vector3(-40, -90, -20).normalize(),
  scene
);
dirLight.position = new BABYLON.Vector3(40, 90, 20);
dirLight.diffuse = new BABYLON.Color(0xffd9a0);
dirLight.intensity = 0.4;

const lavaLight = new BABYLON.PointLight('lavaLight', new BABYLON.Vector3(0, 6, 0), scene);
lavaLight.diffuse = new BABYLON.Color(0xff5a00);
lavaLight.intensity = 2.5;
lavaLight.range = 60;

const rimLight = new BABYLON.PointLight('rimLight', new BABYLON.Vector3(0, 2, 0), scene);
rimLight.diffuse = new BABYLON.Color(0x4080ff);
rimLight.intensity = 0.8;
rimLight.range = 30;

// Свет босса всегда в сцене (intensity = 0 вне боя)
const bossLight = new BABYLON.PointLight('bossLight', new BABYLON.Vector3(0, -500, 0), scene);
bossLight.diffuse = new BABYLON.Color(0xff6a20);
bossLight.intensity = 0;
bossLight.range = 46;

/**
 * Обновляет размеры буфера движка Babylon.js и соотношение сторон камеры.
 */
function handleWindowResize() {
  engine.resize();
}

window.addEventListener('resize', handleWindowResize);
handleWindowResize();

/**
 * Применяет текущий pixelRatio (используется адаптивным контролем FPS).
 */
function applyPixelRatio() {
  engine.setHardwareScalingLevel(1 / currentPixelRatio);
  engine.resize();
}
