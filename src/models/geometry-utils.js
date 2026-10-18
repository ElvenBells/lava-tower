/* ==========================================================================
   Геометрическое ядро и конструкторы моделей Babylon.js (geometry-utils.js):
   генераторы примитивов на базе BABYLON.VertexData, материалы BABYLON.StandardMaterial,
   инстансинг (Thin Instances), биллборды, облака точек, линии, слияние геометрий,
   подкраска статусов (ожог / замедление) и тонирование боссов под тему башни
   ========================================================================== */

(function initBabylonGeometryAndMaterials() {
  const B = BABYLON;
  const NativeMesh = B.Mesh;
  const NativeTransformNode = B.TransformNode;
  const NativeStandardMaterial = B.StandardMaterial;

  B.AdditiveBlending = 2;
  B.NormalBlending = 1;
  B.FrontSide = 0;
  B.BackSide = 1;
  B.DoubleSide = 2;
  B.ACESFilmicToneMapping = 1;

  /* ---------- 1. Буферные атрибуты и геометрия (BABYLON.VertexData) ---------- */

  class BabylonBufferAttribute {
    constructor(array, itemSize) {
      this.array = array instanceof Float32Array ? array : new Float32Array(array);
      this.itemSize = itemSize || 3;
      this._ownerGeo = null;
      this._attrName = '';
    }
    get count() {
      return (this.array.length / this.itemSize) | 0;
    }
    getX(i) {
      return this.array[i * this.itemSize];
    }
    getY(i) {
      return this.array[i * this.itemSize + 1];
    }
    getZ(i) {
      return this.array[i * this.itemSize + 2];
    }
    setXYZ(i, x, y, z) {
      const idx = i * this.itemSize;
      this.array[idx] = x;
      this.array[idx + 1] = y;
      this.array[idx + 2] = z;
      return this;
    }
    get needsUpdate() {
      return false;
    }
    set needsUpdate(val) {
      if (val && this._ownerGeo) {
        this._ownerGeo._syncAttributeToMeshes(this._attrName);
      }
    }
    clone() {
      return new BabylonBufferAttribute(new Float32Array(this.array), this.itemSize);
    }
  }
  B.BufferAttribute = BabylonBufferAttribute;

  class BabylonBufferGeometry {
    constructor() {
      this._isGeometry = true;
      this.attributes = {};
      this.index = null;
      this._drawRangeStart = 0;
      this._drawRangeCount = Infinity;
      this._meshes = [];
    }
    setAttribute(name, attr) {
      attr._ownerGeo = this;
      attr._attrName = name;
      this.attributes[name] = attr;
      return this;
    }
    setIndex(indices) {
      if (!indices) {
        this.index = null;
      } else if (indices instanceof BabylonBufferAttribute) {
        this.index = indices;
      } else {
        const arr =
          indices instanceof Uint32Array || indices instanceof Uint16Array
            ? indices
            : new Uint32Array(indices);
        this.index = { array: arr, count: arr.length };
      }
      return this;
    }
    setDrawRange(start, count) {
      this._drawRangeStart = start || 0;
      this._drawRangeCount = count === undefined ? Infinity : count;
      this._syncAttributeToMeshes('position');
      return this;
    }
    _syncAttributeToMeshes(attrName) {
      if (!this._meshes.length) return;
      if (attrName === 'position' && this.attributes.position) {
        const src = this.attributes.position.array;
        const vCount = (src.length / 3) | 0;
        let uploadPos = src;
        if (this._drawRangeCount < vCount && this._drawRangeCount > 0) {
          uploadPos = new Float32Array(src);
          const lastIdx = (this._drawRangeCount - 1) * 3;
          const lx = src[lastIdx], ly = src[lastIdx + 1], lz = src[lastIdx + 2];
          for (let i = this._drawRangeCount; i < vCount; i++) {
            uploadPos[i * 3] = lx;
            uploadPos[i * 3 + 1] = ly;
            uploadPos[i * 3 + 2] = lz;
          }
        }
        for (let m = 0; m < this._meshes.length; m++) {
          this._meshes[m].updateVerticesData(B.VertexBuffer.PositionKind, uploadPos, false, false);
        }
      } else if (attrName === 'color' && this.attributes.color) {
        const src = this.attributes.color.array;
        const itemSize = this.attributes.color.itemSize || 3;
        const vCount = (src.length / itemSize) | 0;
        if (!this._rgbaScratch || this._rgbaScratch.length !== vCount * 4) {
          this._rgbaScratch = new Float32Array(vCount * 4);
        }
        const rgba = this._rgbaScratch;
        if (itemSize === 4) {
          rgba.set(src);
        } else {
          for (let i = 0; i < vCount; i++) {
            rgba[i * 4] = src[i * 3];
            rgba[i * 4 + 1] = src[i * 3 + 1];
            rgba[i * 4 + 2] = src[i * 3 + 2];
            rgba[i * 4 + 3] = 1.0;
          }
        }
        for (let m = 0; m < this._meshes.length; m++) {
          this._meshes[m].updateVerticesData(B.VertexBuffer.ColorKind, rgba, false, false);
        }
      }
    }
    translate(dx, dy, dz) {
      const pos = this.attributes.position;
      if (pos) {
        const a = pos.array;
        for (let i = 0; i < a.length; i += 3) {
          a[i] += dx;
          a[i + 1] += dy;
          a[i + 2] += dz;
        }
      }
      return this;
    }
    scale(sx, sy, sz) {
      const syVal = sy === undefined ? sx : sy;
      const szVal = sz === undefined ? sx : sz;
      const pos = this.attributes.position;
      if (pos) {
        const a = pos.array;
        for (let i = 0; i < a.length; i += 3) {
          a[i] *= sx;
          a[i + 1] *= syVal;
          a[i + 2] *= szVal;
        }
      }
      return this;
    }
    rotateX(angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      for (const key of ['position', 'normal']) {
        const attr = this.attributes[key];
        if (!attr) continue;
        const a = attr.array;
        for (let i = 0; i < a.length; i += 3) {
          const y = a[i + 1], z = a[i + 2];
          a[i + 1] = y * c - z * s;
          a[i + 2] = y * s + z * c;
        }
      }
      return this;
    }
    rotateY(angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      for (const key of ['position', 'normal']) {
        const attr = this.attributes[key];
        if (!attr) continue;
        const a = attr.array;
        for (let i = 0; i < a.length; i += 3) {
          const x = a[i], z = a[i + 2];
          a[i] = x * c + z * s;
          a[i + 2] = -x * s + z * c;
        }
      }
      return this;
    }
    rotateZ(angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      for (const key of ['position', 'normal']) {
        const attr = this.attributes[key];
        if (!attr) continue;
        const a = attr.array;
        for (let i = 0; i < a.length; i += 3) {
          const x = a[i], y = a[i + 1];
          a[i] = x * c - y * s;
          a[i + 1] = x * s + y * c;
        }
      }
      return this;
    }
    applyMatrix4(matrix) {
      const e = matrix.m || matrix.elements;
      const pos = this.attributes.position;
      if (pos) {
        const a = pos.array;
        for (let i = 0; i < a.length; i += 3) {
          const x = a[i], y = a[i + 1], z = a[i + 2];
          a[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
          a[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
          a[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
      }
      const norm = this.attributes.normal;
      if (norm) {
        const a = norm.array;
        for (let i = 0; i < a.length; i += 3) {
          const nx = a[i], ny = a[i + 1], nz = a[i + 2];
          let rx = e[0] * nx + e[4] * ny + e[8] * nz;
          let ry = e[1] * nx + e[5] * ny + e[9] * nz;
          let rz = e[2] * nx + e[6] * ny + e[10] * nz;
          const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
          a[i] = rx / len;
          a[i + 1] = ry / len;
          a[i + 2] = rz / len;
        }
      }
      return this;
    }
    computeVertexNormals() {
      const pos = this.attributes.position;
      if (!pos) return this;
      let norm = this.attributes.normal;
      if (!norm || norm.array.length !== pos.array.length) {
        norm = new BabylonBufferAttribute(new Float32Array(pos.array.length), 3);
        this.setAttribute('normal', norm);
      }
      const vCount = (pos.array.length / 3) | 0;
      let indices = this.index ? this.index.array : null;
      if (!indices) {
        if (!this._seqIndices || this._seqIndices.length !== vCount) {
          this._seqIndices = vCount > 65535 ? new Uint32Array(vCount) : new Uint16Array(vCount);
          for (let i = 0; i < vCount; i++) this._seqIndices[i] = i;
        }
        indices = this._seqIndices;
      }
      B.VertexData.ComputeNormals(pos.array, indices, norm.array);
      return this;
    }
    toNonIndexed() {
      if (!this.index) return this.clone();
      const idxArr = this.index.array;
      const count = idxArr.length;
      const out = new BabylonBufferGeometry();
      for (const key of Object.keys(this.attributes)) {
        const srcAttr = this.attributes[key];
        const isize = srcAttr.itemSize;
        const dstArr = new Float32Array(count * isize);
        const srcArr = srcAttr.array;
        for (let i = 0; i < count; i++) {
          const vi = idxArr[i] * isize;
          const di = i * isize;
          for (let k = 0; k < isize; k++) {
            dstArr[di + k] = srcArr[vi + k];
          }
        }
        out.setAttribute(key, new BabylonBufferAttribute(dstArr, isize));
      }
      return out;
    }
    clone() {
      const out = new BabylonBufferGeometry();
      for (const key of Object.keys(this.attributes)) {
        out.setAttribute(key, this.attributes[key].clone());
      }
      if (this.index) {
        out.setIndex(new Uint32Array(this.index.array));
      }
      return out;
    }
    dispose() {
      this._meshes.length = 0;
    }
    toBabylonVertexData() {
      const vd = new B.VertexData();
      const pos = this.attributes.position ? this.attributes.position.array : new Float32Array(0);
      const vCount = (pos.length / 3) | 0;
      vd.positions = pos;

      if (!this.attributes.normal) {
        this.computeVertexNormals();
      }
      vd.normals = this.attributes.normal
        ? this.attributes.normal.array
        : new Float32Array(pos.length);

      vd.uvs = this.attributes.uv
        ? this.attributes.uv.array
        : new Float32Array(vCount * 2);

      if (this.attributes.color) {
        const cAttr = this.attributes.color;
        if (cAttr.itemSize === 4) {
          vd.colors = cAttr.array;
        } else {
          const c4 = new Float32Array(vCount * 4);
          const c3 = cAttr.array;
          for (let i = 0; i < vCount; i++) {
            c4[i * 4] = c3[i * 3];
            c4[i * 4 + 1] = c3[i * 3 + 1];
            c4[i * 4 + 2] = c3[i * 3 + 2];
            c4[i * 4 + 3] = 1.0;
          }
          vd.colors = c4;
        }
      }

      if (this.index && this.index.array) {
        vd.indices = this.index.array;
      } else {
        const seq = vCount > 65535 ? new Uint32Array(vCount) : new Uint16Array(vCount);
        for (let i = 0; i < vCount; i++) seq[i] = i;
        vd.indices = seq;
      }
      return vd;
    }
  }
  B.BufferGeometry = BabylonBufferGeometry;

  /* ---------- 2. Процедурные генераторы геометрий (в стиле MeshBuilder / VertexData) ---------- */

  function buildGeometryFromArrays(positions, normals, uvs, indices) {
    const geo = new BabylonBufferGeometry();
    geo.setAttribute('position', new BabylonBufferAttribute(new Float32Array(positions), 3));
    if (normals && normals.length) {
      geo.setAttribute('normal', new BabylonBufferAttribute(new Float32Array(normals), 3));
    }
    if (uvs && uvs.length) {
      geo.setAttribute('uv', new BabylonBufferAttribute(new Float32Array(uvs), 2));
    }
    if (indices && indices.length) {
      geo.setIndex(indices);
    }
    if (!normals || !normals.length) {
      geo.computeVertexNormals();
    }
    return geo;
  }

  B.BoxGeometry = function createBoxGeometry(
    width = 1,
    height = 1,
    depth = 1,
    widthSegments = 1,
    heightSegments = 1,
    depthSegments = 1
  ) {
    const ws = Math.max(1, widthSegments | 0);
    const hs = Math.max(1, heightSegments | 0);
    const ds = Math.max(1, depthSegments | 0);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let vertexCount = 0;

    function buildPlane(uIdx, vIdx, wIdx, uDir, vDir, uLen, vLen, wDepth, gridX, gridY) {
      const segW = uLen / gridX;
      const segH = vLen / gridY;
      const halfW = uLen * 0.5;
      const halfH = vLen * 0.5;
      const halfD = wDepth * 0.5;
      const vOffset = vertexCount;
      const vec = [0, 0, 0];

      for (let iy = 0; iy <= gridY; iy++) {
        const y = iy * segH - halfH;
        for (let ix = 0; ix <= gridX; ix++) {
          const x = ix * segW - halfW;
          vec[uIdx] = x * uDir;
          vec[vIdx] = y * vDir;
          vec[wIdx] = halfD;
          positions.push(vec[0], vec[1], vec[2]);

          vec[uIdx] = 0;
          vec[vIdx] = 0;
          vec[wIdx] = wDepth > 0 ? 1 : -1;
          normals.push(vec[0], vec[1], vec[2]);

          uvs.push(ix / gridX, 1 - iy / gridY);
          vertexCount++;
        }
      }

      for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
          const a = vOffset + ix + (gridX + 1) * iy;
          const b = vOffset + ix + (gridX + 1) * (iy + 1);
          const c = vOffset + (ix + 1) + (gridX + 1) * (iy + 1);
          const d = vOffset + (ix + 1) + (gridX + 1) * iy;
          indices.push(a, b, d, b, c, d);
        }
      }
    }

    buildPlane(2, 1, 0, -1, -1, depth, height, width, ds, hs);   // +X
    buildPlane(2, 1, 0, 1, -1, depth, height, -width, ds, hs);   // -X
    buildPlane(0, 2, 1, 1, 1, width, depth, height, ws, ds);     // +Y
    buildPlane(0, 2, 1, 1, -1, width, depth, -height, ws, ds);   // -Y
    buildPlane(0, 1, 2, 1, -1, width, height, depth, ws, hs);    // +Z
    buildPlane(0, 1, 2, -1, -1, width, height, -depth, ws, hs);  // -Z

    return buildGeometryFromArrays(positions, normals, uvs, indices);
  };

  B.PlaneGeometry = function createPlaneGeometry(
    width = 1,
    height = 1,
    widthSegments = 1,
    heightSegments = 1
  ) {
    const gx = Math.max(1, widthSegments | 0);
    const gy = Math.max(1, heightSegments | 0);
    const hw = width * 0.5;
    const hh = height * 0.5;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let iy = 0; iy <= gy; iy++) {
      const y = (iy / gy) * height - hh;
      for (let ix = 0; ix <= gx; ix++) {
        const x = (ix / gx) * width - hw;
        positions.push(x, -y, 0);
        normals.push(0, 0, 1);
        uvs.push(ix / gx, 1 - iy / gy);
      }
    }
    for (let iy = 0; iy < gy; iy++) {
      for (let ix = 0; ix < gx; ix++) {
        const a = ix + (gx + 1) * iy;
        const b = ix + (gx + 1) * (iy + 1);
        const c = ix + 1 + (gx + 1) * (iy + 1);
        const d = ix + 1 + (gx + 1) * iy;
        indices.push(a, b, d, b, c, d);
      }
    }
    return buildGeometryFromArrays(positions, normals, uvs, indices);
  };

  B.CircleGeometry = function createCircleGeometry(
    radius = 1,
    segments = 32,
    thetaStart = 0,
    thetaLength = Math.PI * 2
  ) {
    const segs = Math.max(3, segments | 0);
    const positions = [0, 0, 0];
    const normals = [0, 0, 1];
    const uvs = [0.5, 0.5];
    const indices = [];

    for (let s = 0; s <= segs; s++) {
      const a = thetaStart + (s / segs) * thetaLength;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      positions.push(radius * cx, radius * cy, 0);
      normals.push(0, 0, 1);
      uvs.push(cx * 0.5 + 0.5, cy * 0.5 + 0.5);
    }
    for (let i = 1; i <= segs; i++) {
      indices.push(0, i, i + 1);
    }
    return buildGeometryFromArrays(positions, normals, uvs, indices);
  };

  B.RingGeometry = function createRingGeometry(
    innerRadius = 0.5,
    outerRadius = 1,
    thetaSegments = 32,
    phiSegments = 1,
    thetaStart = 0,
    thetaLength = Math.PI * 2
  ) {
    const ts = Math.max(3, thetaSegments | 0);
    const ps = Math.max(1, phiSegments | 0);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let j = 0; j <= ps; j++) {
      const r = innerRadius + (j / ps) * (outerRadius - innerRadius);
      for (let i = 0; i <= ts; i++) {
        const a = thetaStart + (i / ts) * thetaLength;
        const cx = Math.cos(a);
        const cy = Math.sin(a);
        positions.push(r * cx, r * cy, 0);
        normals.push(0, 0, 1);
        uvs.push((r / outerRadius) * cx * 0.5 + 0.5, (r / outerRadius) * cy * 0.5 + 0.5);
      }
    }
    for (let j = 0; j < ps; j++) {
      for (let i = 0; i < ts; i++) {
        const a = (ts + 1) * j + i;
        const b = (ts + 1) * (j + 1) + i;
        const c = (ts + 1) * (j + 1) + i + 1;
        const d = (ts + 1) * j + i + 1;
        indices.push(a, b, d, b, c, d);
      }
    }
    return buildGeometryFromArrays(positions, normals, uvs, indices);
  };

  B.TorusGeometry = function createTorusGeometry(
    radius = 1,
    tube = 0.4,
    radialSegments = 12,
    tubularSegments = 48,
    arc = Math.PI * 2
  ) {
    const rs = Math.max(3, radialSegments | 0);
    const ts = Math.max(3, tubularSegments | 0);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let j = 0; j <= rs; j++) {
      const v = (j / rs) * Math.PI * 2;
      const cv = Math.cos(v);
      const sv = Math.sin(v);
      for (let i = 0; i <= ts; i++) {
        const u = (i / ts) * arc;
        const cu = Math.cos(u);
        const su = Math.sin(u);
        const x = (radius + tube * cv) * cu;
        const y = (radius + tube * cv) * su;
        const z = tube * sv;
        positions.push(x, y, z);

        const nx = cv * cu;
        const ny = cv * su;
        const nz = sv;
        normals.push(nx, ny, nz);
        uvs.push(i / ts, j / rs);
      }
    }
    for (let j = 1; j <= rs; j++) {
      for (let i = 1; i <= ts; i++) {
        const a = (ts + 1) * j + i - 1;
        const b = (ts + 1) * (j - 1) + i - 1;
        const c = (ts + 1) * (j - 1) + i;
        const d = (ts + 1) * j + i;
        indices.push(a, b, d, b, c, d);
      }
    }
    return buildGeometryFromArrays(positions, normals, uvs, indices);
  };

  B.CylinderGeometry = function createCylinderGeometry(
    radiusTop = 1,
    radiusBottom = 1,
    height = 1,
    radialSegments = 32,
    heightSegments = 1,
    openEnded = false,
    thetaStart = 0,
    thetaLength = Math.PI * 2
  ) {
    const rs = Math.max(3, radialSegments | 0);
    const hs = Math.max(1, heightSegments | 0);
    const halfH = height * 0.5;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let index = 0;
    const indexArray = [];
    const slope = (radiusBottom - radiusTop) / (height || 1);

    for (let y = 0; y <= hs; y++) {
      const v = y / hs;
      const currRadius = v * (radiusBottom - radiusTop) + radiusTop;
      const row = [];
      for (let x = 0; x <= rs; x++) {
        const u = x / rs;
        const theta = u * thetaLength + thetaStart;
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        positions.push(currRadius * sinT, -v * height + halfH, currRadius * cosT);
        let nx = sinT;
        let ny = slope;
        let nz = cosT;
        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        normals.push(nx / nLen, ny / nLen, nz / nLen);
        uvs.push(u, 1 - v);
        row.push(index++);
      }
      indexArray.push(row);
    }

    for (let x = 0; x < rs; x++) {
      for (let y = 0; y < hs; y++) {
        const a = indexArray[y][x];
        const b = indexArray[y + 1][x];
        const c = indexArray[y + 1][x + 1];
        const d = indexArray[y][x + 1];
        indices.push(a, b, d, b, c, d);
      }
    }

    function generateCap(isTop) {
      const radius = isTop ? radiusTop : radiusBottom;
      const sign = isTop ? 1 : -1;
      const centerIndexStart = index;
      for (let x = 1; x <= rs; x++) {
        positions.push(0, halfH * sign, 0);
        normals.push(0, sign, 0);
        uvs.push(0.5, 0.5);
        index++;
      }
      const centerIndexEnd = index;
      for (let x = 0; x <= rs; x++) {
        const u = x / rs;
        const theta = u * thetaLength + thetaStart;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        positions.push(radius * sinT, halfH * sign, radius * cosT);
        normals.push(0, sign, 0);
        uvs.push(cosT * 0.5 + 0.5, sinT * 0.5 * sign + 0.5);
        index++;
      }
      for (let x = 0; x < rs; x++) {
        const c = centerIndexStart + x;
        const i = centerIndexEnd + x;
        if (isTop) {
          indices.push(i, i + 1, c);
        } else {
          indices.push(i + 1, i, c);
        }
      }
    }

    if (!openEnded) {
      if (radiusTop > 0) generateCap(true);
      if (radiusBottom > 0) generateCap(false);
    }

    return buildGeometryFromArrays(positions, normals, uvs, indices);
  };

  B.ConeGeometry = function createConeGeometry(
    radius = 1,
    height = 1,
    radialSegments = 32,
    heightSegments = 1,
    openEnded = false,
    thetaStart = 0,
    thetaLength = Math.PI * 2
  ) {
    return B.CylinderGeometry(
      0,
      radius,
      height,
      radialSegments,
      heightSegments,
      openEnded,
      thetaStart,
      thetaLength
    );
  };

  B.SphereGeometry = function createSphereGeometry(
    radius = 1,
    widthSegments = 32,
    heightSegments = 16,
    phiStart = 0,
    phiLength = Math.PI * 2,
    thetaStart = 0,
    thetaLength = Math.PI
  ) {
    const ws = Math.max(3, widthSegments | 0);
    const hs = Math.max(2, heightSegments | 0);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let index = 0;
    const grid = [];

    for (let iy = 0; iy <= hs; iy++) {
      const v = iy / hs;
      const theta = thetaStart + v * thetaLength;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const row = [];
      for (let ix = 0; ix <= ws; ix++) {
        const u = ix / ws;
        const phi = phiStart + u * phiLength;
        const nx = -Math.cos(phi) * sinTheta;
        const ny = cosTheta;
        const nz = Math.sin(phi) * sinTheta;
        positions.push(radius * nx, radius * ny, radius * nz);
        normals.push(nx, ny, nz);
        uvs.push(u, 1 - v);
        row.push(index++);
      }
      grid.push(row);
    }

    for (let iy = 0; iy < hs; iy++) {
      for (let ix = 0; ix < ws; ix++) {
        const a = grid[iy][ix + 1];
        const b = grid[iy][ix];
        const c = grid[iy + 1][ix];
        const d = grid[iy + 1][ix + 1];
        indices.push(a, b, d, b, c, d);
      }
    }
    return buildGeometryFromArrays(positions, normals, uvs, indices);
  };

  function createPolyhedronGeometry(baseVerts, baseIndices, radius = 1, detail = 0) {
    let tris = [];
    for (let i = 0; i < baseIndices.length; i += 3) {
      const i0 = baseIndices[i] * 3;
      const i1 = baseIndices[i + 1] * 3;
      const i2 = baseIndices[i + 2] * 3;
      tris.push([
        [baseVerts[i0], baseVerts[i0 + 1], baseVerts[i0 + 2]],
        [baseVerts[i1], baseVerts[i1 + 1], baseVerts[i1 + 2]],
        [baseVerts[i2], baseVerts[i2 + 1], baseVerts[i2 + 2]]
      ]);
    }
    const mid = (a, b) => [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
    for (let d = 0; d < (detail | 0); d++) {
      const next = [];
      for (const [v0, v1, v2] of tris) {
        const m01 = mid(v0, v1);
        const m12 = mid(v1, v2);
        const m20 = mid(v2, v0);
        next.push([v0, m01, m20], [v1, m12, m01], [v2, m20, m12], [m01, m12, m20]);
      }
      tris = next;
    }

    const positions = [];
    const normals = [];
    const uvs = [];
    for (const tri of tris) {
      const pts = tri.map((v) => {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
        return [(v[0] / len) * radius, (v[1] / len) * radius, (v[2] / len) * radius];
      });
      const ax = pts[1][0] - pts[0][0], ay = pts[1][1] - pts[0][1], az = pts[1][2] - pts[0][2];
      const bx = pts[2][0] - pts[0][0], by = pts[2][1] - pts[0][1], bz = pts[2][2] - pts[0][2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= nLen; ny /= nLen; nz /= nLen;

      for (const p of pts) {
        positions.push(p[0], p[1], p[2]);
        normals.push(nx, ny, nz);
        uvs.push(0.5, 0.5);
      }
    }
    return buildGeometryFromArrays(positions, normals, uvs, null);
  }

  B.OctahedronGeometry = function (radius = 1, detail = 0) {
    const v = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];
    const ind = [
      0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2,
      1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2
    ];
    return createPolyhedronGeometry(v, ind, radius, detail);
  };

  B.IcosahedronGeometry = function (radius = 1, detail = 0) {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [
      -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
      0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
      t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1
    ];
    const ind = [
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
      1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
      4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1
    ];
    return createPolyhedronGeometry(v, ind, radius, detail);
  };

  B.DodecahedronGeometry = function (radius = 1, detail = 0) {
    const t = (1 + Math.sqrt(5)) / 2;
    const r = 1 / t;
    const v = [
      -1, -1, -1, -1, -1, 1, -1, 1, -1, -1, 1, 1,
      1, -1, -1, 1, -1, 1, 1, 1, -1, 1, 1, 1,
      0, -r, -t, 0, -r, t, 0, r, -t, 0, r, t,
      -r, -t, 0, -r, t, 0, r, -t, 0, r, t, 0,
      -t, 0, -r, t, 0, -r, -t, 0, r, t, 0, r
    ];
    const ind = [
      3, 11, 7, 3, 7, 15, 3, 15, 13, 7, 19, 17, 7, 17, 6, 7, 6, 15,
      17, 4, 8, 17, 8, 10, 17, 10, 6, 8, 0, 16, 8, 16, 2, 8, 2, 10,
      0, 12, 1, 0, 1, 18, 0, 18, 16, 6, 10, 2, 6, 2, 13, 6, 13, 15,
      2, 16, 18, 2, 18, 3, 2, 3, 13, 18, 1, 9, 18, 9, 11, 18, 11, 3,
      4, 14, 12, 4, 12, 0, 4, 0, 8, 11, 9, 5, 11, 5, 19, 11, 19, 7,
      19, 5, 14, 19, 14, 4, 19, 4, 17, 1, 12, 14, 1, 14, 5, 1, 5, 9
    ];
    return createPolyhedronGeometry(v, ind, radius, detail);
  };

  class BabylonShape {
    constructor() {
      this.points = [];
    }
    moveTo(x, y) {
      this.points.push([x, y]);
      return this;
    }
    lineTo(x, y) {
      this.points.push([x, y]);
      return this;
    }
    quadraticCurveTo(cpx, cpy, x, y) {
      const prev = this.points.length ? this.points[this.points.length - 1] : [0, 0];
      for (let i = 1; i <= 6; i++) {
        const t = i / 6;
        const mt = 1 - t;
        this.points.push([
          mt * mt * prev[0] + 2 * mt * t * cpx + t * t * x,
          mt * mt * prev[1] + 2 * mt * t * cpy + t * t * y
        ]);
      }
      return this;
    }
    closePath() {
      return this;
    }
  }
  B.Shape = BabylonShape;

  B.ExtrudeGeometry = function createExtrudeGeometry(shape, options = {}) {
    const pts = shape && shape.points && shape.points.length >= 3 ? shape.points : [[-0.2, -0.1], [0.2, -0.1], [0, 0.2]];
    const depth = options.depth !== undefined ? options.depth : 0.2;
    const positions = [];
    const normals = [];
    const uvs = [];
    const n = pts.length;

    let cx = 0, cy = 0;
    for (const p of pts) {
      cx += p[0];
      cy += p[1];
    }
    cx /= n;
    cy /= n;

    for (let i = 0; i < n; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % n];
      positions.push(cx, cy, depth, p0[0], p0[1], depth, p1[0], p1[1], depth);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
      uvs.push(0.5, 0.5, 0, 0, 1, 0);

      positions.push(cx, cy, 0, p1[0], p1[1], 0, p0[0], p0[1], 0);
      normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
      uvs.push(0.5, 0.5, 1, 0, 0, 0);

      const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dy / len, ny = -dx / len;
      positions.push(
        p0[0], p0[1], 0,
        p1[0], p1[1], 0,
        p1[0], p1[1], depth,
        p0[0], p0[1], 0,
        p1[0], p1[1], depth,
        p0[0], p0[1], depth
      );
      for (let k = 0; k < 6; k++) {
        normals.push(nx, ny, 0);
        uvs.push(0.5, 0.5);
      }
    }
    return buildGeometryFromArrays(positions, normals, uvs, null);
  };

  B.EdgesGeometry = function createEdgesGeometry(sourceGeo) {
    const nonIdx = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo;
    const srcPos = nonIdx.attributes.position.array;
    const edgePos = [];
    for (let i = 0; i < srcPos.length; i += 9) {
      const x0 = srcPos[i], y0 = srcPos[i + 1], z0 = srcPos[i + 2];
      const x1 = srcPos[i + 3], y1 = srcPos[i + 4], z1 = srcPos[i + 5];
      const x2 = srcPos[i + 6], y2 = srcPos[i + 7], z2 = srcPos[i + 8];
      edgePos.push(x0, y0, z0, x1, y1, z1, x1, y1, z1, x2, y2, z2, x2, y2, z2, x0, y0, z0);
    }
    const geo = new BabylonBufferGeometry();
    geo.setAttribute('position', new BabylonBufferAttribute(new Float32Array(edgePos), 3));
    return geo;
  };

  /* ---------- 3. Материалы Babylon.js (StandardMaterial с реактивными свойствами) ---------- */

  let _matIdCounter = 1;

  function createBabylonGameMaterial(opts = {}, isUnlit = false, extraKind = '') {
    const mat = new NativeStandardMaterial('bjsMat_' + (_matIdCounter++), scene);
    mat._isUnlit = Boolean(isUnlit);
    mat.disableLighting = Boolean(isUnlit);
    mat.maxSimultaneousLights = 6;
    mat.backFaceCulling = false;
    mat.twoSidedLighting = true;

    const baseColor = new B.Color(opts.color !== undefined ? opts.color : 0xffffff);
    const baseEmissive = new B.Color(opts.emissive !== undefined ? opts.emissive : 0x000000);
    let emissiveIntensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 1.0;
    let mapTex = opts.map || null;
    let emissiveMapTex = opts.emissiveMap || null;
    let bumpMapTex = opts.bumpMap || null;
    let matRotation = opts.rotation || 0;

    function syncMaterialColors() {
      if (mat._isUnlit) {
        mat.diffuseColor.set(baseColor.r, baseColor.g, baseColor.b);
        mat.ambientColor.set(baseColor.r, baseColor.g, baseColor.b);
        mat.emissiveColor.set(baseColor.r, baseColor.g, baseColor.b);
      } else {
        mat.diffuseColor.set(baseColor.r, baseColor.g, baseColor.b);
        mat.ambientColor.set(baseColor.r * 0.22, baseColor.g * 0.22, baseColor.b * 0.25);
        const ei = emissiveIntensity * 0.55;
        mat.emissiveColor.set(
          Math.min(1.6, baseEmissive.r * ei),
          Math.min(1.6, baseEmissive.g * ei),
          Math.min(1.6, baseEmissive.b * ei)
        );
      }
    }

    baseColor._onChange = syncMaterialColors;
    baseEmissive._onChange = syncMaterialColors;

    if (opts.roughness !== undefined) {
      mat.roughness = opts.roughness;
      const spec = Math.max(0.04, (1 - opts.roughness) * 0.35);
      mat.specularColor.set(spec, spec, spec);
      mat.specularPower = Math.max(8, (1 - opts.roughness) * 64);
    }
    if (opts.opacity !== undefined) {
      mat.alpha = opts.opacity;
    }
    if (opts.blending === B.AdditiveBlending) {
      mat.alphaMode = B.Engine.ALPHA_ADD;
      mat.disableDepthWrite = true;
    }
    if (opts.depthWrite === false) {
      mat.disableDepthWrite = true;
    }
    if (opts.wireframe) {
      mat.wireframe = true;
    }
    if (mapTex) {
      mat.diffuseTexture = mapTex;
      if (opts.transparent || opts.blending === B.AdditiveBlending || extraKind === 'sprite') {
        mapTex.hasAlpha = true;
        mat.useAlphaFromDiffuseTexture = true;
      }
    }
    if (emissiveMapTex) {
      mat.emissiveTexture = emissiveMapTex;
    }
    if (bumpMapTex) {
      mat.bumpTexture = bumpMapTex;
      if (opts.bumpScale !== undefined) {
        bumpMapTex.level = opts.bumpScale;
      }
    }
    if (extraKind === 'sprite') {
      mat.isSpriteMaterial = true;
      mat.disableDepthWrite = true;
    } else if (extraKind === 'points') {
      mat.pointsCloud = true;
      mat.pointSize = (opts.size || 0.35) * 8.0;
      mat.disableDepthWrite = true;
    } else if (extraKind === 'line') {
      mat.fillMode = B.Material.LineStripDrawMode;
      mat.disableDepthWrite = true;
    }

    syncMaterialColors();

    Object.defineProperty(mat, 'color', {
      get: () => baseColor,
      set: (c) => {
        baseColor.copy(c);
      },
      configurable: true
    });
    Object.defineProperty(mat, 'emissive', {
      get: () => baseEmissive,
      set: (c) => {
        baseEmissive.copy(c);
      },
      configurable: true
    });
    Object.defineProperty(mat, 'emissiveIntensity', {
      get: () => emissiveIntensity,
      set: (v) => {
        emissiveIntensity = v;
        syncMaterialColors();
      },
      configurable: true
    });
    Object.defineProperty(mat, 'opacity', {
      get: () => mat.alpha,
      set: (v) => {
        mat.alpha = v;
      },
      configurable: true
    });
    Object.defineProperty(mat, 'map', {
      get: () => mapTex,
      set: (t) => {
        mapTex = t;
        mat.diffuseTexture = t;
        if (t && (opts.transparent || opts.blending === B.AdditiveBlending || extraKind === 'sprite')) {
          t.hasAlpha = true;
          mat.useAlphaFromDiffuseTexture = true;
        }
      },
      configurable: true
    });
    Object.defineProperty(mat, 'rotation', {
      get: () => matRotation,
      set: (v) => {
        matRotation = v;
        if (mapTex) mapTex.wAng = v;
      },
      configurable: true
    });
    Object.defineProperty(mat, 'size', {
      get: () => (mat.pointSize || 3) / 8.0,
      set: (v) => {
        mat.pointSize = (v || 0.35) * 8.0;
      },
      configurable: true
    });
    mat.vertexColors = Boolean(opts.vertexColors);
    mat.needsUpdate = false;

    return mat;
  }

  B.MeshStandardMaterial = function (opts) {
    return createBabylonGameMaterial(opts, false, 'standard');
  };
  B.MeshBasicMaterial = function (opts) {
    return createBabylonGameMaterial(opts, true, 'basic');
  };
  B.SpriteMaterial = function (opts) {
    return createBabylonGameMaterial(opts, true, 'sprite');
  };
  B.PointsMaterial = function (opts) {
    return createBabylonGameMaterial(opts, true, 'points');
  };
  B.LineBasicMaterial = function (opts) {
    return createBabylonGameMaterial(opts, true, 'line');
  };

  /* ---------- 4. Конструкторы узлов сцены: Group, Mesh, InstancedMesh, Sprite, Points, Line ---------- */

  let _nodeIdCounter = 1;

  function BabylonGroup() {
    const node = new NativeTransformNode('group_' + (_nodeIdCounter++), scene);
    node._visibleFlag = true;
    node.setEnabled(false);
    return node;
  }
  B.Group = BabylonGroup;
  B.Object3D = BabylonGroup;

  const _emptyFallbackGeo = new BabylonBufferGeometry();
  _emptyFallbackGeo.setAttribute('position', new BabylonBufferAttribute(new Float32Array(0), 3));
  _emptyFallbackGeo.setAttribute('normal', new BabylonBufferAttribute(new Float32Array(0), 3));
  _emptyFallbackGeo.setAttribute('uv', new BabylonBufferAttribute(new Float32Array(0), 2));
  _emptyFallbackGeo.setIndex(new Uint16Array(0));

  function BabylonMeshConstructor(arg0, arg1) {
    if (typeof arg0 === 'string') {
      const validScene = (arg1 && typeof arg1.getUniqueId === 'function') ? arg1 : scene;
      return new NativeMesh(arg0, validScene);
    }
    const geometry = (arg0 && arg0._isGeometry) ? arg0 : _emptyFallbackGeo;
    const material = (arg1 && typeof arg1.getUniqueId === 'function') ? null : arg1;
    const mesh = new NativeMesh('mesh_' + (_nodeIdCounter++), scene);
    mesh._visibleFlag = true;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    mesh.geometry = geometry;
    mesh.material = material;

    const vd = geometry.toBabylonVertexData();
    const isUpdatable = Boolean(geometry._isUpdatable);
    vd.applyToMesh(mesh, isUpdatable);
    if (geometry.attributes.color || (material && material.vertexColors)) {
      mesh.useVertexColors = true;
    }
    geometry._meshes.push(mesh);
    return mesh;
  }
  BabylonMeshConstructor.prototype = NativeMesh.prototype;
  Object.assign(BabylonMeshConstructor, NativeMesh);
  B.Mesh = BabylonMeshConstructor;

  // Инстансинг на базе Babylon.js Thin Instances
  B.InstancedMesh = function createBabylonInstancedMesh(geometry, material, maxCount) {
    const cap = Math.max(1, maxCount | 0);
    const mesh = new BabylonMeshConstructor(geometry, material);
    mesh._isThinInstanced = true;
    mesh._maxInstances = cap;
    mesh._instanceCount = cap;
    mesh.alwaysSelectAsActiveMesh = true;

    const matBuf = new Float32Array(cap * 16);
    const colBuf = new Float32Array(cap * 4);
    colBuf.fill(1.0);

    mesh._matrixBuffer = matBuf;
    mesh._colorBuffer = colBuf;
    mesh._hasThinColors = false;
    mesh.thinInstanceSetBuffer('matrix', matBuf, 16, false);
    mesh.thinInstanceCount = cap;

    mesh.setMatrixAt = function (index, matrix) {
      if (index < 0 || index >= cap) return;
      const e = matrix.m || matrix.elements;
      matBuf.set(e, index * 16);
    };
    mesh.setColorAt = function (index, color) {
      if (index < 0 || index >= cap || !color) return;
      if (!mesh._hasThinColors) {
        mesh._hasThinColors = true;
        mesh.thinInstanceSetBuffer('color', colBuf, 4, false);
      }
      const off = index * 4;
      colBuf[off] = color.r;
      colBuf[off + 1] = color.g;
      colBuf[off + 2] = color.b;
      colBuf[off + 3] = 1.0;
    };

    Object.defineProperty(mesh, 'count', {
      get() {
        return mesh._instanceCount;
      },
      set(val) {
        const c = Math.max(0, Math.min(cap, val | 0));
        mesh._instanceCount = c;
        mesh.thinInstanceCount = c;
        mesh.isVisible = c > 0 && mesh._visibleFlag !== false;
      },
      configurable: true
    });

    mesh.instanceMatrix = {
      get needsUpdate() {
        return false;
      },
      set needsUpdate(v) {
        if (v) mesh.thinInstanceBufferUpdated('matrix');
      }
    };
    mesh.instanceColor = {
      get needsUpdate() {
        return false;
      },
      set needsUpdate(v) {
        if (v && mesh._hasThinColors) mesh.thinInstanceBufferUpdated('color');
      }
    };

    return mesh;
  };

  // Биллборд-спрайт как узел графа сцены Babylon.js (Mesh с BILLBOARDMODE_ALL)
  const _sharedSpriteQuadGeo = B.PlaneGeometry(1, 1, 1, 1);
  B.Sprite = function createBabylonBillboardSprite(material) {
    const mesh = new BabylonMeshConstructor(_sharedSpriteQuadGeo, material);
    mesh.billboardMode = NativeMesh.BILLBOARDMODE_ALL;
    mesh.isSprite = true;
    mesh.renderingGroupId = 0;
    return mesh;
  };

  B.Points = function createBabylonPointsCloud(geometry, material) {
    geometry._isUpdatable = true;
    if (material) material.pointsCloud = true;
    const mesh = new BabylonMeshConstructor(geometry, material);
    mesh.alwaysSelectAsActiveMesh = true;
    return mesh;
  };

  B.Line = function createBabylonLineStrip(geometry, material) {
    geometry._isUpdatable = true;
    if (material) material.fillMode = B.Material.LineStripDrawMode;
    const mesh = new BabylonMeshConstructor(geometry, material);
    mesh.alwaysSelectAsActiveMesh = true;
    return mesh;
  };

  B.LineSegments = function createBabylonLineSegments(geometry, material) {
    if (material) material.fillMode = B.Material.LineListDrawMode;
    return new BabylonMeshConstructor(geometry, material);
  };
})();

/* ---------- 5. Утилиты работы с 3D-геометрией, слиянием мешей и подкраской ---------- */

const _tempMatrix4 = new BABYLON.Matrix4();
const _tempTransformObj = new BABYLON.Object3D();

/**
 * Слегка смещает вершины геометрии для эффекта «колотого камня» и пересчитывает нормали.
 * @param {BABYLON.BufferGeometry} geometry
 * @param {number} amount
 * @returns {BABYLON.BufferGeometry}
 */
function jitterGeometry(geometry, amount) {
  const geom = geometry.index ? geometry.toNonIndexed() : geometry;
  const posAttr = geom.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setXYZ(
      i,
      posAttr.getX(i) + (Math.random() - 0.5) * amount,
      posAttr.getY(i) + (Math.random() - 0.5) * amount,
      posAttr.getZ(i) + (Math.random() - 0.5) * amount
    );
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Вычисляет матрицу трансформации по позиции, углам Эйлера и масштабу.
 */
function computeTransformMatrix(x, y, z, rx, ry, rz, sx, sy, sz, outMatrix) {
  _tempTransformObj.position.set(x, y, z);
  _tempTransformObj.rotation.set(rx || 0, ry || 0, rz || 0);
  _tempTransformObj.scale.set(
    sx === undefined ? 1 : sx,
    sy === undefined ? 1 : sy,
    sz === undefined ? 1 : sz
  );
  _tempTransformObj.updateMatrix();
  const target = outMatrix || _tempMatrix4;
  target.copy(_tempTransformObj.matrix);
  return target;
}

/**
 * Сливает массив частей `{ geo, matrix, color? }` в единую BufferGeometry с вершинными цветами.
 * Позволяет сократить число draw calls на моба в 5–8 раз.
 * @param {Array<{geo: BABYLON.BufferGeometry, matrix: BABYLON.Matrix4, color?: BABYLON.Color}>} parts
 * @returns {BABYLON.BufferGeometry|null}
 */
function mergeGeometryParts(parts) {
  if (!parts || !parts.length) {
    const emptyGeo = new BABYLON.BufferGeometry();
    emptyGeo.setAttribute('position', new BABYLON.BufferAttribute(new Float32Array(0), 3));
    emptyGeo.setAttribute('normal', new BABYLON.BufferAttribute(new Float32Array(0), 3));
    emptyGeo.setAttribute('uv', new BABYLON.BufferAttribute(new Float32Array(0), 2));
    return emptyGeo;
  }

  let totalVertices = 0;
  const preparedParts = [];

  for (const part of parts) {
    if (!part || !part.geo || !part.geo.attributes || !part.geo.attributes.position) continue;
    const geom = part.geo.toNonIndexed();
    geom.applyMatrix4(part.matrix);
    preparedParts.push({ geom, color: part.color });
    totalVertices += geom.attributes.position.count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);
  const colors = new Float32Array(totalVertices * 3);
  let hasVertexColors = false;
  let vertexOffset = 0;

  for (const item of preparedParts) {
    const geom = item.geom;
    const count = geom.attributes.position.count;
    positions.set(geom.attributes.position.array.subarray(0, count * 3), vertexOffset * 3);
    if (geom.attributes.normal) {
      normals.set(geom.attributes.normal.array.subarray(0, count * 3), vertexOffset * 3);
    }
    if (geom.attributes.uv) {
      uvs.set(geom.attributes.uv.array.subarray(0, count * 2), vertexOffset * 2);
    }
    if (item.color) {
      hasVertexColors = true;
      for (let i = 0; i < count; i++) {
        colors[(vertexOffset + i) * 3] = item.color.r;
        colors[(vertexOffset + i) * 3 + 1] = item.color.g;
        colors[(vertexOffset + i) * 3 + 2] = item.color.b;
      }
    } else {
      for (let i = 0; i < count; i++) {
        colors[(vertexOffset + i) * 3] = 1;
        colors[(vertexOffset + i) * 3 + 1] = 1;
        colors[(vertexOffset + i) * 3 + 2] = 1;
      }
    }
    vertexOffset += count;
  }

  const mergedGeometry = new BABYLON.BufferGeometry();
  mergedGeometry.setAttribute('position', new BABYLON.BufferAttribute(positions, 3));
  mergedGeometry.setAttribute('normal', new BABYLON.BufferAttribute(normals, 3));
  mergedGeometry.setAttribute('uv', new BABYLON.BufferAttribute(uvs, 2));
  if (hasVertexColors) {
    mergedGeometry.setAttribute('color', new BABYLON.BufferAttribute(colors, 3));
  }
  return mergedGeometry;
}

/**
 * Сохраняет исходные параметры эмиссии материала для быстрой подкраски ожога/холода.
 * @param {BABYLON.StandardMaterial} material
 */
function createTintEntry(material) {
  return {
    material,
    baseEmissiveHex: material.emissive ? material.emissive.getHex() : 0,
    baseIntensity: material.emissiveIntensity !== undefined ? material.emissiveIntensity : 1
  };
}

/**
 * Создаёт аддитивный светящийся биллборд-спрайт Babylon.js.
 * @param {BABYLON.DynamicTexture} texture
 * @param {number} scale
 * @returns {BABYLON.Mesh}
 */
function createGlowSprite(texture, scale) {
  const material = new BABYLON.SpriteMaterial({
    map: texture,
    blending: BABYLON.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.5
  });
  const sprite = new BABYLON.Sprite(material);
  sprite.scale.setScalar(scale);
  return sprite;
}

/**
 * Применяет подкраску статуса к материалам моба (только при смене состояния):
 * 0 — нормальное состояние, 1 — замедление льдом, 2 — горение.
 */
function applyStatusTint(tintEntries, tintState) {
  for (const entry of tintEntries) {
    if (tintState === 2) {
      entry.material.emissive.setHex(0xff4400);
      entry.material.emissiveIntensity = entry.baseIntensity + 0.5;
    } else if (tintState === 1) {
      entry.material.emissive.setHex(0x0088ff);
      entry.material.emissiveIntensity = entry.baseIntensity + 0.3;
    } else {
      entry.material.emissive.setHex(entry.baseEmissiveHex);
      entry.material.emissiveIntensity = entry.baseIntensity;
    }
  }
}

/**
 * Перекрашивает материалы босса под цветовую палитру текущей башни (Пепельная / Ледяная / Пустоты).
 * @param {BABYLON.TransformNode} bossMesh
 * @param {string} towerId
 */
function tintBossMaterials(bossMesh, towerId) {
  const hslOffset = TOWER_BOSS_TINTS[towerId] || [0, 0, 0];
  bossMesh.traverse((node) => {
    const rawMaterial = node.material;
    if (!rawMaterial) return;
    const materials = Array.isArray(rawMaterial) ? rawMaterial : [rawMaterial];
    for (const mat of materials) {
      if (mat.isSpriteMaterial) continue;
      if (!mat.userData) mat.userData = {};
      if (mat.userData.appliedTowerId === towerId) continue;
      if (!mat.userData.originalColors) {
        mat.userData.originalColors = {
          colorHex: mat.color ? mat.color.getHex() : null,
          emissiveHex: mat.emissive ? mat.emissive.getHex() : null
        };
      }
      if (mat.userData.originalColors.colorHex !== null) {
        mat.color
          .setHex(mat.userData.originalColors.colorHex)
          .offsetHSL(hslOffset[0], hslOffset[1], hslOffset[2]);
      }
      if (mat.userData.originalColors.emissiveHex !== null) {
        mat.emissive
          .setHex(mat.userData.originalColors.emissiveHex)
          .offsetHSL(hslOffset[0], hslOffset[1], hslOffset[2]);
      }
      mat.userData.appliedTowerId = towerId;
    }
  });

  const userData = bossMesh.userData;
  if (userData && userData.tintMats) {
    for (const entry of userData.tintMats) {
      if (entry.material.emissive) {
        entry.baseEmissiveHex = entry.material.emissive.getHex();
      }
    }
  }
}
