"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function DonationSuccessScene({ onReady }: { onReady: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.7;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    const root = new THREE.Group();
    scene.add(root);

    scene.add(new THREE.AmbientLight(0xffffff, 2.7));
    const key = new THREE.DirectionalLight(0xffffff, 5);
    key.position.set(-3, 4, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd6f9ef, 3);
    rim.position.set(5, -1, -3);
    scene.add(rim);

    const gold = new THREE.MeshPhysicalMaterial({ color: 0xd9a54f, metalness: 0.76, roughness: 0.25, clearcoat: 0.9 });
    const teal = new THREE.MeshPhysicalMaterial({ color: 0x007966, metalness: 0.48, roughness: 0.22, clearcoat: 1 });
    const face = new THREE.MeshPhysicalMaterial({ color: 0xf4fbf7, metalness: 0.22, roughness: 0.32, clearcoat: 0.6 });
    const edge = new THREE.MeshPhysicalMaterial({ color: 0x346d65, metalness: 0.65, roughness: 0.27 });

    const seal = new THREE.Group();
    root.add(seal);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.43, 1.43, 0.24, 96), [edge, face, edge]);
    disc.rotation.x = Math.PI / 2;
    seal.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.085, 18, 120), gold);
    ring.position.z = 0.17;
    seal.add(ring);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.17, 0.012, 8, 120), edge);
    innerRing.position.z = 0.14;
    seal.add(innerRing);

    const check = new THREE.Shape();
    check.moveTo(-0.72, -0.04);
    check.lineTo(-0.38, -0.38);
    check.lineTo(-0.2, -0.2);
    check.lineTo(0.54, 0.52);
    check.lineTo(0.82, 0.25);
    check.lineTo(-0.2, -0.75);
    check.lineTo(-0.72, -0.25);
    check.closePath();
    const checkMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(check, {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.04, bevelSegments: 3,
    }), teal);
    checkMesh.position.z = 0.17;
    seal.add(checkMesh);

    const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.94, 0.018, 8, 140, Math.PI * 1.45), gold);
    orbit.rotation.set(0.38, -0.32, -0.46);
    orbit.position.z = -0.3;
    root.add(orbit);

    const fragments: Array<{ mesh: THREE.Mesh; angle: number; radius: number; speed: number; phase: number }> = [];
    const fragmentMaterials = [gold, teal, new THREE.MeshPhysicalMaterial({ color: 0xbe786b, metalness: 0.34, roughness: 0.3 })];
    for (let i = 0; i < 34; i++) {
      const size = 0.035 + (i % 4) * 0.01;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size * (i % 3 === 0 ? 3 : 1.7), 0.018), fragmentMaterials[i % fragmentMaterials.length]);
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      const radius = 1.82 + (i % 5) * 0.15;
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.55 + (i % 4) * 0.23);
      mesh.rotation.z = angle;
      root.add(mesh);
      fragments.push({ mesh, angle, radius, speed: 0.45 + (i % 7) * 0.07, phase: i * 0.83 });
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    function resize() {
      const width = mount!.clientWidth;
      const height = mount!.clientHeight;
      camera.aspect = width / height;
      camera.fov = width < 760 ? 43 : 38;
      camera.updateProjectionMatrix();
      root.position.set(width < 760 ? 0 : 2.35, width < 760 ? (width < 440 ? 0.55 : 0.7) : 0.05, 0);
      root.scale.setScalar(width < 760 ? (width < 440 ? 0.65 : 0.78) : 1.12);
      renderer.setSize(width, height, false);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const clock = new THREE.Clock();
    let frame = 0;
    function draw() {
      const time = clock.getElapsedTime();
      seal.rotation.y = Math.sin(time * 0.75) * 0.18 + pointer.x * 0.12;
      seal.rotation.x = Math.sin(time * 0.6) * 0.08 - pointer.y * 0.1;
      seal.position.y = Math.sin(time * 1.2) * 0.07;
      orbit.rotation.z = -0.46 + time * 0.11;
      fragments.forEach(({ mesh, angle, radius, speed, phase }) => {
        mesh.position.x = Math.cos(angle + time * speed * 0.06) * radius;
        mesh.position.y = Math.sin(angle + time * speed * 0.06) * radius + Math.sin(time * speed + phase) * 0.06;
        mesh.rotation.z = angle + time * speed;
      });
      renderer.render(scene, camera);
      if (!motion.matches) frame = requestAnimationFrame(draw);
    }
    draw();
    onReady();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      [...fragmentMaterials, face, edge].forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onReady]);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
