"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CircularDashboard } from "./components/CircularDashboard";
import RotationControl from "./components/RotationControl";
import { EventCard } from "./components/EventCard";
import { Tooltip } from "./components/Tooltip";
import { LoadingOverlay, ScanLines, GridOverlay } from "./components/Effects";

// Global constants
const GLOBE_RADIUS = 5;
const PARTICLE_FIELD_RADIUS = 15;

//
// ─── SATELLITE ORBIT ─────
//
class SatelliteOrbit {
  constructor(options = {}) {
    this.options = {
      count: options.count || 500,
      size: options.size || 4.0,
      colors: options.colors || ["#00FFFF", "#FF00FF"],
      opacity: options.opacity || 0.8,
    };

    this.geometry = new THREE.BufferGeometry();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        size: { value: this.options.size },
        opacity: { value: this.options.opacity },
        color1: { value: new THREE.Color(this.options.colors[0]) },
        color2: { value: new THREE.Color(this.options.colors[1]) },
      },
      vertexShader: `
        uniform float time;
        uniform float size;
        attribute float orbitRadius;
        attribute float phase;
        attribute float angularVelocity;
        attribute float inclination;
        attribute float ascendingNode;
        varying float vPhase;
        
        void main() {
          float angle = phase + angularVelocity * time;
          vPhase = mod(phase, 6.28318) / 6.28318;
          vec3 pos = vec3(orbitRadius * cos(angle), 0.0, orbitRadius * sin(angle));
          float sinInc = sin(inclination);
          float cosInc = cos(inclination);
          mat3 rotX = mat3(
            1.0, 0.0, 0.0,
            0.0, cosInc, -sinInc,
            0.0, sinInc, cosInc
          );
          pos = rotX * pos;
          float sinAsc = sin(ascendingNode);
          float cosAsc = cos(ascendingNode);
          mat3 rotY = mat3(
            cosAsc, 0.0, sinAsc,
            0.0, 1.0, 0.0,
            -sinAsc, 0.0, cosAsc
          );
          pos = rotY * pos;
          pos.x += sin(time * 2.0 + phase * 6.28) * 0.02;
          pos.y += cos(time * 2.0 + phase * 6.28) * 0.02;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 / length(pos));
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        varying float vPhase;
        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float r = length(xy);
          if (r > 0.5) discard;
          float smoothEdge = 1.0 - smoothstep(0.45, 0.5, r);
          vec3 color = mix(color1, color2, vPhase);
          float glow = exp(-r * 4.0);
          color += glow * 0.5;
          gl_FragColor = vec4(color, opacity * smoothEdge);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.init();
  }

  init() {
    const count = this.options.count;
    const orbitRadii = new Float32Array(count);
    const phases = new Float32Array(count);
    const angularVelocities = new Float32Array(count);
    const inclinations = new Float32Array(count);
    const ascendingNodes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      orbitRadii[i] = GLOBE_RADIUS * (1.2 + Math.random() * 0.3);
      phases[i] = Math.random() * Math.PI * 2;
      angularVelocities[i] = 0.2 + Math.random() * 0.6;
      inclinations[i] = Math.random() * Math.PI;
      ascendingNodes[i] = Math.random() * Math.PI * 2;
    }

    const positions = new Float32Array(count * 3);
    positions.fill(0);

    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("orbitRadius", new THREE.BufferAttribute(orbitRadii, 1));
    this.geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    this.geometry.setAttribute("angularVelocity", new THREE.BufferAttribute(angularVelocities, 1));
    this.geometry.setAttribute("inclination", new THREE.BufferAttribute(inclinations, 1));
    this.geometry.setAttribute("ascendingNode", new THREE.BufferAttribute(ascendingNodes, 1));

    this.points = new THREE.Points(this.geometry, this.material);
  }

  update(time) {
    this.material.uniforms.time.value = time;
  }
}

//
// ─── PARTICLE FIELD ─────
//
class ParticleField {
  constructor(options = {}) {
    this.options = {
      count: options.count || 1000,
      size: options.size || 0.05,
      speed: options.speed || 0.2,
      trailLength: options.trailLength || 20,
      colors: options.colors || ["#00FFFF", "#FF00FF"],
      opacity: options.opacity || 0.6,
      flowPattern: options.flowPattern || "geodesic",
    };

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        size: { value: this.options.size },
        opacity: { value: this.options.opacity },
        color1: { value: new THREE.Color(this.options.colors[0]) },
        color2: { value: new THREE.Color(this.options.colors[1]) },
        constantRadius: { value: PARTICLE_FIELD_RADIUS },
      },
      vertexShader: `
        uniform float time;
        uniform float size;
        uniform float constantRadius;
        attribute float phase;
        attribute vec3 velocity;
        varying float vPhase;
        void main() {
          vPhase = phase;
          vec3 pos = position + velocity * time;
          pos.x += sin(time * 2.0 + phase * 6.28) * 0.02;
          pos.y += cos(time * 2.0 + phase * 6.28) * 0.02;
          pos = normalize(pos) * constantRadius;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 / length(pos.xyz));
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        varying float vPhase;
        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float r = length(xy);
          if (r > 0.5) discard;
          float smoothEdge = 1.0 - smoothstep(0.45, 0.5, r);
          vec3 color = mix(color1, color2, vPhase);
          float glow = exp(-r * 4.0);
          color += glow * 0.5;
          gl_FragColor = vec4(color, opacity * smoothEdge);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.init();
  }

  init() {
    const count = this.options.count;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      positions[i * 3] = x * GLOBE_RADIUS;
      positions[i * 3 + 1] = y * GLOBE_RADIUS;
      positions[i * 3 + 2] = z * GLOBE_RADIUS;

      if (this.options.flowPattern === "geodesic") {
        const tangent = new THREE.Vector3(-y, x, 0).normalize();
        velocities[i * 3] = tangent.x * this.options.speed;
        velocities[i * 3 + 1] = tangent.y * this.options.speed;
        velocities[i * 3 + 2] = tangent.z * this.options.speed;
      } else {
        const angle = Math.random() * Math.PI * 2;
        velocities[i * 3] = Math.cos(angle) * this.options.speed;
        velocities[i * 3 + 1] = Math.sin(angle) * this.options.speed;
        velocities[i * 3 + 2] = 0;
      }
      phases[i] = Math.random();
    }

    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
    this.geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

    this.points = new THREE.Points(this.geometry, this.material);
  }

  update(time) {
    this.material.uniforms.time.value = time;
  }

  addBurst(position, count = 20) {
    const positions = this.geometry.attributes.position.array;
    const velocities = this.geometry.attributes.velocity.array;
    const phases = this.geometry.attributes.phase.array;
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * this.options.count);
      const ix = index * 3;
      const iy = index * 3 + 1;
      const iz = index * 3 + 2;
      positions[ix] = position.x;
      positions[iy] = position.y;
      positions[iz] = position.z;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      velocities[ix] = Math.sin(phi) * Math.cos(theta) * this.options.speed * 2;
      velocities[iy] = Math.sin(phi) * Math.sin(theta) * this.options.speed * 2;
      velocities[iz] = Math.cos(phi) * this.options.speed * 2;
      phases[index] = Math.random();
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.velocity.needsUpdate = true;
    this.geometry.attributes.phase.needsUpdate = true;
  }
}

export default function PortfolioDashboard() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const markersRef = useRef([]);
  const globeRef = useRef(null);

  // Refs for the two particle systems
  const satelliteOrbitRef = useRef(null);
  const particleFieldRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [systemData, setSystemData] = useState({
    ROTATION: "1.247 rad/s",
    COORDINATES: "37°N 122°W",
    "SCAN STATUS": "ACTIVE",
    SIGNAL: "98.2%",
    MEMORY: "872MB/1024MB",
  });

  const [rotationActive, setRotationActive] = useState(true);
  const rotationActiveRef = useRef(true);
  const pointerDownRef = useRef({ x: 0, y: 0 });
  const dragThreshold = 5;
  const hoveredMarkerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Tab" || e.keyCode === 9) {
        e.preventDefault();
        setRotationActive((prev) => {
          rotationActiveRef.current = !prev;
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Create sentiment bars (data points)
  const createSentimentBar = (position, data) => {
    const sentimentScore = data.sentimentScore;
    const baseBarLength = 0.5;
    const extraLengthFactor = 1.5;
    const barLength = baseBarLength + ((sentimentScore + 1) / 2) * extraLengthFactor;
    const barRadius = 0.01;
    const radialSegments = 8;

    const geometry = new THREE.CylinderGeometry(
      barRadius,
      barRadius,
      barLength,
      radialSegments
    );
    geometry.translate(0, barLength / 2, 0);

    const normalized = (sentimentScore + 1) / 2;
    const hue = normalized * 120;
    const baseColor = new THREE.Color();
    baseColor.setHSL(hue / 360, 1, 0.5);
    const highlightColor = new THREE.Color();
    highlightColor.setHSL(hue / 360, 1, 0.8);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: baseColor },
        highlightColor: { value: highlightColor },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 baseColor;
        uniform vec3 highlightColor;
        varying vec2 vUv;
        void main() {
          float pulse = sin(time * 3.0 + vUv.y * 3.14) * 0.5 + 0.5;
          vec3 color = mix(baseColor, highlightColor, vUv.y + pulse * 0.1);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: false,
    });

    const bar = new THREE.Mesh(geometry, material);
    const normal = position.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normal
    );
    bar.quaternion.copy(quaternion);

    const jitterMagnitude = 0.05;
    let tangent1;
    if (Math.abs(normal.y) < 0.99) {
      tangent1 = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
    } else {
      tangent1 = new THREE.Vector3(1, 0, 0).cross(normal).normalize();
    }
    const tangent2 = normal.clone().cross(tangent1).normalize();
    const randomAngle = Math.random() * Math.PI * 2;
    const offset = tangent1
      .clone()
      .multiplyScalar(Math.cos(randomAngle) * jitterMagnitude)
      .add(tangent2.clone().multiplyScalar(Math.sin(randomAngle) * jitterMagnitude));
    bar.position.copy(position).add(offset);

    bar.userData = data;
    if (globeRef.current) {
      globeRef.current.add(bar);
    }
    markersRef.current.push(bar);
    return bar;
  };

  // Fetch sentiment data and create bars
  const fetchSentimentData = async () => {
    try {
      const res = await fetch("/api/sentiment");
      const data = await res.json();
      const dataPoints = data.events;
      dataPoints.forEach((dataPoint) => {
        const barPosition = convertGeoTo3D(
          dataPoint.lat,
          dataPoint.lon,
          GLOBE_RADIUS
        );
        createSentimentBar(barPosition, dataPoint);
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sentiment data:", error);
      setLoading(false);
    }
  };

  // Helper: Convert latitude/longitude to a 3D position on a sphere.
  const convertGeoTo3D = (lat, lon, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  const handleClick = (event) => {
    event.preventDefault();

    const dataPointElement = document.querySelector(".data-point-container");
    if (dataPointElement && dataPointElement.contains(event.target)) {
      return;
    }

    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(
      markersRef.current,
      true
    );

    if (intersects.length > 0) {
      setSelectedEvent(intersects[0].object.userData);
    } else {
      if (event.target === renderer.domElement) {
        setSelectedEvent(null);
      }
    }
  };

  const handleMouseMove = (event) => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(
      markersRef.current,
      true
    );
    if (intersects.length > 0) {
      setHoveredEvent(intersects[0].object.userData);
      hoveredMarkerRef.current = intersects[0].object;
      setHoverPosition({ x: event.clientX, y: event.clientY });
    } else {
      setHoveredEvent(null);
      hoveredMarkerRef.current = null;
    }
  };

  const handlePointerDown = (event) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event) => {
    if (event.target.closest(".data-point-container")) {
      return;
    }
    const dx = event.clientX - pointerDownRef.current.x;
    const dy = event.clientY - pointerDownRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) < dragThreshold) {
      handleClick(event);
    }
  };

  useEffect(() => {
    // ─── SCENE & RENDERER  ────
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = 16;
    bgCanvas.height = 16;
    const bgContext = bgCanvas.getContext("2d");
    const bgGradient = bgContext.createLinearGradient(0, 0, 0, 16);
    bgGradient.addColorStop(0, "#001122");
    bgGradient.addColorStop(1, "#000066");
    bgContext.fillStyle = bgGradient;
    bgContext.fillRect(0, 0, 16, 16);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    scene.background = bgTexture;

    // ─── CAMERA ───
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 20);
    cameraRef.current = camera;

    // ─── RENDERER ────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // ─── ORBIT CONTROLS ───
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = GLOBE_RADIUS + 2;
    controls.maxDistance = 1000;

    // ─── TEXTURES & GLOBE SHADER ───
    const textureLoader = new THREE.TextureLoader();
    const bumpTexture = textureLoader.load("/textures/bump.jpg");
    const oceanTexture = textureLoader.load("/textures/ocean.jpg");

    const globeShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        bumpMap: { value: bumpTexture },
        oceanMap: { value: oceanTexture },
        time: { value: 0.0 },
        glitchIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;
        uniform float glitchIntensity;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec3 pos = position;
          float glitchLine = step(0.8, sin(pos.y * 10.0 + time));
          pos.x += glitchLine * sin(time * 10.0) * glitchIntensity;
          vPosition = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D bumpMap;
        uniform sampler2D oceanMap;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        vec3 celShade(vec3 color, float intensity) {
          float cel = floor(intensity * 3.0) / 3.0;
          return color * (0.5 + cel * 0.5);
        }
        void main() {
          float elevation = texture2D(bumpMap, vUv).r;
          float oceanMask = texture2D(oceanMap, vUv).r;
          vec3 primaryColor = vec3(0.0, 1.0, 0.9);
          vec3 secondaryColor = vec3(1.0, 0.0, 0.5);
          vec3 accentColor = vec3(1.0, 1.0, 0.0);
          float holographic = sin(vPosition.y * 20.0 + time) * 0.5 + 0.5;
          float scanline = sin(vUv.y * 200.0 + time * 5.0) * 0.5 + 0.5;
          vec3 baseColor;
          if (oceanMask > 0.5) {
            baseColor = mix(primaryColor, accentColor, holographic);
          } else {
            baseColor = mix(secondaryColor, primaryColor, elevation);
          }
          float edge = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          vec3 glowColor = mix(baseColor, accentColor, pow(edge, 3.0));
          float lighting = dot(vNormal, normalize(vec3(1.0)));
          vec3 finalColor = celShade(glowColor, lighting);
          finalColor *= 0.8 + 0.2 * scanline;
          finalColor += vec3(0.1) * holographic;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    // ─── GLOBE  ────
    const segments = 128;
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, segments, segments),
      globeShaderMaterial
    );
    scene.add(globe);
    globeRef.current = globe;

    // ─── ATMOSPHERE EFFECT ───
    const atmosphereGeometry = new THREE.SphereGeometry(
      GLOBE_RADIUS * 1.15,
      segments,
      segments
    );
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 0.3 },
        colorTop: { value: new THREE.Color("#00FFFF") },
        colorBottom: { value: new THREE.Color("#000066") },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        uniform float time;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(1.0 - dot(vNormal, vec3(0,0,1)), 2.0);
          vec3 color = mix(colorTop, colorBottom, intensity);
          gl_FragColor = vec4(color, opacity);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    // ─── LIGHTING ───
    const rimLight = new THREE.DirectionalLight(0x00ffff, 1);
    rimLight.position.set(-10, 0, -10);
    scene.add(rimLight);

    const keyLight = new THREE.DirectionalLight(0xff00ff, 0.8);
    keyLight.position.set(10, 10, 10);
    scene.add(keyLight);

    const ambientLight = new THREE.AmbientLight(0x001111, 0.2);
    scene.add(ambientLight);

    satelliteOrbitRef.current = new SatelliteOrbit({
      count: 500,
      size: 4.0,
      colors: ["#00FFFF", "#FF00FF"],
      opacity: 0.8,
    });
    scene.add(satelliteOrbitRef.current.points);

    particleFieldRef.current = new ParticleField({
      count: 1000,
      size: 0.05,
      speed: 0.2,
      trailLength: 20,
      colors: ["#00FFFF", "#FF00FF"],
      opacity: 0.6,
      flowPattern: "geodesic",
    });
    scene.add(particleFieldRef.current.points);

    // ─── RENDER LOOP ────
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;

      if (Math.random() > 0.99) {
        globeShaderMaterial.uniforms.glitchIntensity.value = 0.1;
        setTimeout(() => {
          globeShaderMaterial.uniforms.glitchIntensity.value = 0;
        }, 100);
      }
      globeShaderMaterial.uniforms.time.value = time;
      atmosphereMaterial.uniforms.time.value = time;
      if (rotationActiveRef.current) {
        globe.rotation.y += 0.0005;
      }
      controls.update();
      renderer.render(scene, camera);

      markersRef.current.forEach((marker) => {
        if (marker.material.uniforms.time) {
          marker.material.uniforms.time.value = time;
        }
        const targetScale = marker === hoveredMarkerRef.current ? 1.2 : 1.0;
        marker.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      });

      if (satelliteOrbitRef.current) {
        satelliteOrbitRef.current.update(time);
      }
      if (particleFieldRef.current) {
        particleFieldRef.current.update(time);
      }

      if (Math.random() > 0.95) {
        setSystemData((prev) => ({
          ...prev,
          SIGNAL: `${(95 + Math.random() * 5).toFixed(1)}%`,
          MEMORY: `${Math.floor(820 + Math.random() * 100)}MB/1024MB`,
        }));
      }
    };
    fetchSentimentData();
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const [circularData] = useState([
    { label: "Node 1", value: 92 },
    { label: "Node 2", value: 87 },
    { label: "Node 3", value: 95 },
    { label: "Node 4", value: 78 },
  ]);

  return (
    <div
      className="relative w-screen h-screen bg-black overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseMove={handleMouseMove}
    >
      <div ref={mountRef} className="w-full h-full" />
      <RotationControl
        isActive={rotationActive}
        onToggle={() => {
          setRotationActive((prev) => {
            rotationActiveRef.current = !prev;
            return !prev;
          });
        }}
      />
      <GridOverlay />
      <ScanLines />
      <CircularDashboard data={circularData} />
      {loading && <LoadingOverlay />}
      {selectedEvent && (
        <EventCard data={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      {hoveredEvent && !selectedEvent && (
        <Tooltip data={hoveredEvent} position={hoverPosition} />
      )}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-32 h-32 border border-[#00FFFF]/30 rounded-full flex items-center justify-center">
          <div className="w-24 h-24 border border-[#00FFFF]/20 rounded-full" />
          <div className="absolute w-16 h-16 border border-[#00FFFF]/10 rounded-full" />
          <div className="absolute w-1 h-1 bg-[#00FFFF]" />
        </div>
      </div>
      <div className="absolute bottom-12 left-4 text-[#00FFFF]/70 font-mono text-sm">
        {currentTime.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        <br />
        {currentTime.toLocaleTimeString()}
      </div>
      <div className="absolute bottom-4 left-4 text-[#00FFFF]/70 font-mono text-sm">
        Click on data points to view sentiment details
      </div>
      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[#00FFFF]/30" />
      <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-[#00FFFF]/30" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-[#00FFFF]/30" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[#00FFFF]/30" />
    </div>
  );
}
