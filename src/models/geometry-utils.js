/* ==========================================================================
   Утилиты работы с 3D-геометрией и материалами:
   случайное смещение вершин, слияние деталей в единый BufferGeometry,
   подкраска статусов (ожог / замедление) и тонирование боссов под тему башни
   ========================================================================== */

const _tempMatrix4 = new THREE.Matrix4();
const _tempTransformObj = new THREE.Object3D();

/**
 * Слегка смещает вершины геометрии для эффекта «колотого камня» и пересчитывает нормали.
 * @param {THREE.BufferGeometry} geometry
 * @param {number} amount
 * @returns {THREE.BufferGeometry}
 */
function jitterGeometry(geometry, amount) {
  const posAttr = geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setXYZ(
      i,
      posAttr.getX(i) + (Math.random() - 0.5) * amount,
      posAttr.getY(i) + (Math.random() - 0.5) * amount,
      posAttr.getZ(i) + (Math.random() - 0.5) * amount
    );
  }
  geometry.computeVertexNormals();
  return geometry;
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
 * @param {Array<{geo: THREE.BufferGeometry, matrix: THREE.Matrix4, color?: THREE.Color}>} parts
 * @returns {THREE.BufferGeometry|null}
 */
function mergeGeometryParts(parts) {
  if (!parts.length) return null;

  let totalVertices = 0;
  const preparedParts = [];

  for (const part of parts) {
    const geom = part.geo.index ? part.geo.toNonIndexed() : part.geo;
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

  const mergedGeometry = new THREE.BufferGeometry();
  mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (hasVertexColors) {
    mergedGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  return mergedGeometry;
}

/**
 * Сохраняет исходные параметры эмиссии материала для быстрой подкраски ожога/холода.
 * @param {THREE.Material} material
 */
function createTintEntry(material) {
  return {
    material,
    baseEmissiveHex: material.emissive ? material.emissive.getHex() : 0,
    baseIntensity: material.emissiveIntensity !== undefined ? material.emissiveIntensity : 1
  };
}

/**
 * Создаёт аддитивный светящийся спрайт (замена динамическим PointLight на мобах).
 * @param {THREE.Texture} texture
 * @param {number} scale
 * @returns {THREE.Sprite}
 */
function createGlowSprite(texture, scale) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.5
  });
  const sprite = new THREE.Sprite(material);
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
 * @param {THREE.Object3D} bossMesh
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
