"use client";

import { Canvas } from "@react-three/fiber";
import {
  Float,
  Icosahedron,
  MeshDistortMaterial,
  Sphere,
  Torus,
  TorusKnot,
} from "@react-three/drei";

/**
 * Decorative WebGL scene: slowly floating geometric shapes in the brand teal
 * palette. Purely ornamental — sits behind/around hero content. Renders with a
 * transparent background so the page gradient shows through.
 */
function Shapes() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 5, 6]} intensity={1.3} />
      <directionalLight position={[-6, -3, 2]} intensity={0.5} color="#5eead4" />
      <pointLight position={[0, 0, 4]} intensity={0.6} color="#14b8a6" />

      {/* Shapes are pushed to the corners so the centered hero text stays clear. */}

      {/* Main organic blob — top right */}
      <Float speed={1.8} rotationIntensity={1} floatIntensity={1.1} position={[3.5, 1.3, -1.5]}>
        <Icosahedron args={[0.85, 4]}>
          <MeshDistortMaterial
            color="#0f766e"
            roughness={0.2}
            metalness={0.4}
            distort={0.35}
            speed={2.2}
          />
        </Icosahedron>
      </Float>

      {/* Ring — top left */}
      <Float speed={1.6} rotationIntensity={1.3} floatIntensity={1} position={[-3.6, 1.5, -1]}>
        <Torus args={[0.5, 0.18, 32, 80]}>
          <meshStandardMaterial color="#14b8a6" roughness={0.25} metalness={0.55} />
        </Torus>
      </Float>

      {/* Knot — bottom left */}
      <Float speed={2.2} rotationIntensity={1} floatIntensity={1} position={[-3.3, -1.6, -0.5]}>
        <TorusKnot args={[0.36, 0.12, 128, 32]}>
          <meshStandardMaterial color="#115e59" roughness={0.3} metalness={0.5} />
        </TorusKnot>
      </Float>

      {/* Small accent sphere — bottom right */}
      <Float speed={2.6} rotationIntensity={0.5} floatIntensity={0.9} position={[3.4, -1.5, 0]}>
        <Sphere args={[0.3, 32, 32]}>
          <meshStandardMaterial color="#2dd4bf" roughness={0.15} metalness={0.6} />
        </Sphere>
      </Float>
    </>
  );
}

export default function FloatingScene() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <Shapes />
    </Canvas>
  );
}
