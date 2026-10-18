/* ==========================================================================
   Инициализация Babylon.js движка (BABYLON.Engine), сцены (BABYLON.Scene),
   камеры (BABYLON.FreeCamera), освещения, тумана, тональной компрессии ACES,
   кастомных GLSL-шейдеров трёх башен (BABYLON.Effect.ShadersStore), сплайнов
   CatmullRomCurve3 и конвейера пост-обработки (Bloom, Heat Distortion, RGB Shift)
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

/* ---------- 2. Класс сплайна CatmullRomCurve3 (для 3D-потоков лавы и лент Пустоты) ---------- */

class CatmullRomCurve3 {
  constructor(points) {
    this.points = points || [];
  }

  getPointAt(u) {
    const pts = this.points;
    const n = pts.length;
    if (n === 0) return new BABYLON.Vector3(0, 0, 0);
    if (n === 1) return pts[0].clone();

    const clampedU = Math.max(0.0, Math.min(1.0, u));
    const p = (n - 1) * clampedU;
    const intPoint = Math.min(Math.floor(p), n - 2);
    const weight = p - intPoint;

    const p0 = pts[intPoint === 0 ? 0 : intPoint - 1];
    const p1 = pts[intPoint];
    const p2 = pts[intPoint + 1];
    const p3 = pts[intPoint + 2 < n ? intPoint + 2 : n - 1];

    const w2 = weight * weight;
    const w3 = w2 * weight;

    const calc = (v0, v1, v2, v3) =>
      0.5 * (
        (2.0 * v1) +
        (-v0 + v2) * weight +
        (2.0 * v0 - 5.0 * v1 + 4.0 * v2 - v3) * w2 +
        (-v0 + 3.0 * v1 - 3.0 * v2 + v3) * w3
      );

    return new BABYLON.Vector3(
      calc(p0.x, p1.x, p2.x, p3.x),
      calc(p0.y, p1.y, p2.y, p3.y),
      calc(p0.z, p1.z, p2.z, p3.z)
    );
  }

  getTangentAt(u) {
    const delta = 0.0005;
    const u1 = Math.max(0.0, u - delta);
    const u2 = Math.min(1.0, u + delta);
    const pt1 = this.getPointAt(u1);
    const pt2 = this.getPointAt(u2);
    const tan = pt2.subtract(pt1);
    if (tan.lengthSquared() < 1e-10) {
      return new BABYLON.Vector3(0, -1, 0);
    }
    return tan.normalize();
  }

  computeFrenetFrames(segments) {
    const tangents = [];
    const normals = [];
    const binormals = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      tangents[i] = this.getTangentAt(u);
    }

    normals[0] = new BABYLON.Vector3();
    binormals[0] = new BABYLON.Vector3();
    let min = Number.MAX_VALUE;
    const tx = Math.abs(tangents[0].x);
    const ty = Math.abs(tangents[0].y);
    const tz = Math.abs(tangents[0].z);
    const normal = new BABYLON.Vector3();

    if (tx <= min) { min = tx; normal.set(1, 0, 0); }
    if (ty <= min) { min = ty; normal.set(0, 1, 0); }
    if (tz <= min) { normal.set(0, 0, 1); }

    const vec = BABYLON.Vector3.Cross(tangents[0], normal).normalize();
    normals[0] = BABYLON.Vector3.Cross(tangents[0], vec).normalize();
    binormals[0] = BABYLON.Vector3.Cross(tangents[0], normals[0]).normalize();

    for (let i = 1; i <= segments; i++) {
      normals[i] = normals[i - 1].clone();
      binormals[i] = binormals[i - 1].clone();

      const axis = BABYLON.Vector3.Cross(tangents[i - 1], tangents[i]);
      if (axis.length() > 1e-6) {
        axis.normalize();
        const dot = Math.max(-1.0, Math.min(1.0, BABYLON.Vector3.Dot(tangents[i - 1], tangents[i])));
        const theta = Math.acos(dot);
        const rotMat = BABYLON.Matrix.RotationAxis(axis, theta);
        normals[i] = BABYLON.Vector3.TransformNormal(normals[i], rotMat).normalize();
      }
      binormals[i] = BABYLON.Vector3.Cross(tangents[i], normals[i]).normalize();
    }

    return { tangents, normals, binormals };
  }
}

/* ---------- 3. Регистрация всех кастомных GLSL-шейдеров 3 башен в BABYLON.Effect.ShadersStore ---------- */

const GLSL_SIMPLEX_NOISE_3D = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  vec3 applyVoidFog(vec3 col, vec3 worldPos, vec3 camPos, float density) {
    float dist = length(worldPos - camPos);
    float fogFactor = exp(-pow(dist * density, 2.0));
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    return mix(vec3(0.027, 0.008, 0.063), col, fogFactor);
  }
`;

(function registerAllTowerShaders() {
  const S = BABYLON.Effect.ShadersStore;

  // ==================== I. ШЕЙДЕРЫ ПЕПЕЛЬНОЙ БАШНИ (babylon_js_glsl.html) ====================

  // 1. 3D-потоки стекающей лавы (по стенам и со ступеней)
  S['flowingLavaVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 viewProjection;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uSeed;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vBulge;
    ${GLSL_SIMPLEX_NOISE_3D}

    void main(void) {
      vUv = uv;
      float flowT = uTime * 0.55 * uSpeed + uSeed;

      float wave1 = snoise(vec3(uv.x * 9.0 - flowT * 2.2, uv.y * 4.0, uSeed + flowT * 0.4));
      float wave2 = snoise(vec3(uv.x * 20.0 - flowT * 3.8, uv.y * 6.0, uSeed * 2.1));
      float endTaper = sin(clamp(uv.x, 0.0, 1.0) * 3.14159265);

      float bulge = (wave1 * 0.65 + wave2 * 0.35) * endTaper;
      vBulge = bulge;

      vec3 displaced = position + normal * (bulge * 0.14);
      vec4 worldPos = world * vec4(displaced, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = viewProjection * worldPos;
    }
  `;

  S['flowingLavaFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uSeed;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform vec3 uCameraPos;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vBulge;
    ${GLSL_SIMPLEX_NOISE_3D}

    void main(void) {
      float flowT = uTime * 0.55 * uSpeed + uSeed;
      float along = vUv.x;
      float across = abs(sin(vUv.y * 3.14159265));

      float n1 = snoise(vec3(along * 10.0 - flowT * 2.4, vUv.y * 5.0, uSeed + flowT * 0.3));
      float n2 = snoise(vec3(along * 24.0 - flowT * 4.2, vUv.y * 9.0, uSeed * 3.7));
      float crustNoise = snoise(vec3(along * 15.0 - flowT * 2.0, vUv.y * 7.0, uSeed + 5.0));

      float heat = across * 0.72 + (n1 * 0.5 + 0.5) * 0.38 + (n2 * 0.5 + 0.5) * 0.22 + vBulge * 0.25;
      float slagPatch = smoothstep(0.45, 0.78, crustNoise) * (1.0 - across * 0.55);
      heat = clamp(heat - slagPatch * 0.62, 0.02, 1.2);

      vec3 colBlackCrust = vec3(0.04, 0.02, 0.02);
      vec3 colDarkRed    = vec3(0.52, 0.04, 0.01);
      vec3 colOrange     = vec3(1.00, 0.30, 0.00);
      vec3 colBrightYel  = vec3(1.00, 0.90, 0.36);

      vec3 color = mix(colBlackCrust, colDarkRed, smoothstep(0.15, 0.42, heat));
      color = mix(color, colOrange, smoothstep(0.42, 0.72, heat));
      color = mix(color, colBrightYel, smoothstep(0.72, 0.98, heat));
      color *= (0.75 + pow(max(0.0, heat), 2.0) * 1.45);

      float dist = length(uCameraPos - vWorldPos);
      float fogFactor = 1.0 - exp(-(uFogDensity * dist) * (uFogDensity * dist));
      color = mix(color, uFogColor, clamp(fogFactor * 0.7, 0.0, 0.9));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // 2. Лавовые лужи на полу и под ступенями (с кругами от капель)
  S['lavaPuddleVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 viewProjection;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uSeed;

    varying vec2 vLocalXZ;
    varying float vRadial;
    varying vec3 vWorldPos;
    ${GLSL_SIMPLEX_NOISE_3D}

    void main(void) {
      vLocalXZ = position.xz;
      vRadial = uv.x;
      float t = uTime * 0.35 * uSpeed + uSeed;

      vec3 pos = position;
      float centerMask = 1.0 - smoothstep(0.55, 0.98, vRadial);
      float swell = snoise(vec3(pos.xz * 0.85, t * 0.7)) * 0.07 * centerMask;
      pos.y += swell;

      vec4 worldPos = world * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = viewProjection * worldPos;
    }
  `;

  S['lavaPuddleFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uSeed;
    uniform float uDripRipple;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform vec3 uCameraPos;

    varying vec2 vLocalXZ;
    varying float vRadial;
    varying vec3 vWorldPos;
    ${GLSL_SIMPLEX_NOISE_3D}

    void main(void) {
      float t = uTime * 0.32 * uSpeed + uSeed;
      vec2 p = vLocalXZ * 0.95;

      float n1 = snoise(vec3(p * 1.1 + vec2(t * 0.15, -t * 0.12), t * 0.45));
      float n2 = snoise(vec3(p * 2.6 - vec2(t * 0.22, t * 0.18), t * 0.8));

      float rimCooling = smoothstep(0.62, 0.96, vRadial + n1 * 0.12);
      float cell = (n1 * 0.5 + 0.5) * 0.6 + (n2 * 0.5 + 0.5) * 0.4;
      float heat = mix(cell + 0.22, 0.04, rimCooling);

      if (uDripRipple > 0.5) {
        float rDist = length(vLocalXZ);
        float cycle = fract(uTime * 0.55 + uSeed * 0.37);
        float waveRadius = cycle * 1.35;
        float ring = exp(-pow((rDist - waveRadius) * 6.5, 2.0)) * (1.0 - cycle);
        heat += ring * 0.65 * (1.0 - rimCooling);
      }

      vec3 colCharRim  = vec3(0.025, 0.02, 0.022);
      vec3 colCrust    = vec3(0.12, 0.02, 0.01);
      vec3 colDarkRed  = vec3(0.60, 0.05, 0.01);
      vec3 colOrange   = vec3(1.00, 0.33, 0.00);
      vec3 colYellow   = vec3(1.00, 0.90, 0.35);

      vec3 color = mix(colCharRim, colCrust, smoothstep(0.05, 0.20, heat));
      color = mix(color, colDarkRed, smoothstep(0.20, 0.44, heat));
      color = mix(color, colOrange, smoothstep(0.44, 0.72, heat));
      color = mix(color, colYellow, smoothstep(0.72, 0.98, heat));
      color *= (0.7 + pow(max(0.0, heat), 2.1) * 1.45);

      float dist = length(uCameraPos - vWorldPos);
      float fogFactor = 1.0 - exp(-(uFogDensity * dist) * (uFogDensity * dist));
      color = mix(color, uFogColor, clamp(fogFactor * 0.7, 0.0, 0.9));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // 3. Море магмы внизу под ареной Пепельной башни
  S['lavaSeaVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 viewProjection;
    uniform float uTime;
    uniform float uSpeed;

    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPos;
    ${GLSL_SIMPLEX_NOISE_3D}

    void main(void) {
      vUv = uv;
      vec3 pos = position;
      float t = uTime * 0.45 * uSpeed;

      float waveLarge = snoise(vec3(pos.xy * 0.06, t * 0.6)) * 0.65;
      float waveMedium = snoise(vec3(pos.xy * 0.15 - t * 0.35, t * 0.9)) * 0.28;
      float bubble = max(0.0, snoise(vec3(pos.xy * 0.32, t * 1.8))) * 0.22;

      float elevation = waveLarge + waveMedium + bubble;
      pos.z += elevation;
      vElevation = elevation;

      vec4 worldPosition = world * vec4(pos, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = viewProjection * worldPosition;
    }
  `;

  S['lavaSeaFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uSpeed;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform vec3 uCameraPos;

    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vWorldPos;
    ${GLSL_SIMPLEX_NOISE_3D}

    void main(void) {
      float t = uTime * 0.35 * uSpeed;
      vec2 p = vWorldPos.xz * 0.075;

      float n1 = snoise(vec3(p * 1.4 + vec2(t * 0.25, -t * 0.15), t * 0.4));
      float n2 = snoise(vec3(p * 3.1 - vec2(t * 0.4, t * 0.2), t * 0.85));
      float n3 = snoise(vec3(p * 6.5, t * 1.6));

      float heat = (n1 * 0.5 + 0.5) * 0.55 + (n2 * 0.5 + 0.5) * 0.35 + (n3 * 0.5 + 0.5) * 0.2;
      heat += vElevation * 0.25;

      float bubblePop = smoothstep(0.72, 0.92, n3) * smoothstep(0.1, 0.6, n1);
      heat = clamp(heat + bubblePop * 0.45, 0.0, 1.25);

      vec3 colCrust    = vec3(0.11, 0.02, 0.01);
      vec3 colDarkRed  = vec3(0.58, 0.05, 0.01);
      vec3 colOrange   = vec3(1.00, 0.32, 0.00);
      vec3 colYellow   = vec3(1.00, 0.92, 0.38);

      vec3 lavaColor = mix(colCrust, colDarkRed, smoothstep(0.18, 0.42, heat));
      lavaColor = mix(lavaColor, colOrange, smoothstep(0.42, 0.70, heat));
      lavaColor = mix(lavaColor, colYellow, smoothstep(0.70, 0.98, heat));
      lavaColor *= (0.85 + pow(max(0.0, heat), 2.2) * 1.45);

      float dist = length(uCameraPos - vWorldPos);
      float fogFactor = 1.0 - exp(-(uFogDensity * dist) * (uFogDensity * dist));
      lavaColor = mix(lavaColor, uFogColor, clamp(fogFactor * 0.78, 0.0, 0.95));

      gl_FragColor = vec4(lavaColor, 1.0);
    }
  `;

  // ==================== II. ШЕЙДЕРЫ ЛЕДЯНОЙ БАШНИ (babylon_js.html) ====================

  // 1. Воронка бездонной метели (Simplex + Voronoi/FBM)
  S['blizzardVortexVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform mat4 worldView;
    uniform mat4 projection;
    uniform float uTime;
    uniform float uLayerIndex;

    varying vec2 vUv;
    varying float vRadialDist;
    varying float vElevation;
    varying vec3 vViewPosition;
    varying vec3 vNormalView;

    vec3 mod289v(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permutev(vec3 x) { return mod289v(((x * 34.0) + 1.0) * x); }

    float snoise2(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289v2(i);
      vec3 p = permutev(permutev(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vUv = uv;
      vec2 centered = (uv - 0.5) * 2.0;
      float r = length(centered);
      float theta = atan(centered.y, centered.x);
      vRadialDist = r;

      float spiralAngle = theta + (3.8 / (r + 0.28)) - uTime * (1.85 + uLayerIndex * 0.35);
      vec2 spiralCoord = vec2(cos(spiralAngle) * r, sin(spiralAngle) * r);

      float wave1 = snoise2(spiralCoord * 2.5 + vec2(uTime * 0.4, -uTime * 0.6));
      float wave2 = snoise2(spiralCoord * 5.5 - vec2(uTime * 0.9, uTime * 0.5)) * 0.5;

      float funnelDepth = -pow(1.0 - clamp(r, 0.0, 1.0), 1.85) * 4.5;
      float ridge = (wave1 + wave2) * smoothstep(0.08, 0.85, r) * (1.2 + uLayerIndex * 0.45);

      vec3 displaced = position;
      displaced.z += funnelDepth + ridge;
      vElevation = wave1 + wave2;

      vec4 mvPosition = worldView * vec4(displaced, 1.0);
      vViewPosition = -mvPosition.xyz;
      vNormalView = normalize((worldView * vec4(normal, 0.0)).xyz);
      gl_Position = projection * mvPosition;
    }
  `;

  S['blizzardVortexFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uLayerIndex;
    uniform float uOpacity;
    varying vec2 vUv;
    varying float vRadialDist;
    varying float vElevation;
    varying vec3 vViewPosition;
    varying vec3 vNormalView;

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }

    float voronoi(vec2 x) {
      vec2 n = floor(x);
      vec2 f = fract(x);
      float md = 8.0;
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          o = 0.5 + 0.5 * sin(uTime * 1.4 + 6.2831 * o);
          vec2 r = g + o - f;
          float d = dot(r, r);
          if (d < md) md = d;
        }
      }
      return sqrt(md);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
      for (int i = 0; i < 4; i++) {
        v += a * (1.0 - voronoi(p));
        p = rot * p * 2.05 + vec2(uTime * 0.25, -uTime * 0.18);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 centered = (vUv - 0.5) * 2.0;
      float r = length(centered);
      if (r > 1.0) discard;

      float angle = atan(centered.y, centered.x);
      float vortexTwist = angle + 4.8 / (r + 0.16) - uTime * (2.1 + uLayerIndex * 0.4);
      vec2 polarUv = vec2(vortexTwist * 1.35, log(r + 0.08) * 3.4 - uTime * 1.6);

      float stormNoise = fbm(polarUv);
      float fineStreaks = fbm(polarUv * vec2(2.4, 1.2) + vec2(0.0, -uTime * 2.2));
      float combined = clamp(stormNoise * 0.68 + fineStreaks * 0.52 + vElevation * 0.22, 0.0, 1.0);

      vec3 abyssColor = vec3(0.04, 0.09, 0.17);
      vec3 frostCyan  = vec3(0.48, 0.80, 0.96);
      vec3 snowWhite  = vec3(0.93, 0.98, 1.00);

      float coreDarkness = smoothstep(0.02, 0.26, r);
      vec3 color = mix(abyssColor, frostCyan, smoothstep(0.15, 0.58, combined) * coreDarkness);
      color = mix(color, snowWhite, smoothstep(0.46, 0.88, combined) * coreDarkness);

      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormalView)), 2.2);
      color += vec3(0.55, 0.88, 1.0) * fresnel * 0.42;

      float radialMask = smoothstep(1.0, 0.62, r) * smoothstep(0.0, 0.08, r);
      float alpha = radialMask * smoothstep(0.12, 0.78, combined) * uOpacity;

      gl_FragColor = vec4(color, alpha);
    }
  `;

  // 2. Стелющийся морозный пар над трещинами ледяного пола
  S['creepingFogVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  S['creepingFogFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uSeed;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    void main() {
      vec2 centered = (vUv - 0.5) * 2.0;
      float r = length(centered);
      if (r > 1.0) discard;

      vec2 flowUv = vUv * 3.2 + vec2(uTime * 0.14 + uSeed, -uTime * 0.09 + uSeed * 1.7);
      float n1 = valueNoise(flowUv);
      float n2 = valueNoise(flowUv * 2.1 - vec2(uTime * 0.18, uTime * 0.11));
      float vapor = n1 * 0.6 + n2 * 0.4;

      float mask = pow(1.0 - r, 1.6) * smoothstep(0.28, 0.78, vapor);
      vec3 mistColor = mix(vec3(0.53, 0.87, 1.0), vec3(0.90, 0.97, 1.0), vapor);
      gl_FragColor = vec4(mistColor, mask * 0.36);
    }
  `;

  // ==================== III. ШЕЙДЕРЫ БАШНИ ПУСТОТЫ (babylon_js_environment.html) ====================

  // 1. Бездна внизу с параллаксом космоса и далёкими пульсирующими огнями
  S['abyssVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 worldViewProjection;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec4 worldPosition = world * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  S['abyssFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uSurge;
    uniform vec3 uCameraPos;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    ${GLSL_SIMPLEX_NOISE_3D}

    float hash21(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    float starLayer(vec2 uv, float scale, float timeOffset) {
      vec2 gv = fract(uv * scale) - 0.5;
      vec2 id = floor(uv * scale);
      float n = hash21(id);
      if (n < 0.86) return 0.0;

      vec2 offset = (vec2(hash21(id + 1.7), hash21(id + 9.2)) - 0.5) * 0.65;
      float d = length(gv - offset);

      float pulse = sin(uTime * (0.35 + fract(n * 17.0) * 0.8) + n * 62.8 + timeOffset);
      pulse = smoothstep(0.15, 0.98, pulse);

      float star = smoothstep(0.09, 0.0, d) * pulse;
      star += smoothstep(0.24, 0.0, d) * 0.25 * pulse;
      return star;
    }

    void main() {
      vec2 centered = vWorldPos.xz * 0.018;
      float distFromCenter = length(vWorldPos.xz);

      vec3 viewDir = normalize(vWorldPos - uCameraPos);
      vec2 parallaxUv1 = centered + viewDir.xz * 0.22;
      vec2 parallaxUv2 = centered * 1.6 + viewDir.xz * 0.48;
      vec2 parallaxUv3 = centered * 2.5 + viewDir.xz * 0.82;

      vec3 baseAbyss = vec3(0.008, 0.002, 0.016);

      float nebula1 = snoise(vec3(parallaxUv1 * 2.2, uTime * 0.04)) * 0.5 + 0.5;
      float nebula2 = snoise(vec3(parallaxUv2 * 3.8, -uTime * 0.06)) * 0.5 + 0.5;
      float voidVortex = smoothstep(38.0, 2.0, distFromCenter);

      vec3 deepGlow = mix(vec3(0.02, 0.005, 0.05), vec3(0.14, 0.03, 0.26), nebula1 * nebula2);
      baseAbyss += deepGlow * 0.36 * (0.4 + 0.6 * voidVortex);

      float s1 = starLayer(parallaxUv1, 14.0, 0.0);
      float s2 = starLayer(parallaxUv2, 23.0, 12.4);
      float s3 = starLayer(parallaxUv3, 35.0, 29.1);

      vec3 starCol1 = vec3(0.66, 0.33, 0.97) * s1 * 0.95;
      vec3 starCol2 = vec3(0.55, 0.75, 1.00) * s2 * 0.75;
      vec3 starCol3 = vec3(0.85, 0.50, 1.00) * s3 * 0.55;

      float ring = smoothstep(0.32, 0.0, abs(length(parallaxUv2) - 0.19 - sin(uTime * 0.3) * 0.02));
      vec3 singularity = vec3(0.54, 0.17, 0.89) * ring * (0.32 + uSurge * 0.6);

      vec3 finalColor = baseAbyss + starCol1 + starCol2 + starCol3 + singularity;
      float radialFade = smoothstep(68.0, 22.0, distFromCenter);
      finalColor *= radialFade;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // 2. Сложенное как бумага небо (оригами-разломы с холодными звёздами)
  S['skyRiftVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 worldViewProjection;

    varying vec2 vUv;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vLocalPos = position;
      vec4 wp = world * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  S['skyRiftFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uSurge;

    varying vec2 vUv;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;

    ${GLSL_SIMPLEX_NOISE_3D}

    float foldedRiftMask(vec2 p) {
      float minSeam = 10.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float angle = fi * 0.89759 + 0.35;
        vec2 dir = vec2(cos(angle), sin(angle));
        float offset = sin(fi * 2.4 + 0.8) * 0.32;
        float d = abs(dot(p, dir) - offset);
        minSeam = min(minSeam, d);
      }
      return minSeam;
    }

    float starHash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 p = vLocalPos.xz * 0.022;
      float seamDist = foldedRiftMask(p);

      float n = snoise(vec3(p * 6.0, uTime * 0.15)) * 0.018;
      float riftWidth = 0.042 + sin(uTime * 0.7 + length(p) * 3.0) * 0.008 + uSurge * 0.025;
      float isRift = 1.0 - smoothstep(riftWidth * 0.45, riftWidth, seamDist + n);
      float riftEdge = smoothstep(riftWidth * 1.9, riftWidth * 0.45, seamDist + n) * (1.0 - isRift);

      float facetShade = fract(sin(floor(p.x * 4.0) * 12.9 + floor(p.y * 4.0) * 78.2) * 43758.5);
      vec3 foldedPaperCol = mix(vec3(0.012, 0.004, 0.024), vec3(0.045, 0.015, 0.085), facetShade * 0.5);

      vec2 starUv = p * 55.0 + vec2(uTime * 0.08, -uTime * 0.05);
      vec2 gridId = floor(starUv);
      vec2 gridUv = fract(starUv) - 0.5;
      float sh = starHash(gridId);
      float starMask = step(0.82, sh);
      float twinkle = 0.55 + 0.45 * sin(uTime * 2.5 + sh * 50.0);
      float starPoint = smoothstep(0.18, 0.0, length(gridUv)) * starMask * twinkle;

      vec3 riftSpaceCol = vec3(0.04, 0.01, 0.11) + vec3(0.75, 0.88, 1.0) * starPoint * 2.2;
      vec3 neonEdgeCol = vec3(0.66, 0.33, 0.97) * riftEdge * (1.9 + uSurge);

      vec3 finalCol = mix(foldedPaperCol, riftSpaceCol, isRift) + neonEdgeCol;
      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  // 3. Стены Башни Пустоты с асинхронными R/G/B рунами и картой рельефа
  S['wallRunesVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 worldViewProjection;

    varying vec3 vWallWorldPos;
    varying vec3 vWorldNormal;
    varying vec2 vRuneUv;

    void main() {
      vRuneUv = uv * vec2(6.0, 9.0);
      vec4 wp = world * vec4(position, 1.0);
      vWallWorldPos = wp.xyz;
      vWorldNormal = normalize(mat3(world[0].xyz, world[1].xyz, world[2].xyz) * normal);
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  S['wallRunesFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uSurge;
    uniform float uFogDensity;
    uniform vec3 uCameraPos;
    uniform sampler2D uRuneMap;
    uniform sampler2D uBumpMap;

    varying vec3 vWallWorldPos;
    varying vec3 vWorldNormal;
    varying vec2 vRuneUv;

    ${GLSL_SIMPLEX_NOISE_3D}

    void main() {
      float bCenter = texture2D(uBumpMap, vRuneUv).r;
      float bRight  = texture2D(uBumpMap, vRuneUv + vec2(0.002, 0.0)).r;
      float bUp     = texture2D(uBumpMap, vRuneUv + vec2(0.0, 0.002)).r;
      vec3 bumpOffset = vec3((bCenter - bRight) * 1.4, (bCenter - bUp) * 1.4, 0.0);
      vec3 N = normalize(vWorldNormal + bumpOffset);

      vec3 baseStone = vec3(0.071, 0.031, 0.110) * (0.65 + 0.65 * bCenter);
      vec3 toCenter = normalize(vec3(0.0, vWallWorldPos.y + 4.0, 0.0) - vWallWorldPos);
      float diff = max(dot(N, toCenter), 0.0) * 0.55 + max(dot(-N, toCenter), 0.0) * 0.45;
      vec3 hemi = mix(vec3(0.01, 0.004, 0.02), vec3(0.102, 0.035, 0.20), N.y * 0.5 + 0.5);
      vec3 litColor = baseStone * (0.55 + diff * 1.1) + hemi * 0.28;

      vec3 runeMask = texture2D(uRuneMap, vRuneUv).rgb;
      float spatialPhase = vWallWorldPos.y * 0.14 + atan(vWallWorldPos.z, vWallWorldPos.x) * 2.0;
      float waveR = pow(0.5 + 0.5 * sin(uTime * 1.35 + spatialPhase), 2.2);
      float waveG = pow(0.5 + 0.5 * sin(uTime * 0.92 - spatialPhase * 1.3 + 2.09), 2.2);
      float waveB = pow(0.5 + 0.5 * sin(uTime * 1.78 + spatialPhase * 0.7 + 4.18), 2.2);

      vec3 colR = vec3(0.541, 0.169, 0.886) * runeMask.r * waveR;
      vec3 colG = vec3(0.659, 0.333, 0.969) * runeMask.g * waveG;
      vec3 colB = vec3(0.450, 0.550, 1.000) * runeMask.b * waveB;

      float surgeBoost = 1.85 + uSurge * 2.4;
      vec3 finalCol = litColor + (colR + colG + colB) * surgeBoost;
      finalCol = applyVoidFog(finalCol, vWallWorldPos, uCameraPos, uFogDensity > 0.0 ? uFogDensity : 0.0092);

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  // 4. Чёрные обсидиановые плиты пола со сверкающими вкраплениями «звёздной пыли»
  S['obsidianFloorVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 worldViewProjection;

    varying vec3 vFloorWorldPos;
    varying vec3 vWorldNormal;

    void main() {
      vec4 wp = world * vec4(position, 1.0);
      vFloorWorldPos = wp.xyz;
      vWorldNormal = normalize(mat3(world[0].xyz, world[1].xyz, world[2].xyz) * normal);
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  S['obsidianFloorFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uSurge;
    uniform float uFogDensity;
    uniform vec3 uCameraPos;
    uniform sampler2D uStardustMap;

    varying vec3 vFloorWorldPos;
    varying vec3 vWorldNormal;

    ${GLSL_SIMPLEX_NOISE_3D}

    void main() {
      vec3 N = normalize(vWorldNormal);
      vec3 viewDir = normalize(uCameraPos - vFloorWorldPos);

      vec3 baseObsidian = vec3(0.024, 0.016, 0.042);
      vec3 lightDir = normalize(vec3(0.25, 1.0, 0.35));
      vec3 halfVec = normalize(lightDir + viewDir);
      float diff = max(dot(N, lightDir), 0.15);
      float spec = pow(max(dot(N, halfVec), 0.0), 28.0) * 0.28;
      vec3 litObsidian = baseObsidian * (0.6 + 0.8 * diff) + vec3(0.45, 0.22, 0.75) * spec;

      vec2 dustUv = vFloorWorldPos.xz * 0.16;
      vec3 dustRGB = texture2D(uStardustMap, dustUv).rgb;

      float viewSparkle = pow(0.5 + 0.5 * sin(dot(viewDir, vec3(12.4, 7.8, 15.1)) + vFloorWorldPos.x * 1.5), 3.0);

      float sR = pow(0.5 + 0.5 * sin(uTime * 2.1 + vFloorWorldPos.x * 0.9), 3.0);
      float sG = pow(0.5 + 0.5 * sin(uTime * 1.6 + vFloorWorldPos.z * 1.1 + 2.1), 3.0);
      float sB = pow(0.5 + 0.5 * sin(uTime * 2.7 - (vFloorWorldPos.x + vFloorWorldPos.z) * 0.7 + 4.2), 3.0);

      vec3 sparkleCol =
          vec3(0.66, 0.33, 0.97) * dustRGB.r * sR +
          vec3(0.55, 0.80, 1.00) * dustRGB.g * sG +
          vec3(0.92, 0.65, 1.00) * dustRGB.b * sB;

      vec3 finalCol = litObsidian + sparkleCol * (1.2 + 1.8 * viewSparkle + uSurge * 1.4);
      finalCol = applyVoidFog(finalCol, vFloorWorldPos, uCameraPos, uFogDensity > 0.0 ? uFogDensity : 0.0092);

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  // 5. Растворившиеся ступени лестницы Башни Пустоты (3D Simplex Noise Dissolve, на которые можно встать!)
  S['stairDissolveVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform mat4 world;
    uniform mat4 worldViewProjection;

    varying vec2 vUv;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vLocalPos = position;
      vNormal = normalize(mat3(world[0].xyz, world[1].xyz, world[2].xyz) * normal);
      vec4 wp = world * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = worldViewProjection * vec4(position, 1.0);
    }
  `;

  S['stairDissolveFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uDissolveLevel;
    uniform float uEdgeIntensity;
    uniform float uBrokenEnd;
    uniform float uFogDensity;
    uniform vec3 uCameraPos;

    varying vec2 vUv;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    ${GLSL_SIMPLEX_NOISE_3D}

    void main() {
      float grain = snoise(vWorldPos * 2.4) * 0.5 + 0.5;
      vec3 stoneBase = mix(vec3(0.035, 0.018, 0.062), vec3(0.095, 0.045, 0.15), grain);

      vec3 lightDir = normalize(vec3(0.3, 1.0, 0.4));
      float diff = max(dot(vNormal, lightDir), 0.15);
      vec3 color = stoneBase * (0.45 + 0.75 * diff);

      float noiseVal = snoise(vWorldPos * 0.85 + vec3(0.0, uTime * 0.35, 0.0)) * 0.5 + 0.5;
      float fineNoise = snoise(vWorldPos * 2.8 - vec3(uTime * 0.5)) * 0.22;
      float combinedNoise = noiseVal + fineNoise;

      float edgeFactor = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
      float threshold = uBrokenEnd * (uDissolveLevel + edgeFactor * 0.32);

      // Keep subtle crystalline rune lattice on the step border so player sees where to step
      float runeLattice = step(0.92, edgeFactor) * (0.5 + 0.5 * sin(uTime * 4.0 + vWorldPos.x * 2.0));
      if (combinedNoise < threshold && runeLattice < 0.5) {
        discard;
      }

      float burnWidth = 0.16 * uBrokenEnd;
      float edgeGlow = 1.0 - smoothstep(threshold, threshold + burnWidth, combinedNoise);
      vec3 voidEdgeColor = vec3(0.659, 0.333, 0.969) * 2.6;

      color = mix(color, voidEdgeColor, clamp(edgeGlow * uBrokenEnd * uEdgeIntensity + runeLattice * 0.75, 0.0, 1.0));
      color = applyVoidFog(color, vWorldPos, uCameraPos, uFogDensity > 0.0 ? uFogDensity : 0.0092);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // 6. Светящийся биолюминесцентный «планктон» в воздухе Башни Пустоты
  S['planktonVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute float aScale;
    attribute float aPhase;
    attribute vec3 aColor;

    uniform mat4 worldView;
    uniform mat4 projection;
    uniform float uTime;
    uniform float uGravitySpeed;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = aColor;
      vec3 pos = position;

      float t = uTime * 0.45 * uGravitySpeed + aPhase;
      pos.x += sin(t * 0.9 + pos.y * 0.12) * 0.85;
      pos.y += cos(t * 0.65 + pos.x * 0.10) * 1.15;
      pos.z += sin(t * 0.75 + pos.z * 0.12) * 0.85;

      vec4 mvPosition = worldView * vec4(pos, 1.0);
      gl_Position = projection * mvPosition;

      float viewDist = length(mvPosition.xyz);
      float pulse = 0.55 + 0.45 * sin(uTime * 1.8 + aPhase * 3.0);
      vAlpha = pulse * smoothstep(95.0, 8.0, viewDist);

      gl_PointSize = clamp(aScale * (210.0 / max(viewDist, 1.0)) * (0.75 + 0.35 * pulse), 1.5, 28.0);
    }
  `;

  S['planktonFragmentShader'] = `
    precision highp float;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if (d > 0.5) discard;

      float core = smoothstep(0.5, 0.0, d);
      float hotCenter = smoothstep(0.18, 0.0, d);
      vec3 col = vColor * core * 1.8 + vec3(0.95, 0.9, 1.0) * hotCenter * 0.9;

      gl_FragColor = vec4(col, core * vAlpha);
    }
  `;

  // 7. Клубы эфирного тумана на ступенях и ленты абсолютной тьмы из трещин стен
  S['voidMistVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    attribute float aPhase;

    uniform mat4 worldViewProjection;
    uniform float uTime;

    varying vec2 vUv;
    varying float vPhase;

    void main() {
      vUv = uv;
      vPhase = aPhase;
      vec3 pos = position;
      pos.x += sin(uTime * 1.2 + pos.y * 0.5 + aPhase) * 0.22;
      pos.z += cos(uTime * 1.0 + pos.y * 0.5 + aPhase) * 0.22;
      gl_Position = worldViewProjection * vec4(pos, 1.0);
    }
  `;

  S['voidMistFragmentShader'] = `
    precision highp float;
    uniform float uTime;
    uniform float uIsDarkRibbon;

    varying vec2 vUv;
    varying float vPhase;

    ${GLSL_SIMPLEX_NOISE_3D}

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      float n = snoise(vec3(vUv * 3.5, uTime * 0.45 + vPhase)) * 0.5 + 0.5;
      float mask = smoothstep(0.5, 0.08, dist) * n;

      vec3 darkRibbonCol = mix(vec3(0.01, 0.0, 0.02), vec3(0.45, 0.12, 0.78), pow(n, 2.2) * 0.75);
      vec3 mistCol = mix(vec3(0.04, 0.01, 0.08), vec3(0.66, 0.33, 0.97), n * 1.35);

      vec3 finalCol = mix(mistCol, darkRibbonCol, uIsDarkRibbon);
      float alpha = mask * mix(0.65, 0.85, uIsDarkRibbon);

      if (alpha < 0.02) discard;
      gl_FragColor = vec4(finalCol, alpha);
    }
  `;
})();

/* ---------- 4. Инициализация движка, сцены, камеры и освещения ---------- */

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
  scene.imageProcessingConfiguration.exposure = 1.12;
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

const defaultBackgroundTexture = createBackgroundGradientTexture('#140404', '#240808', '#4a1207');
scene.background = defaultBackgroundTexture;

scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogColor = new BABYLON.Color(0x220707);
scene.fogDensity = 0.0155;
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
hemiLight.diffuse = new BABYLON.Color(0x747b8f);
hemiLight.groundColor = new BABYLON.Color(0xe04008);
hemiLight.intensity = 0.95;

const dirLight = new BABYLON.DirectionalLight(
  'dirLight',
  new BABYLON.Vector3(-18, -48, -22).normalize(),
  scene
);
dirLight.position = new BABYLON.Vector3(40, 90, 20);
dirLight.diffuse = new BABYLON.Color(0x9aa3b8);
dirLight.intensity = 0.85;

const lavaLight = new BABYLON.PointLight('lavaLight', new BABYLON.Vector3(0, 6, 0), scene);
lavaLight.diffuse = new BABYLON.Color(0xff5a18);
lavaLight.intensity = 2.8;
lavaLight.range = 64;

const rimLight = new BABYLON.PointLight('rimLight', new BABYLON.Vector3(0, 2, 0), scene);
rimLight.diffuse = new BABYLON.Color(0xff4800);
rimLight.intensity = 1.1;
rimLight.range = 38;

// Свет босса всегда в сцене (intensity = 0 вне боя)
const bossLight = new BABYLON.PointLight('bossLight', new BABYLON.Vector3(0, -500, 0), scene);
bossLight.diffuse = new BABYLON.Color(0xff6a20);
bossLight.intensity = 0;
bossLight.range = 46;

/**
 * Синхронизирует параметры VFX и пост-обработки активной башни (с учётом периодических Бурь)
 * с конвейером рендеринга Babylon.js.
 */
function syncScenePostProcessParams(time, dt) {
  const towerCfg = currentTowerTheme || TOWERS.ash;
  const baseVfx = towerCfg.vfxParams || TOWERS.ash.vfxParams;
  const stormCfg = towerCfg.stormParams || TOWERS.ash.stormParams;
  const targetStorm = (state && state.towerStorm && state.towerStorm.intensity) || 0.0;

  const blendRate = Math.min(1.0, (dt || 0.016) * 2.4);
  activeTowerVfxState.towerId = towerCfg.id;
  activeTowerVfxState.stormFactor += (targetStorm - activeTowerVfxState.stormFactor) * blendRate;
  const s = activeTowerVfxState.stormFactor;

  const mixVal = (a, b) => a + (b - a) * s;

  activeTowerVfxState.bloomStrength = mixVal(baseVfx.bloomStrength || 0, stormCfg.bloomStrength !== undefined ? stormCfg.bloomStrength : baseVfx.bloomStrength || 0);
  activeTowerVfxState.bloomThreshold = mixVal(baseVfx.bloomThreshold !== undefined ? baseVfx.bloomThreshold : 0.18, stormCfg.bloomThreshold !== undefined ? stormCfg.bloomThreshold : baseVfx.bloomThreshold || 0.18);
  activeTowerVfxState.heatDistortion = mixVal(baseVfx.heatDistortion || 0, stormCfg.heatDistortion !== undefined ? stormCfg.heatDistortion : baseVfx.heatDistortion || 0);
  activeTowerVfxState.lavaSpeed = mixVal(baseVfx.lavaSpeed || 2.25, stormCfg.lavaSpeed || baseVfx.lavaSpeed || 2.25);
  activeTowerVfxState.fogDensity = mixVal(baseVfx.fogDensity || 0.012, stormCfg.fogDensity !== undefined ? stormCfg.fogDensity : baseVfx.fogDensity || 0.012);
  activeTowerVfxState.renderFogDensity = mixVal(
    baseVfx.renderFogDensity !== undefined ? baseVfx.renderFogDensity : baseVfx.fogDensity || 0.012,
    stormCfg.renderFogDensity !== undefined ? stormCfg.renderFogDensity : stormCfg.fogDensity || 0.024
  );
  activeTowerVfxState.cracksEmissive = mixVal(baseVfx.cracksEmissive || 1.95, stormCfg.cracksEmissive || 2.45);
  activeTowerVfxState.blizzardSpeed = mixVal(baseVfx.blizzardSpeed || 0.5, stormCfg.blizzardSpeed || 0.9);
  activeTowerVfxState.rgbShift = mixVal(baseVfx.rgbShift || 0, stormCfg.rgbShift !== undefined ? stormCfg.rgbShift : baseVfx.rgbShift || 0);
  activeTowerVfxState.gravityAnomaly = mixVal(baseVfx.gravityAnomaly || 1.4, stormCfg.gravityAnomaly || 2.25);
  activeTowerVfxState.dissolveThreshold = mixVal(baseVfx.dissolveThreshold || 0.39, stormCfg.dissolveThreshold || 0.65);
  activeTowerVfxState.coldGrade = mixVal(baseVfx.coldGrade || 0, stormCfg.coldGrade !== undefined ? stormCfg.coldGrade : baseVfx.coldGrade || 0);

  scene.fogDensity = activeTowerVfxState.renderFogDensity;

  if (scene.postProcessParams) {
    const pp = scene.postProcessParams;
    pp.time = time || 0;
    pp.bloomStrength = activeTowerVfxState.bloomStrength;
    pp.bloomThreshold = activeTowerVfxState.bloomThreshold;
    pp.heatDistortion = activeTowerVfxState.heatDistortion;
    pp.rgbShift = activeTowerVfxState.rgbShift;
    pp.coldGrade = activeTowerVfxState.coldGrade;
    pp.stormIntensity = s;
    if (stormCfg.stormColorHex) {
      pp.stormColor.setHex(stormCfg.stormColorHex);
    }
  }

  if (typeof setTowerStormAudioFactor === 'function') {
    setTowerStormAudioFactor(s);
  }
}

function handleWindowResize() {
  engine.resize();
}

window.addEventListener('resize', handleWindowResize);
handleWindowResize();

function applyPixelRatio() {
  engine.setHardwareScalingLevel(1 / currentPixelRatio);
  engine.resize();
}
