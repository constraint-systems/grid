import React, { useEffect, useState } from "react";
import StateLoader from "./State";
import * as THREE from "three";
import { Gl } from "./Types";

function ThreeLoader() {
  const [gl, setGl] = useState<Gl | null>(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );
    renderer.domElement.style.width = window.innerWidth + "px";
    renderer.domElement.style.height = window.innerHeight + "px";
    document.body.prepend(renderer.domElement);

    camera.position.z = 3;

    // sneak in font loading too
    document.fonts.load('16px "custom"').then(() => {
      setGl({
        scene,
        camera,
        renderer,
        canvas: renderer.domElement,
      } as Gl);
    });

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      document.body.removeChild(renderer.domElement);
    };
  }, []);

  return gl ? <StateLoader gl={gl} /> : null;
}

export default ThreeLoader;
