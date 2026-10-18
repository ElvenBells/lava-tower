/* ==========================================================================
   Инициализация Three.js сцены, камеры, рендерера, освещения и пост-обработки
   (EffectComposer + UnrealBloomPass + HeatDistortion / ColdColorGrade / RGBShift)
   ========================================================================== */

// Встраиваем классы пост-обработки Three.js r128 (EffectComposer, RenderPass, ShaderPass, UnrealBloomPass),
// чтобы игра работала полностью автономно без внешних сетевых зависимостей
(function registerThreePostProcessing() {
  if (typeof THREE === 'undefined') return;

  if (!THREE.CopyShader) {
    THREE.CopyShader = {
      uniforms: {
        tDiffuse: { value: null },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          gl_FragColor = opacity * texel;
        }
      `
    };
  }

  if (!THREE.LuminosityHighPassShader) {
    THREE.LuminosityHighPassShader = {
      shaderID: 'luminosityHighPass',
      uniforms: {
        tDiffuse: { value: null },
        luminosityThreshold: { value: 1.0 },
        smoothWidth: { value: 1.0 },
        defaultColor: { value: new THREE.Color(0x000000) },
        defaultOpacity: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec3 defaultColor;
        uniform float defaultOpacity;
        uniform float luminosityThreshold;
        uniform float smoothWidth;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec3 luma = vec3(0.299, 0.587, 0.114);
          float v = dot(texel.xyz, luma);
          vec4 outputColor = vec4(defaultColor.rgb, defaultOpacity);
          float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
          gl_FragColor = mix(outputColor, texel, alpha);
        }
      `
    };
  }

  if (!THREE.Pass) {
    THREE.Pass = function () {
      this.enabled = true;
      this.needsSwap = true;
      this.clear = false;
      this.renderToScreen = false;
    };
    Object.assign(THREE.Pass.prototype, {
      setSize: function () {},
      render: function () {}
    });

    const fsQuadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fsQuadGeo = new THREE.PlaneGeometry(2, 2);
    THREE.Pass.FullScreenQuad = function (material) {
      this._mesh = new THREE.Mesh(fsQuadGeo, material);
    };
    Object.defineProperty(THREE.Pass.FullScreenQuad.prototype, 'material', {
      get: function () {
        return this._mesh.material;
      },
      set: function (value) {
        this._mesh.material = value;
      }
    });
    Object.assign(THREE.Pass.FullScreenQuad.prototype, {
      dispose: function () {
        this._mesh.geometry.dispose();
      },
      render: function (renderer) {
        renderer.render(this._mesh, fsQuadCamera);
      }
    });
  }

  if (!THREE.ShaderPass) {
    THREE.ShaderPass = function (shader, textureID) {
      THREE.Pass.call(this);
      this.textureID = textureID !== undefined ? textureID : 'tDiffuse';
      if (shader instanceof THREE.ShaderMaterial) {
        this.uniforms = shader.uniforms;
        this.material = shader;
      } else if (shader) {
        this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        this.material = new THREE.ShaderMaterial({
          defines: Object.assign({}, shader.defines),
          uniforms: this.uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader
        });
      }
      this.fsQuad = new THREE.Pass.FullScreenQuad(this.material);
    };
    THREE.ShaderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
      constructor: THREE.ShaderPass,
      render: function (renderer, writeBuffer, readBuffer) {
        if (this.uniforms[this.textureID]) {
          this.uniforms[this.textureID].value = readBuffer.texture;
        }
        this.fsQuad.material = this.material;
        if (this.renderToScreen) {
          renderer.setRenderTarget(null);
          this.fsQuad.render(renderer);
        } else {
          renderer.setRenderTarget(writeBuffer);
          if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
          this.fsQuad.render(renderer);
        }
      }
    });
  }

  if (!THREE.RenderPass) {
    THREE.RenderPass = function (scene, camera, overrideMaterial, clearColor, clearAlpha) {
      THREE.Pass.call(this);
      this.scene = scene;
      this.camera = camera;
      this.overrideMaterial = overrideMaterial;
      this.clearColor = clearColor;
      this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
      this.clear = true;
      this.clearDepth = false;
      this.needsSwap = false;
      this._oldClearColor = new THREE.Color();
    };
    THREE.RenderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
      constructor: THREE.RenderPass,
      render: function (renderer, writeBuffer, readBuffer) {
        const oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        let oldClearAlpha;
        let oldOverrideMaterial;
        if (this.overrideMaterial !== undefined) {
          oldOverrideMaterial = this.scene.overrideMaterial;
          this.scene.overrideMaterial = this.overrideMaterial;
        }
        if (this.clearColor) {
          renderer.getClearColor(this._oldClearColor);
          oldClearAlpha = renderer.getClearAlpha();
          renderer.setClearColor(this.clearColor, this.clearAlpha);
        }
        if (this.clearDepth) {
          renderer.clearDepth();
        }
        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        if (this.clear) {
          renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
        }
        renderer.render(this.scene, this.camera);
        if (this.clearColor) {
          renderer.setClearColor(this._oldClearColor, oldClearAlpha);
        }
        if (this.overrideMaterial !== undefined) {
          this.scene.overrideMaterial = oldOverrideMaterial;
        }
        renderer.autoClear = oldAutoClear;
      }
    });
  }

  if (!THREE.EffectComposer) {
    THREE.EffectComposer = function (renderer, renderTarget) {
      this.renderer = renderer;
      if (renderTarget === undefined) {
        const parameters = {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat
        };
        const size = renderer.getSize(new THREE.Vector2());
        this._pixelRatio = renderer.getPixelRatio();
        this._width = size.width;
        this._height = size.height;
        renderTarget = new THREE.WebGLRenderTarget(
          this._width * this._pixelRatio,
          this._height * this._pixelRatio,
          parameters
        );
      } else {
        this._pixelRatio = 1;
        this._width = renderTarget.width;
        this._height = renderTarget.height;
      }
      this.renderTarget1 = renderTarget;
      this.renderTarget2 = renderTarget.clone();
      this.writeBuffer = this.renderTarget1;
      this.readBuffer = this.renderTarget2;
      this.renderToScreen = true;
      this.passes = [];
      this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
      this.clock = new THREE.Clock();
    };
    Object.assign(THREE.EffectComposer.prototype, {
      swapBuffers: function () {
        const tmp = this.readBuffer;
        this.readBuffer = this.writeBuffer;
        this.writeBuffer = tmp;
      },
      addPass: function (pass) {
        this.passes.push(pass);
        pass.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
      },
      isLastEnabledPass: function (passIndex) {
        for (let i = passIndex + 1; i < this.passes.length; i++) {
          if (this.passes[i].enabled) return false;
        }
        return true;
      },
      render: function (deltaTime) {
        if (deltaTime === undefined) {
          deltaTime = this.clock.getDelta();
        }
        const currentRenderTarget = this.renderer.getRenderTarget();
        for (let i = 0, il = this.passes.length; i < il; i++) {
          const pass = this.passes[i];
          if (pass.enabled === false) continue;
          pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass(i);
          pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, false);
          if (pass.needsSwap) {
            this.swapBuffers();
          }
        }
        this.renderer.setRenderTarget(currentRenderTarget);
      },
      setSize: function (width, height) {
        this._width = width;
        this._height = height;
        const effectiveWidth = this._width * this._pixelRatio;
        const effectiveHeight = this._height * this._pixelRatio;
        this.renderTarget1.setSize(effectiveWidth, effectiveHeight);
        this.renderTarget2.setSize(effectiveWidth, effectiveHeight);
        for (let i = 0; i < this.passes.length; i++) {
          this.passes[i].setSize(effectiveWidth, effectiveHeight);
        }
      },
      setPixelRatio: function (pixelRatio) {
        this._pixelRatio = pixelRatio;
        this.setSize(this._width, this._height);
      }
    });
  }

  if (!THREE.UnrealBloomPass) {
    THREE.UnrealBloomPass = function (resolution, strength, radius, threshold) {
      THREE.Pass.call(this);
      this.strength = strength !== undefined ? strength : 1;
      this.radius = radius;
      this.threshold = threshold;
      this.resolution =
        resolution !== undefined
          ? new THREE.Vector2(resolution.x, resolution.y)
          : new THREE.Vector2(256, 256);
      this.clearColor = new THREE.Color(0, 0, 0);

      const pars = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      };
      this.renderTargetsHorizontal = [];
      this.renderTargetsVertical = [];
      this.nMips = 5;
      let resx = Math.round(this.resolution.x / 2);
      let resy = Math.round(this.resolution.y / 2);

      this.renderTargetBright = new THREE.WebGLRenderTarget(resx, resy, pars);
      this.renderTargetBright.texture.generateMipmaps = false;

      for (let i = 0; i < this.nMips; i++) {
        const rtH = new THREE.WebGLRenderTarget(resx, resy, pars);
        rtH.texture.generateMipmaps = false;
        this.renderTargetsHorizontal.push(rtH);

        const rtV = new THREE.WebGLRenderTarget(resx, resy, pars);
        rtV.texture.generateMipmaps = false;
        this.renderTargetsVertical.push(rtV);

        resx = Math.max(2, Math.round(resx / 2));
        resy = Math.max(2, Math.round(resy / 2));
      }

      const highPassShader = THREE.LuminosityHighPassShader;
      this.highPassUniforms = THREE.UniformsUtils.clone(highPassShader.uniforms);
      this.highPassUniforms.luminosityThreshold.value = threshold;
      this.highPassUniforms.smoothWidth.value = 0.01;

      this.materialHighPassFilter = new THREE.ShaderMaterial({
        uniforms: this.highPassUniforms,
        vertexShader: highPassShader.vertexShader,
        fragmentShader: highPassShader.fragmentShader,
        defines: {}
      });

      this.gaussianBlurMaterials = [];
      const kernelSizeArray = [3, 5, 7, 9, 11];
      resx = Math.round(this.resolution.x / 2);
      resy = Math.round(this.resolution.y / 2);
      for (let i = 0; i < this.nMips; i++) {
        this.gaussianBlurMaterials.push(this.getSeperableBlurMaterial(kernelSizeArray[i]));
        this.gaussianBlurMaterials[i].uniforms.texSize.value = new THREE.Vector2(resx, resy);
        resx = Math.max(2, Math.round(resx / 2));
        resy = Math.max(2, Math.round(resy / 2));
      }

      this.compositeMaterial = this.getCompositeMaterial(this.nMips);
      this.compositeMaterial.uniforms.blurTexture1.value = this.renderTargetsVertical[0].texture;
      this.compositeMaterial.uniforms.blurTexture2.value = this.renderTargetsVertical[1].texture;
      this.compositeMaterial.uniforms.blurTexture3.value = this.renderTargetsVertical[2].texture;
      this.compositeMaterial.uniforms.blurTexture4.value = this.renderTargetsVertical[3].texture;
      this.compositeMaterial.uniforms.blurTexture5.value = this.renderTargetsVertical[4].texture;
      this.compositeMaterial.uniforms.bloomStrength.value = strength;
      this.compositeMaterial.uniforms.bloomRadius.value = 0.1;

      this.bloomTintColors = [
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, 1, 1)
      ];
      this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors;

      const copyShader = THREE.CopyShader;
      this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
      this.copyUniforms.opacity.value = 1.0;
      this.materialCopy = new THREE.ShaderMaterial({
        uniforms: this.copyUniforms,
        vertexShader: copyShader.vertexShader,
        fragmentShader: copyShader.fragmentShader,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        transparent: true
      });

      this.enabled = true;
      this.needsSwap = false;
      this._oldClearColor = new THREE.Color();
      this.oldClearAlpha = 1;
      this.basic = new THREE.MeshBasicMaterial();
      this.fsQuad = new THREE.Pass.FullScreenQuad(null);
    };

    THREE.UnrealBloomPass.BlurDirectionX = new THREE.Vector2(1.0, 0.0);
    THREE.UnrealBloomPass.BlurDirectionY = new THREE.Vector2(0.0, 1.0);

    THREE.UnrealBloomPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
      constructor: THREE.UnrealBloomPass,
      setSize: function (width, height) {
        let resx = Math.max(2, Math.round(width / 2));
        let resy = Math.max(2, Math.round(height / 2));
        this.renderTargetBright.setSize(resx, resy);
        for (let i = 0; i < this.nMips; i++) {
          this.renderTargetsHorizontal[i].setSize(resx, resy);
          this.renderTargetsVertical[i].setSize(resx, resy);
          this.gaussianBlurMaterials[i].uniforms.texSize.value = new THREE.Vector2(resx, resy);
          resx = Math.max(2, Math.round(resx / 2));
          resy = Math.max(2, Math.round(resy / 2));
        }
      },
      render: function (renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
        renderer.getClearColor(this._oldClearColor);
        this.oldClearAlpha = renderer.getClearAlpha();
        const oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.setClearColor(this.clearColor, 0);

        if (maskActive) renderer.state.buffers.stencil.setTest(false);

        if (this.renderToScreen) {
          this.fsQuad.material = this.basic;
          this.basic.map = readBuffer.texture;
          renderer.setRenderTarget(null);
          renderer.clear();
          this.fsQuad.render(renderer);
        }

        if (this.strength > 0.001) {
          this.highPassUniforms.tDiffuse.value = readBuffer.texture;
          this.highPassUniforms.luminosityThreshold.value = this.threshold;
          this.fsQuad.material = this.materialHighPassFilter;
          renderer.setRenderTarget(this.renderTargetBright);
          renderer.clear();
          this.fsQuad.render(renderer);

          let inputRenderTarget = this.renderTargetBright;
          for (let i = 0; i < this.nMips; i++) {
            this.fsQuad.material = this.gaussianBlurMaterials[i];
            this.gaussianBlurMaterials[i].uniforms.colorTexture.value = inputRenderTarget.texture;
            this.gaussianBlurMaterials[i].uniforms.direction.value = THREE.UnrealBloomPass.BlurDirectionX;
            renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
            renderer.clear();
            this.fsQuad.render(renderer);

            this.gaussianBlurMaterials[i].uniforms.colorTexture.value =
              this.renderTargetsHorizontal[i].texture;
            this.gaussianBlurMaterials[i].uniforms.direction.value = THREE.UnrealBloomPass.BlurDirectionY;
            renderer.setRenderTarget(this.renderTargetsVertical[i]);
            renderer.clear();
            this.fsQuad.render(renderer);

            inputRenderTarget = this.renderTargetsVertical[i];
          }

          this.fsQuad.material = this.compositeMaterial;
          this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
          this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
          this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors;

          renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
          renderer.clear();
          this.fsQuad.render(renderer);

          this.fsQuad.material = this.materialCopy;
          this.copyUniforms.tDiffuse.value = this.renderTargetsHorizontal[0].texture;

          if (maskActive) renderer.state.buffers.stencil.setTest(true);

          if (this.renderToScreen) {
            renderer.setRenderTarget(null);
            this.fsQuad.render(renderer);
          } else {
            renderer.setRenderTarget(readBuffer);
            this.fsQuad.render(renderer);
          }
        }

        renderer.setClearColor(this._oldClearColor, this.oldClearAlpha);
        renderer.autoClear = oldAutoClear;
      },
      getSeperableBlurMaterial: function (kernelRadius) {
        return new THREE.ShaderMaterial({
          defines: {
            KERNEL_RADIUS: kernelRadius,
            SIGMA: kernelRadius
          },
          uniforms: {
            colorTexture: { value: null },
            texSize: { value: new THREE.Vector2(0.5, 0.5) },
            direction: { value: new THREE.Vector2(0.5, 0.5) }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            #include <common>
            varying vec2 vUv;
            uniform sampler2D colorTexture;
            uniform vec2 texSize;
            uniform vec2 direction;
            float gaussianPdf(in float x, in float sigma) {
              return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
            }
            void main() {
              vec2 invSize = 1.0 / texSize;
              float fSigma = float(SIGMA);
              float weightSum = gaussianPdf(0.0, fSigma);
              vec3 diffuseSum = texture2D(colorTexture, vUv).rgb * weightSum;
              for (int i = 1; i < KERNEL_RADIUS; i++) {
                float x = float(i);
                float w = gaussianPdf(x, fSigma);
                vec2 uvOffset = direction * invSize * x;
                vec3 sample1 = texture2D(colorTexture, vUv + uvOffset).rgb;
                vec3 sample2 = texture2D(colorTexture, vUv - uvOffset).rgb;
                diffuseSum += (sample1 + sample2) * w;
                weightSum += 2.0 * w;
              }
              gl_FragColor = vec4(diffuseSum / weightSum, 1.0);
            }
          `
        });
      },
      getCompositeMaterial: function (nMips) {
        return new THREE.ShaderMaterial({
          defines: {
            NUM_MIPS: nMips
          },
          uniforms: {
            blurTexture1: { value: null },
            blurTexture2: { value: null },
            blurTexture3: { value: null },
            blurTexture4: { value: null },
            blurTexture5: { value: null },
            bloomStrength: { value: 1.0 },
            bloomFactors: { value: [1.0, 0.8, 0.6, 0.4, 0.2] },
            bloomTintColors: { value: null },
            bloomRadius: { value: 0.0 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D blurTexture1;
            uniform sampler2D blurTexture2;
            uniform sampler2D blurTexture3;
            uniform sampler2D blurTexture4;
            uniform sampler2D blurTexture5;
            uniform float bloomStrength;
            uniform float bloomRadius;
            uniform float bloomFactors[NUM_MIPS];
            uniform vec3 bloomTintColors[NUM_MIPS];
            float lerpBloomFactor(const in float factor) {
              float mirrorFactor = 1.2 - factor;
              return mix(factor, mirrorFactor, bloomRadius);
            }
            void main() {
              gl_FragColor = bloomStrength * (
                lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
                lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
                lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
                lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
                lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv)
              );
            }
          `
        });
      }
    });
  }
})();

const canvas = document.createElement('canvas');
document.body.prepend(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 300);

let maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
let currentPixelRatio = maxPixelRatio;

renderer.setPixelRatio(currentPixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

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
  return new THREE.CanvasTexture(bgCanvas);
}

// Фон по умолчанию (Пепельная башня)
const defaultBackgroundTexture = createBackgroundGradientTexture('#140505', '#220707', '#3a0a06');
scene.background = defaultBackgroundTexture;
scene.fog = new THREE.FogExp2(0x220707, 0.0165);

// Постоянные источники света (число источников фиксировано — шейдеры не перекомпилируются)
const hemiLight = new THREE.HemisphereLight(0x525664, 0xd93800, 1.15);
hemiLight.position.set(0, 80, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0x8a92a6, 0.75);
dirLight.position.set(40, 90, 20);
scene.add(dirLight);

const lavaLight = new THREE.PointLight(0xff5a18, 2.5, 65, 1.6);
scene.add(lavaLight);

const rimLight = new THREE.PointLight(0xff4800, 1.2, 42, 1.6);
scene.add(rimLight);

// Свет босса всегда в сцене (intensity = 0 вне боя, чтобы не вызывать рекомпиляцию шейдеров)
const bossLight = new THREE.PointLight(0xff6a20, 0, 46, 2);
bossLight.position.set(0, -500, 0);
scene.add(bossLight);

/* ---------- Пост-обработка трёх башен (Bloom + HeatDistortion / ColdGrade / RGBShift) ---------- */

const TowerUnifiedPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uTowerMode: { value: 0 }, // 0 = Ash (HeatDistortion), 1 = Ice (ColdColorGrade), 2 = Void (RGBShift)
    uHeatStrength: { value: 0.039 },
    uColdTintStrength: { value: 0.22 },
    uRgbShiftAmount: { value: 0.0046 },
    uStormFactor: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform int uTowerMode;
    uniform float uHeatStrength;
    uniform float uColdTintStrength;
    uniform float uRgbShiftAmount;
    uniform float uStormFactor;
    varying vec2 vUv;

    void main() {
      if (uTowerMode == 0) {
        // ПЕПЕЛЬНАЯ БАШНЯ: Термическое искажение воздуха (из ash tower.html)
        float verticalMask = smoothstep(0.95, 0.05, vUv.y);
        float waveX = sin(vUv.y * 36.0 + uTime * 3.4) * cos(vUv.x * 24.0 + uTime * 2.1);
        float waveY = cos(vUv.x * 30.0 - uTime * 2.8) * sin(vUv.y * 26.0 + uTime * 1.9);

        vec2 offset = vec2(waveX, waveY) * (uHeatStrength * 0.12) * (0.45 + 0.55 * verticalMask);
        vec2 distortedUv = clamp(vUv + offset, 0.001, 0.999);
        vec4 texel = texture2D(tDiffuse, distortedUv);

        // Во время Пепельной бури добавляем горячую багрово-пепельную дымку по краям
        if (uStormFactor > 0.01) {
          float vig = length(vUv - 0.5) * 1.45;
          texel.rgb = mix(texel.rgb, vec3(0.28, 0.06, 0.02), clamp(vig * uStormFactor * 0.36, 0.0, 0.45));
        }
        gl_FragColor = texel;
      } else if (uTowerMode == 1) {
        // ЛЕДЯНАЯ БАШНЯ: Холодный цветокор + морозная дымка (из ice tower.html)
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 col = texel.rgb;
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 coldShadows = vec3(0.05, 0.13, 0.24);
        vec3 coldHighlights = vec3(0.82, 0.95, 1.00);
        vec3 graded = mix(coldShadows * (0.4 + luma), coldHighlights * luma * 1.15, smoothstep(0.05, 0.9, luma));

        col = mix(col, graded, uColdTintStrength + uStormFactor * 0.16);
        col.b = min(1.0, col.b * 1.06 + 0.015);
        col.g = min(1.0, col.g * 1.02);

        if (uStormFactor > 0.01) {
          float vig = smoothstep(0.22, 0.82, length(vUv - 0.5));
          col = mix(col, vec3(0.78, 0.92, 0.99), vig * uStormFactor * 0.42);
        }
        gl_FragColor = vec4(col, texel.a);
      } else {
        // БАШНЯ ПУСТОТЫ: Хроматическая аберрация RGB Shift по краям экрана (из void tower.html)
        vec2 center = vUv - 0.5;
        float dist = length(center);
        vec2 offset = normalize(center + 0.0001) * uRgbShiftAmount * pow(dist * 1.65, 1.6);

        float r = texture2D(tDiffuse, vUv + offset).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - offset).b;
        vec3 col = vec3(r, g, b);

        if (uStormFactor > 0.01) {
          float vig = smoothstep(0.25, 0.85, dist);
          col = mix(col, vec3(0.18, 0.04, 0.32), vig * uStormFactor * 0.38);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    }
  `
};

let composer = null;
let bloomPass = null;
let towerPostPass = null;

// Текущие активные параметры VFX (обновляются в реальном времени и при Бурях)
const activeVFXState = {
  towerId: 'ash',
  stormFactor: 0,
  bloomStrength: 0.3,
  bloomThreshold: 0.14,
  heatDistortion: 0.039,
  lavaSpeed: 2.25,
  fogDensityParam: 0.065,
  renderFogDensity: 0.0165,
  crackEmissive: 1.95,
  blizzardSpeed: 0.5,
  rgbShift: 0.0046,
  gravityAnomaly: 1.4,
  dissolveThreshold: 0.39,
  gravityMul: 0.62
};

if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.ShaderPass) {
  composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,
    0.55,
    0.14
  );
  composer.addPass(bloomPass);

  towerPostPass = new THREE.ShaderPass(TowerUnifiedPostShader);
  composer.addPass(towerPostPass);
}

/**
 * Рендерит сцену через EffectComposer (UnrealBloom + пост-эффект башни) или стандартный WebGLRenderer.
 */
function renderSceneWithPostProcessing() {
  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

/**
 * Обновляет размеры буфера рендерера и соотношение сторон камеры.
 */
function handleWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (composer) {
    composer.setPixelRatio(currentPixelRatio);
    composer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('resize', handleWindowResize);
handleWindowResize();

/**
 * Применяет текущий pixelRatio (используется адаптивным контролем FPS).
 */
function applyPixelRatio() {
  renderer.setPixelRatio(currentPixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  if (composer) {
    composer.setPixelRatio(currentPixelRatio);
    composer.setSize(window.innerWidth, window.innerHeight);
  }
}
