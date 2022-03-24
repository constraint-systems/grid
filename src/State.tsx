import { useEffect, useState, useRef } from "react";
import { Gl } from "./Types";
import MachineLoader from "./Machine";
import { proxy, ref } from "valtio";
import * as THREE from "three";
import Outline from "./Outline";
import { pixelToWorld } from "./Utils";
import GridHelper from "./GridHelper";

const modes = ["normal", "pan", "resize", "page"] as const;
type modeType = typeof modes[number];

type textSource = {
  size: number;
  chars: string[];
  canvases: HTMLCanvasElement[];
  textCols: number;
  charWidth: number;
  charHeight: number;
  chunked: [string, number, number][];
  lookup: number[][];
};

export type State = {
  width: number;
  height: number;
  modes: modeType[];
  mode: modeType;
  gl: Gl;
  mousePosition: { x: number; y: number };
  ray: THREE.Vector3;
  tempRay: THREE.Vector3;
  baseGrid: GridHelper;
  selection: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  selectionMesh: THREE.Mesh;
  resize: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  showGrid: boolean;
  showInfo: boolean;
  selectGridHelper: GridHelper;
  resizeMesh: THREE.Mesh;
  textSources: textSource[];
  main: HTMLCanvasElement;
  mesh: THREE.Mesh;
  texture: THREE.Texture;
  nextDir: "right" | "left" | "up" | "down";
  moveNext: boolean;
  fileInput: HTMLInputElement;
  initHeight: number;
  tempCanvas: HTMLCanvasElement;
  returnSource: { x: number; y: number; w: number; h: number };
  page: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  pageMesh: Outline;
  backgroundColor: string;
  keyboardRef: React.MutableRefObject<HTMLInputElement | null> | null;
  foregroundColor: string;
  transparentBackground: boolean;
  printCanvas: HTMLCanvasElement;
  backgroundSettingCanvas: HTMLCanvasElement;
  imageFill: "fill" | "cover" | "contain";
  textSizes: number[];
  regenerateCounter: number;
  returnMesh: THREE.Mesh;
  directionMesh: THREE.Mesh;
  directionSprites: HTMLCanvasElement[];
  cameraPosition: { x: number; y: number; z: number };
  undoStack: number[];
  undoCanvases: HTMLCanvasElement[];
  undoCanvas: number;
  undoExtra: any[];
  activeUndo: number;
  t: {
    t0: THREE.Vector3;
    t1: THREE.Vector3;
    t2: THREE.Vector3;
    t3: THREE.Vector3;
    t4: THREE.Vector3;
    t5: THREE.Vector3;
    t6: THREE.Vector3;
    t7: THREE.Vector3;
    t8: THREE.Vector3;
  };
};

function StateLoader({ gl }: { gl: Gl }) {
  const [mounted, setMounted] = useState<boolean>(false);
  const stateRef = useRef<any>(null);
  const initHeight = window.innerHeight;

  const cameraPosition = { x: 0, y: 0, z: 3 };

  useEffect(() => {
    const width = 2048;
    const height = 2048;
    const selection = {
      x: width / 2,
      y: height / 2,
      w: 16 * 1,
      h: 16 * 2,
    };
    const resize = { x: 0, y: 0, w: 1, h: 1 };

    let planeOutline;
    {
      planeOutline = new Outline(0x444444, 2, [
        gl.canvas.clientWidth,
        gl.canvas.clientHeight,
      ]);
      gl.scene.add(planeOutline);
      planeOutline.scale.x = pixelToWorld(gl.camera, initHeight, 2048);
      planeOutline.scale.y = pixelToWorld(gl.camera, initHeight, 2048);
    }

    let pageMesh;
    {
      pageMesh = new Outline(0x666666, 4, [
        gl.canvas.clientWidth,
        gl.canvas.clientHeight,
      ]);
      gl.scene.add(pageMesh);
      pageMesh.scale.x = pixelToWorld(gl.camera, initHeight, width);
      pageMesh.scale.y = pixelToWorld(gl.camera, initHeight, height);
      pageMesh.renderOrder = 3;
    }

    let selectionMesh;
    {
      selectionMesh = new Outline(0x00ffff, 2, [
        gl.canvas.clientWidth,
        gl.canvas.clientHeight,
      ]);
      selectionMesh.scale.x = pixelToWorld(gl.camera, initHeight, selection.w);
      selectionMesh.scale.y = pixelToWorld(gl.camera, initHeight, selection.h);
      selectionMesh.position.x = pixelToWorld(
        gl.camera,
        initHeight,
        selection.x + selection.w / 2 - width / 2
      );
      selectionMesh.position.y = pixelToWorld(
        gl.camera,
        initHeight,
        -(selection.y + selection.h / 2 - height / 2)
      );
      selectionMesh.position.z = 0;
      selectionMesh.renderOrder = 5;
      gl.scene.add(selectionMesh);
      selectionMesh.visible = false;
    }

    let resizeMesh;
    {
      resizeMesh = new Outline(0xff00ff, 2, [
        gl.canvas.clientWidth,
        gl.canvas.clientHeight,
      ]);
      gl.scene.add(resizeMesh);
      resizeMesh.visible = false;
      resizeMesh.renderOrder = 6;
    }

    let baseGrid;
    {
      baseGrid = new GridHelper(
        pixelToWorld(gl.camera, initHeight, width),
        pixelToWorld(gl.camera, initHeight, height),
        width / 16,
        height / 16,
        0x1f1f1f
      );
      gl.scene.add(baseGrid);
      baseGrid.renderOrder = -2;
      baseGrid.visible = false;
    }

    {
      const geo = new THREE.PlaneGeometry();
      const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
      });
      const mesh = new THREE.Mesh(geo, material);
      const size = pixelToWorld(gl.camera, initHeight, 2048);
      mesh.scale.x = size * 4;
      mesh.scale.y = size * 2;
      mesh.position.x = size * 2 + size / 2;
      gl.scene.add(mesh);
      mesh.renderOrder = -1;
    }
    {
      const geo = new THREE.PlaneGeometry();
      const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
      });
      const mesh = new THREE.Mesh(geo, material);
      const size = pixelToWorld(gl.camera, initHeight, 2048);
      mesh.scale.x = size * 4;
      mesh.scale.y = size * 2;
      mesh.position.x = -size * 2 - size / 2;
      gl.scene.add(mesh);
      mesh.renderOrder = -1;
    }
    {
      const geo = new THREE.PlaneGeometry();
      const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
      });
      const mesh = new THREE.Mesh(geo, material);
      const size = pixelToWorld(gl.camera, initHeight, 2048);
      mesh.scale.x = size * 2;
      mesh.scale.y = size * 4;
      mesh.position.y = -size * 2 - size / 2;
      gl.scene.add(mesh);
      mesh.renderOrder = -1;
    }
    {
      const geo = new THREE.PlaneGeometry();
      const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
      });
      const mesh = new THREE.Mesh(geo, material);
      const size = pixelToWorld(gl.camera, initHeight, 2048);
      mesh.scale.x = size * 2;
      mesh.scale.y = size * 4;
      mesh.position.y = size * 2 + size / 2;
      gl.scene.add(mesh);
      mesh.renderOrder = -1;
    }

    let returnMesh;
    {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0], 3)
      );
      const canvas = document.createElement("canvas");
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2, false);
      ctx.fill();
      const material = new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(canvas),
        color: 0x00ffff,
        transparent: true,
        alphaTest: 0.5,
      });
      const mesh = new THREE.Points(geometry, material);
      gl.scene.add(mesh);
      mesh.renderOrder = 8;
      // mesh.material.size = pixelToWorld(gl.camera, initHeight, 16);
      mesh.material.sizeAttenuation = false;
      mesh.material.size = 16 * window.devicePixelRatio;
      returnMesh = mesh;
      returnMesh.visible = false;
    }

    let directionMesh;
    let directionSprites;
    {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0], 3)
      );

      const size = 64;
      const offset = 8;
      const canvases = [...Array(4)].map((_, i) => {
        const canvas = document.createElement("canvas");
        canvas.width = size + offset * 2;
        canvas.height = size + offset * 2;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.translate(offset, offset);
        if (i === 0) {
          ctx.translate(offset, 0);
          ctx.moveTo(0, 0);
          ctx.lineTo(size, size / 2);
          ctx.lineTo(0, size);
        } else if (i === 1) {
          ctx.translate(0, offset);
          ctx.moveTo(0, 0);
          ctx.lineTo(size, 0);
          ctx.lineTo(size / 2, size);
        } else if (i === 2) {
          ctx.translate(-offset, 0);
          ctx.moveTo(size, 0);
          ctx.lineTo(size, size);
          ctx.lineTo(0, size / 2);
        } else if (i === 3) {
          ctx.translate(0, -offset);
          ctx.moveTo(0, size);
          ctx.lineTo(size, size);
          ctx.lineTo(size / 2, 0);
        }
        ctx.fill();
        return canvas;
      });
      directionSprites = canvases;

      const canvas = document.createElement("canvas");
      canvas.width = size + offset * 2;
      canvas.height = size + offset * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(canvases[0], 0, 0);
      const material = new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(canvas),
        color: 0x00ffff,
        transparent: true,
        alphaTest: 0.5,
      });
      const mesh = new THREE.Points(geometry, material);
      gl.scene.add(mesh);
      mesh.renderOrder = 8;
      mesh.material.sizeAttenuation = false;
      mesh.material.size = (16 + 4) * window.devicePixelRatio;
      directionMesh = mesh;
    }

    let selectGridHelper;
    {
      const roundedWidth = Math.floor(width / selection.w + 2) * selection.w;
      const roundedHeight = Math.floor(height / selection.h + 2) * selection.h;

      selectGridHelper = new GridHelper(
        pixelToWorld(gl.camera, initHeight, roundedWidth),
        pixelToWorld(gl.camera, initHeight, roundedHeight),
        roundedWidth / selection.w,
        roundedHeight / selection.h,
        0x444444
      );

      const diffX =
        pixelToWorld(gl.camera, initHeight, roundedWidth / 2) -
        pixelToWorld(gl.camera, initHeight, width / 2);
      const diffY =
        pixelToWorld(gl.camera, initHeight, roundedHeight / 2) -
        pixelToWorld(gl.camera, initHeight, height / 2);

      selectGridHelper.position.x += diffX;
      selectGridHelper.position.y += diffY;

      // subtract cell to get full coverage
      const xOffset = (selection.x % selection.w) - selection.w;
      const yOffset = (selection.y % selection.h) - selection.h;

      selectGridHelper.position.x += pixelToWorld(
        gl.camera,
        initHeight,
        xOffset
      );
      selectGridHelper.position.y += pixelToWorld(
        gl.camera,
        initHeight,
        yOffset
      );
      selectGridHelper.position.z = 0;

      gl.scene.add(selectGridHelper);

      selectGridHelper.renderOrder = -2;
      selectGridHelper.visible =
        localStorage.getItem("showGrid") === null
          ? true
          : localStorage.getItem("showGrid") === "true";
    }

    const backgroundColor =
      localStorage.getItem("backgroundColor") || "#ffffff";
    const foregroundColor =
      localStorage.getItem("foregroundColor") || "#000000";
    const transparentBackground = false;

    const tempMeasureCanvas = document.createElement("canvas");
    // const textSizes = [16, 32, 64, 128, 256, 512];
    const textSizes = [16, 32, 64, 128, 256, 512];
    const textSources = [];
    for (let i = 0; i < textSizes.length; i++) {
      const size = textSizes[i];
      const textSource = {} as any;
      const chars =
        " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%$€¥£¢&*@#|áâàäåãæçéêèëíîìï:;-–—•,.…'\"`„‹›«»/\\?!¿¡()[]{}©®§+×=_°~^<>".split(
          ""
        );

      const ctx = tempMeasureCanvas.getContext("2d", { alpha: false })!;

      const multiplier = size / 16;
      const fs = 13.333 * multiplier;
      ctx.font = fs + "px custom";
      const container = 16 * multiplier;
      const halfContainer = container / 2;

      const toMeasure = ctx.measureText("M");
      const cw = toMeasure.width;
      const perRow = Math.floor(2048 / halfContainer);

      textSource.size = size;
      textSource.chars = chars;
      textSource.charWidth = halfContainer;
      textSource.charHeight = container;

      let chunked = [];
      const lookup = [];
      let chunk = 0;
      let offset = 0;
      for (let i = 0; i < chars.length; i++) {
        const col = i % perRow;
        let row = Math.floor(i / perRow);
        const x = col * halfContainer + halfContainer / 2 - cw / 2;
        let y = row * container;
        if (y + container > chunk * 2048) {
          chunked.push([]);
          chunk++;
          if (chunk > 1) {
            offset = y;
          }
        }
        // @ts-ignore
        chunked[chunk - 1].push([
          // @ts-ignore
          chars[i],
          // @ts-ignore
          x,
          // @ts-ignore
          y - offset,
        ]);
        lookup.push([x, y - offset, chunk - 1]);
      }

      const canvases = chunked.map((chunk) => {
        const lastRow = chunk[chunk.length - 1][2] + container;
        const canvas = document.createElement("canvas");
        canvas.width = 2040;
        canvas.height = lastRow;
        return canvas;
      });

      for (let i = 0; i < chunked.length; i++) {
        const chunk = chunked[i];
        const c = canvases[i];
        const ctx = c.getContext("2d", { alpha: false })!;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = fs + "px custom";
        ctx.fillStyle = foregroundColor;
        ctx.textBaseline = "middle";
        for (let i = 0; i < chunk.length; i++) {
          const [char, x, y] = chunk[i];
          ctx.fillText(char, x, y + halfContainer);
        }
      }

      textSource.lookup = lookup;
      textSource.chunked = chunked;
      textSource.canvases = canvases;

      textSources.push(textSource);
    }

    let main;
    // @ts-ignore
    let texture;
    {
      main = document.createElement("canvas");
      main.width = width;
      main.height = height;

      texture = new THREE.CanvasTexture(main);
      texture.minFilter = THREE.LinearFilter;

      const storageCheck = localStorage.getItem("main");
      if (storageCheck !== null) {
        const ctx = main.getContext("2d")!;
        const img = new Image();
        img.onload = function () {
          ctx.drawImage(img, 0, 0);
          // @ts-ignore
          texture.needsUpdate = true;
        };
        img.src = storageCheck;
      }

      const geometry = new THREE.PlaneBufferGeometry();
      const material = new THREE.MeshBasicMaterial({
        map: texture,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.x = pixelToWorld(gl.camera, initHeight, width);
      mesh.scale.y = pixelToWorld(gl.camera, initHeight, height);
      gl.scene.add(mesh);
      mesh.renderOrder = -3;
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    const pageCheck = localStorage.getItem("page");
    const page =
      pageCheck === null
        ? { x: 0, y: 0, w: width, h: height }
        : JSON.parse(pageCheck);

    const modeCheck = localStorage.getItem("mode");
    const mode = modeCheck === null ? "normal" : JSON.parse(modeCheck);

    const undoNumber = 17;
    const undoCanvases = [...Array(undoNumber)].map(() => {
      const c = document.createElement("canvas");
      c.width = 2048;
      c.height = 2048;
      return c;
    });

    const undoExtra = [...Array(undoNumber)].map(() => null);

    stateRef.current = proxy({
      width: 2048,
      height: 2048,
      mode,
      modes,
      gl: ref(gl),
      mousePosition: { x: 0, y: 0 },
      ray: ref(new THREE.Vector3()),
      tempRay: ref(new THREE.Vector3()),
      selection,
      returnSource: {
        x: selection.x,
        y: selection.y,
        w: selection.w,
        h: selection.h,
      },
      selectionMesh: ref(selectionMesh),
      resize: resize,
      resizeMesh: ref(resizeMesh),
      baseGrid: ref(baseGrid),
      selectGridHelper: ref(selectGridHelper),
      textSources: ref(textSources),
      main: ref(main),
      texture: ref(texture),
      nextDir: localStorage.getItem("nextDir") || "right",
      moveNext:
        localStorage.getItem("moveNext") === null
          ? true
          : localStorage.getItem("moveNext") === "true",
      fileInput: ref(fileInput),
      tempCanvas: ref(document.createElement("canvas")),
      pageMesh: ref(pageMesh),
      page: page,
      showGrid:
        localStorage.getItem("showGrid") === null
          ? true
          : localStorage.getItem("showGrid") === "true",
      foregroundColor,
      backgroundColor,
      transparentBackground,
      keyboardRef: null,
      printCanvas: ref(document.createElement("canvas")),
      backgroundSettingCanvas: ref(document.createElement("canvas")),
      imageFill: localStorage.getItem("imageFill") || "cover",
      textSizes: ref(textSizes),
      regenerateCounter: 0,
      cameraPosition: cameraPosition,
      showInfo:
        localStorage.getItem("showInfo") &&
        localStorage.getItem("showInfo") === "true"
          ? true
          : false,
      returnMesh: ref(returnMesh),
      directionMesh: ref(directionMesh),
      directionSprites: ref(directionSprites),
      initHeight: window.innerHeight,
      undoCanvases: ref(undoCanvases),
      undoStack: ref([]),
      undoExtra: ref(undoExtra),
      activeUndo: -1,
      undoCanvas: 0,
      t: {
        t0: ref(new THREE.Vector3()),
        t1: ref(new THREE.Vector3()),
        t2: ref(new THREE.Vector3()),
        t3: ref(new THREE.Vector3()),
        t4: ref(new THREE.Vector3()),
        t5: ref(new THREE.Vector3()),
        t6: ref(new THREE.Vector3()),
        t7: ref(new THREE.Vector3()),
        t8: ref(new THREE.Vector3()),
      },
    });

    setMounted(true);
  }, []);

  return mounted ? <MachineLoader state={stateRef.current as State} /> : null;
}

export default StateLoader;
