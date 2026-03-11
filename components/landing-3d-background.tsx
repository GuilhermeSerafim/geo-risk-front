"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

type AnyWebGLContext = WebGL2RenderingContext | WebGLRenderingContext;

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vDist;

  uniform float uTime;
  uniform float uMotionScale;

  vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }

  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
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
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 x = x_*ns.x + ns.yyyy;
    vec4 y = y_*ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0*dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  float fbm(vec3 p){
    float v = 0.0;
    float a = 0.5;
    for(int i=0;i<5;i++){
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main(){
    vUv = uv;

    vec3 pos = position;
    float t = uTime * 0.25;

    vec3 p = pos * 1.15;
    float warp1 = fbm(p + vec3(t, -t * 0.8, t * 0.55));
    float warp2 = snoise(p * 2.0 + vec3(-t * 0.7, t * 0.9, t * 0.25));
    float ridge = max(0.0, 1.0 - abs(snoise(p * 1.45)));
    float disp = ((warp1 * 0.26) + (warp2 * 0.1) + (ridge * 0.13)) * uMotionScale;

    vDist = disp;
    pos += normal * disp;

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vDist;

  uniform float uTime;
  uniform vec3 uColorTeal;
  uniform vec3 uColorAmber;
  uniform vec3 uColorGreen;

  float saturate(float x){ return clamp(x,0.0,1.0); }

  vec3 normalFromDerivatives(vec3 p){
    vec3 dx = dFdx(p);
    vec3 dy = dFdy(p);
    return normalize(cross(dx, dy));
  }

  vec3 F_Schlick(float cosTheta, vec3 F0){
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  }

  float D_GGX(float NdotH, float rough){
    float a = rough * rough;
    float a2 = a * a;
    float d = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
    return a2 / (3.14159 * d * d);
  }

  float G_SchlickGGX(float NdotV, float rough){
    float r = rough + 1.0;
    float k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
  }

  float G_Smith(float NdotV, float NdotL, float rough){
    return G_SchlickGGX(NdotV, rough) * G_SchlickGGX(NdotL, rough);
  }

  vec3 envGradient(vec3 r){
    float h = r.y * 0.5 + 0.5;
    vec3 zenith = vec3(0.035, 0.075, 0.1);
    vec3 horizon = vec3(0.01, 0.03, 0.05);
    vec3 ground = vec3(0.005, 0.008, 0.012);
    vec3 sky = mix(horizon, zenith, h);
    return mix(ground, sky, saturate(h * 1.2));
  }

  void main(){
    vec3 N = normalFromDerivatives(vWorldPos);
    vec3 V = normalize(cameraPosition - vWorldPos);

    float t = uTime * 0.6;
    vec3 L1 = normalize(vec3( 6.0 * sin(t * 0.7),  3.8,  6.0 * cos(t * 0.7)) - vWorldPos);
    vec3 L2 = normalize(vec3(-5.2 * cos(t * 0.5), -3.3,  5.0 * sin(t * 0.45)) - vWorldPos);
    vec3 L3 = normalize(vec3( 0.0,  5.2 * sin(t * 0.25), -5.8) - vWorldPos);

    float NdotV = saturate(dot(N, V));
    float NdotL1 = saturate(dot(N, L1));
    float NdotL2 = saturate(dot(N, L2));
    float NdotL3 = saturate(dot(N, L3));

    vec3 H1 = normalize(V + L1);
    vec3 H2 = normalize(V + L2);
    vec3 H3 = normalize(V + L3);
    float NdotH1 = saturate(dot(N, H1));
    float NdotH2 = saturate(dot(N, H2));
    float NdotH3 = saturate(dot(N, H3));

    float wave = sin((vUv.x + vUv.y) * 6.28318 + uTime * 0.22) * 0.5 + 0.5;
    float metallic = 0.22 + 0.08 * wave;
    float rough = clamp(0.2 + 0.12 * sin(vUv.x * 9.0 + uTime * 0.18), 0.08, 0.55);

    vec3 darkBase = vec3(0.03, 0.06, 0.085);
    vec3 accentBlend = mix(uColorGreen, uColorAmber, 0.45 + 0.35 * sin(uTime * 0.15 + vUv.x * 2.0));
    vec3 baseAlbedo = mix(darkBase, uColorTeal * 0.68 + accentBlend * 0.32, 0.2 + abs(vDist) * 0.55);

    vec3 F0 = mix(vec3(0.04), baseAlbedo, metallic);

    float D1 = D_GGX(NdotH1, rough);
    float D2 = D_GGX(NdotH2, rough);
    float D3 = D_GGX(NdotH3, rough);
    float G1 = G_Smith(NdotV, NdotL1, rough);
    float G2 = G_Smith(NdotV, NdotL2, rough);
    float G3 = G_Smith(NdotV, NdotL3, rough);

    vec3 F1 = F_Schlick(saturate(dot(V, H1)), F0);
    vec3 F2 = F_Schlick(saturate(dot(V, H2)), F0);
    vec3 F3 = F_Schlick(saturate(dot(V, H3)), F0);

    vec3 spec1 = (D1 * G1 * F1) / max(4.0 * NdotV * NdotL1, 0.001);
    vec3 spec2 = (D2 * G2 * F2) / max(4.0 * NdotV * NdotL2, 0.001);
    vec3 spec3 = (D3 * G3 * F3) / max(4.0 * NdotV * NdotL3, 0.001);

    vec3 kS = F_Schlick(NdotV, F0);
    vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);
    vec3 diffuse = baseAlbedo / 3.14159;

    vec3 c1 = vec3(0.85, 0.96, 1.0);
    vec3 c2 = mix(uColorTeal, vec3(0.7, 0.86, 0.88), 0.42);
    vec3 c3 = mix(uColorAmber, vec3(0.72, 0.62, 0.35), 0.58);

    vec3 direct =
      (kD * diffuse + spec1) * c1 * NdotL1 * 0.82 +
      (kD * diffuse + spec2) * c2 * NdotL2 * 0.56 +
      (kD * diffuse + spec3) * c3 * NdotL3 * 0.44;

    vec3 R = reflect(-V, N);
    vec3 env = envGradient(R);
    vec3 envSpec = F_Schlick(NdotV, F0) * env * (1.0 - rough) * 0.52;

    float rim = pow(1.0 - saturate(dot(N, V)), 2.1);
    vec3 rimColor = mix(uColorGreen, uColorAmber, 0.4) * rim * 0.27;
    vec3 glow = mix(uColorTeal, uColorGreen, 0.5) * abs(vDist) * 0.24;

    vec3 color = direct + envSpec + rimColor + glow;
    color = clamp(color, 0.0, 3.0);

    gl_FragColor = vec4(color, 0.9);
  }
`;

const postShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.3 },
    uGrain: { value: 0.12 },
    uAberration: { value: 0.0012 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;

    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;

    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 aces(vec3 x){
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main() {
      vec2 p = vUv - 0.5;
      vec2 dir = normalize(p + 1e-6);
      float dist = length(p);
      vec2 off = dir * uAberration * dist;

      float r = texture2D(tDiffuse, vUv + off).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - off).b;
      vec3 col = vec3(r, g, b);

      float noise = rand(vUv * uResolution + uTime * 120.0) - 0.5;
      col += noise * uGrain * 0.08;

      float vig = smoothstep(0.9, 0.2, dist);
      col *= mix(1.0, vig, uVignette);

      col = aces(col);
      col = pow(col, vec3(1.0 / 2.2));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export default function Landing3DBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPreferences = () => {
      setIsMobile(mobileQuery.matches);
      setReducedMotion(motionQuery.matches);
    };

    syncPreferences();
    mobileQuery.addEventListener("change", syncPreferences);
    motionQuery.addEventListener("change", syncPreferences);

    return () => {
      mobileQuery.removeEventListener("change", syncPreferences);
      motionQuery.removeEventListener("change", syncPreferences);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    let raf = 0;
    let listenersAttached = false;

    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let composer: EffectComposer | null = null;
    let geometry: THREE.IcosahedronGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let mesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.ShaderMaterial> | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let finalPass: ShaderPass | null = null;

    const pointer = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX / window.innerWidth;
      pointer.y = 1 - event.clientY / window.innerHeight;
    };

    const onResize = () => {
      if (!camera || !renderer || !composer || !bloomPass || !finalPass) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.15 : 1.75));
      composer.setSize(width, height);
      bloomPass.setSize(width, height);
      finalPass.uniforms.uResolution.value.set(width, height);
    };

    const cleanup = () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }

      if (listenersAttached) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", onResize);
      }

      if (scene && mesh) {
        scene.remove(mesh);
      }

      geometry?.dispose();
      material?.dispose();
      bloomPass?.dispose();
      finalPass?.material.dispose();

      if (composer) {
        composer.passes.forEach((pass) => {
          const disposablePass = pass as { dispose?: () => void };
          if (typeof disposablePass.dispose === "function") {
            disposablePass.dispose();
          }
        });
        composer.dispose();
      }

      renderer?.dispose();
    };

    try {
      const contextAttributes: WebGLContextAttributes = {
        alpha: true,
        antialias: !isMobile,
        depth: true,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      };

      const context =
        (canvas.getContext("webgl2", contextAttributes) as AnyWebGLContext | null) ??
        (canvas.getContext("webgl", contextAttributes) as AnyWebGLContext | null) ??
        (canvas.getContext("experimental-webgl", contextAttributes) as AnyWebGLContext | null);

      if (!context) {
        setHasWebGL(false);
        return cleanup;
      }

      setHasWebGL(true);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 4.65);

      renderer = new THREE.WebGLRenderer({
        canvas,
        context,
        alpha: true,
        antialias: !isMobile,
        powerPreference: "high-performance",
      });
      renderer.setClearAlpha(0);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.15 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isMobile ? 0.95 : 1.02;

      const detail = isMobile ? 2 : 4;
      geometry = new THREE.IcosahedronGeometry(isMobile ? 1.42 : 1.74, detail);
      material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMotionScale: { value: reducedMotion ? 0.32 : isMobile ? 0.7 : 1.0 },
          uColorTeal: { value: new THREE.Color("#1ea58f") },
          uColorAmber: { value: new THREE.Color("#b7883b") },
          uColorGreen: { value: new THREE.Color("#4ba77d") },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
      });

      mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(isMobile ? 0.8 : 1.15, isMobile ? -0.25 : -0.12, 0);
      scene.add(mesh);

      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        isMobile ? 0.22 : 0.4,
        isMobile ? 0.5 : 0.68,
        isMobile ? 0.94 : 0.9,
      );
      composer.addPass(bloomPass);

      finalPass = new ShaderPass(postShader);
      finalPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      finalPass.uniforms.uVignette.value = isMobile ? 0.22 : 0.3;
      finalPass.uniforms.uGrain.value = isMobile ? 0.08 : 0.12;
      composer.addPass(finalPass);

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("resize", onResize);
      listenersAttached = true;

      const clock = new THREE.Clock();
      let lastFrameTime = 0;
      const mobileFrameBudget = 1000 / 36;

      const renderFrame = () => {
        if (!mesh || !material || !composer || !finalPass) return;

        const elapsed = reducedMotion ? 0 : clock.getElapsedTime();
        pointer.sx += (pointer.x - pointer.sx) * (isMobile ? 0.05 : 0.07);
        pointer.sy += (pointer.y - pointer.sy) * (isMobile ? 0.05 : 0.07);

        material.uniforms.uTime.value = elapsed;
        material.uniforms.uMotionScale.value = reducedMotion ? 0.32 : isMobile ? 0.7 : 1.0;

        const targetRotX = (pointer.sy - 0.5) * (reducedMotion ? 0.05 : isMobile ? 0.13 : 0.18);
        const targetRotY = (pointer.sx - 0.5) * (reducedMotion ? 0.08 : isMobile ? 0.24 : 0.3);
        mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.08;
        mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.08;
        mesh.rotation.z = reducedMotion ? 0 : Math.sin(elapsed * 0.14) * (isMobile ? 0.035 : 0.06);
        mesh.position.y = reducedMotion
          ? mesh.position.y
          : Math.sin(elapsed * 0.35) * (isMobile ? 0.03 : 0.05) - (isMobile ? 0.24 : 0.1);

        finalPass.uniforms.uTime.value = elapsed;
        composer.render();
      };

      if (reducedMotion) {
        renderFrame();
      } else {
        const animate = (time: number) => {
          raf = window.requestAnimationFrame(animate);

          if (isMobile && time - lastFrameTime < mobileFrameBudget) {
            return;
          }

          lastFrameTime = time;
          renderFrame();
        };

        raf = window.requestAnimationFrame(animate);
      }
    } catch {
      setHasWebGL(false);
      cleanup();
    }

    return cleanup;
  }, [isMobile, reducedMotion]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className={hasWebGL ? "h-full w-full" : "hidden"} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/78 via-background/64 to-background/84 dark:from-black/60 dark:via-slate-950/48 dark:to-black/66" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(22,163,148,0.14),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(217,119,6,0.12),transparent_38%)]" />
    </div>
  );
}
