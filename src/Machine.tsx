import { useState, useRef, useEffect } from "react";
import { State } from "./State";
import { createMachine, interpret } from "xstate";
import Main from "./Main";
import { pixelToWorld, setRay, worldToCanvasPixel } from "./Utils";
import GridHelper from "./GridHelper";
import { ref, subscribe } from "valtio";
import { debounce, last } from "lodash";
import { subscribeKey } from "valtio/utils";

const modeSetting = {
  setMode_normal: {
    actions: ["setMode"],
    target: "#m.idle",
  },
  setMode_pan: {
    actions: ["setMode"],
    target: "#m.panMode",
  },
  setMode_resize: {
    actions: ["setMode"],
    target: "#m.resizeMode",
  },
  setMode_page: {
    actions: ["setMode"],
    target: "#m.pageMode",
  },
  ctrl1: {
    actions: ["setMode"],
    target: "#m.idle",
  },
  ctrl2: {
    actions: ["setMode"],
    target: "#m.panMode",
  },
  ctrl3: {
    actions: ["setMode"],
    target: "#m.resizeMode",
  },
  ctrl4: {
    actions: ["setMode"],
    target: "#m.pageMode",
  },
  escape: {
    actions: ["setMode"],
    target: "#m.idle",
  },
};

const makeStandareCommands = (target: string) => {
  return {
    mouseWheel: {
      actions: "pointZoomCanvasToMouse",
      target: target,
    },
    arrowCtrlKeyDown: {
      actions: ["ctrlResize"],
      target: target,
    },
    arrowCtrlShiftKeyDown: {
      actions: ["ctrlShiftResize"],
      target: target,
    },
    charKeyDown: {
      actions: "printLetter",
      target: target,
    },
    backspaceKeyDown: {
      actions: "backspace",
      target: target,
    },
    dragged: {
      actions: "setDraggedDirection",
      target: target,
    },
    ctrlO: {
      actions: "openImageDialog",
      target: target,
    },
    ctrlM: {
      actions: "toggleMoveNext",
      target: target,
    },
    toggleAutospaceClick: {
      actions: "toggleMoveNext",
      target: target,
    },
    ctrlG: {
      actions: "toggleGridVisibility",
      target: target,
    },
    gridButtonClick: {
      actions: "toggleGridVisibility",
      target: target,
    },
    fillButtonClick: {
      actions: "cycleFillMode",
      target: target,
    },
    ctrlF: {
      actions: "cycleFillMode",
      target: target,
    },
    ctrlP: {
      actions: "print",
      target: target,
    },
    printClick: {
      actions: "print",
      target: target,
    },
    cut: {
      actions: "cut",
      target: target,
    },
    imageButtonClick: {
      actions: "openImageDialog",
      target: target,
    },
    directionClick: {
      actions: "setSelectedDirection",
      target: target,
    },
    copy: {
      actions: "copySelection",
      target: target,
    },
    paste: {
      actions: "paste",
      target: target,
    },
    imageSelected: {
      actions: "printImageFromSrc",
      target: target,
    },
    arrowShiftKeyDown: {
      actions: ["updateReturnSource", "shiftSelection"],
      target: target,
    },
    textSettingsChange: {
      actions: "regenerateTextSource",
      target: target,
    },
    enter: {
      actions: "moveToReturn",
      target: target,
    },
    arrowKeyDown: {
      actions: ["setSelectedArrow", "updateReturnSource"],
      target: target,
    },
    zoomInClick: {
      actions: "zoomInCenter",
      target: target,
    },
    zoomOutClick: {
      actions: "zoomOutCenter",
      target: target,
    },
    ctrlPlus: {
      actions: "zoomInCenter",
      target: target,
    },
    ctrlMinus: {
      actions: "zoomOutCenter",
      target: target,
    },
    ctrlH: {
      actions: ["updateReturnSource", "setDraggedDirection"],
      target: target,
    },
    ctrlJ: {
      actions: ["updateReturnSource", "setDraggedDirection"],
      target: target,
    },
    ctrlK: {
      actions: ["updateReturnSource", "setDraggedDirection"],
      target: target,
    },
    ctrlL: {
      actions: ["updateReturnSource", "setDraggedDirection"],
      target: target,
    },
    ctrlZ: {
      actions: ["undo"],
      target: target,
    },
    ctrlShiftZ: {
      actions: ["redo"],
      target: target,
    },
    clickUndo: {
      actions: ["undo"],
      target: target,
    },
    clickRedo: {
      actions: ["redo"],
      target: target,
    },
  };
};

const pointerPanSend = (mode: string) => {
  return {
    middleMouseDown: {
      actions: "setPanOriginMouse",
      target: "#m.pointerPanning" + mode,
    },
  };
};
const pointerResizeSend = (mode: string) => {
  return {
    rightMouseDown: {
      actions: ["setResizeOriginMouse", "updateResizeMouse"],
      target: "#m.pointerResize" + mode,
    },
  };
};
const pointerPanReturn = (mode: string, returnTarget: string) => {
  return {
    ["pointerPanning" + mode]: {
      on: {
        mouseMove: {
          actions: ["setMousePosition", "panCanvasMouse"],
          target: "#m.pointerPanning" + mode,
        },
        middleMouseUp: {
          target: returnTarget,
        },
      },
    },
  };
};
const pointerResizeReturn = (mode: string, returnTarget: string) => {
  return {
    ["pointerResize" + mode]: {
      on: {
        mouseMove: {
          actions: ["setMousePosition", "updateResizeMouse"],
          target: "#m.pointerResize" + mode,
        },
        rightMouseUp: {
          actions: "finishResize",
          target: returnTarget,
        },
      },
    },
  };
};

const machineSpec = {
  id: "m",
  initial: "idle",
  states: {
    idle: {
      on: {
        mouseMove: {
          actions: "setMousePosition",
          target: "#m.idle",
        },
        leftMouseDown: {
          actions: ["setMouseSelected", "updateReturnSource"],
          target: "#m.idle",
        },
        space: {
          actions: "preventSpaceFocus",
          target: "#m.idle",
        },
        ...pointerResizeSend("normal"),
        ...pointerPanSend("normal"),
        ...makeStandareCommands("#m.idle"),
        ...modeSetting,
      },
    },
    ...pointerPanReturn("normal", "#m.idle"),
    ...pointerResizeReturn("normal", "#m.idle"),
    panMode: {
      on: {
        mouseMove: {
          actions: ["setMousePosition"],
          target: "#m.panMode",
        },
        leftMouseDown: {
          actions: ["setPanOriginMouse"],
          target: "#m.panModePanning",
        },
        ...pointerResizeSend("pan"),
        ...pointerPanSend("pan"),
        ...makeStandareCommands("#m.panMode"),
        ...modeSetting,
      },
    },
    ...pointerPanReturn("pan", "#m.panMode"),
    ...pointerResizeReturn("pan", "#m.panMode"),
    panModePanning: {
      on: {
        mouseMove: {
          actions: ["setMousePosition", "panCanvasMouse"],
          target: "#m.panModePanning",
        },
        leftMouseUp: {
          target: "#m.panMode",
        },
      },
    },
    resizeMode: {
      on: {
        mouseMove: {
          actions: ["setMousePosition"],
          target: "#m.resizeMode",
        },
        leftMouseDown: {
          actions: ["setResizeOriginMouse", "updateResizeMouse"],
          target: "#m.resizeModeResizing",
        },
        ...pointerResizeSend("resize"),
        ...pointerPanSend("resize"),
        ...makeStandareCommands("#m.resizeMode"),
        ...modeSetting,
      },
    },
    ...pointerPanReturn("resize", "#m.resizeMode"),
    ...pointerResizeReturn("resize", "#m.resizeMode"),
    resizeModeResizing: {
      on: {
        mouseMove: {
          actions: ["setMousePosition", "updateResizeMouse"],
          target: "#m.resizeModeResizing",
        },
        leftMouseUp: {
          actions: "finishResize",
          target: "#m.resizeMode",
        },
      },
    },
    pageMode: {
      on: {
        mouseMove: {
          actions: ["setMousePosition"],
          target: "#m.pageMode",
        },
        leftMouseDown: {
          actions: ["setPageOrigin", "updatePage"],
          target: "#m.pageModePaging",
        },
        ...pointerResizeSend("page"),
        ...pointerPanSend("page"),
        ...makeStandareCommands("#m.pageMode"),
        ...modeSetting,
      },
    },
    ...pointerPanReturn("page", "#m.pageMode"),
    ...pointerResizeReturn("page", "#m.pageMode"),
    pageModePaging: {
      on: {
        mouseMove: {
          actions: ["setMousePosition", "updatePage"],
          target: "#m.pageModePaging",
        },
        leftMouseUp: {
          actions: "finishPageResize",
          target: "#m.pageMode",
        },
      },
    },
  },
};

const setSelectionXY = (state: State, x: number, y: number) => {
  setRay(state, x, y);
  const [px, py] = worldToCanvasPixel(state, state.ray);
  const offsetX = state.selection.x % state.selection.w;
  const offsetY = state.selection.y % state.selection.h;
  let pointX = px;
  let pointY = py;
  pointX -= offsetX;
  pointY -= offsetY;
  pointX = Math.floor(pointX / state.selection.w) * state.selection.w + offsetX;
  pointY = Math.floor(pointY / state.selection.h) * state.selection.h + offsetY;
  state.selection.x = pointX;
  state.selection.y = pointY;
};
const zoomAdjust = (state: State) => {
  let distance = state.gl.camera.position.distanceTo(state.returnMesh.position);
  state.returnMesh.scale.set(distance / 5, distance / 5, 1);
};
const pointZoomCanvas = (
  state: State,
  x: number,
  y: number,
  deltaY: number
) => {
  const { camera, canvas } = state.gl;
  const { t0 } = state.t;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  t0.copy(camera.position);
  const percent = (height - deltaY) / height;
  const nextZoom = Math.min(32, Math.max(0.5, camera.position.z / percent));
  const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * t0.z;
  const zoomPixel = visibleHeight / height;
  const relx = x - width / 2;
  const rely = -(y - height / 2);
  const worldRelX = relx * zoomPixel;
  const worldRelY = rely * zoomPixel;
  const newVisibleHeight =
    2 * Math.tan((camera.fov * Math.PI) / 360) * nextZoom;
  const newZoomPixel = newVisibleHeight / height;
  const newWorldX = relx * newZoomPixel;
  const newWorldY = rely * newZoomPixel;
  const diffX = newWorldX - worldRelX;
  const diffY = newWorldY - worldRelY;
  state.cameraPosition.x = t0.x - diffX;
  state.cameraPosition.y = t0.y - diffY;
  state.cameraPosition.z = nextZoom;
  zoomAdjust(state);
};
const zoomInCenter = (state: State) => {
  const { camera, canvas } = state.gl;
  const height = canvas.clientHeight;
  const percent = (height + 32 * 4) / height;
  const nextZoom = Math.min(32, Math.max(0.5, camera.position.z / percent));
  state.cameraPosition.z = nextZoom;
  zoomAdjust(state);
};
const zoomOutCenter = (state: State) => {
  const { camera, canvas } = state.gl;
  const height = canvas.clientHeight;
  const percent = (height - 32 * 4) / height;
  const nextZoom = Math.min(32, Math.max(0.5, camera.position.z / percent));
  state.cameraPosition.z = nextZoom;
  zoomAdjust(state);
};

const renderSelection = (state: State) => {
  const { width, height, selection, selectionMesh } = state;
  const { camera, canvas } = state.gl;
  selectionMesh.scale.x = pixelToWorld(camera, state.initHeight, selection.w);
  selectionMesh.scale.y = pixelToWorld(camera, state.initHeight, selection.h);
  selectionMesh.position.x = pixelToWorld(
    camera,
    state.initHeight,
    selection.x + selection.w / 2 - width / 2
  );
  selectionMesh.position.y = pixelToWorld(
    camera,
    state.initHeight,
    -(selection.y + selection.h / 2 - height / 2)
  );

  // state.app.readout.innerText = `${selection.x},${selection.y} ${selection.w}x${selection.h}`;
};
const setPanOrigin = (state: State, x: number, y: number) => {
  state.t.t0.copy(state.gl.camera.position);
  state.t.t1.set(x, y, 0);
};
const panCanvas = (state: State, x: number, y: number) => {
  const visibleHeight =
    2 * Math.tan((state.gl.camera.fov * Math.PI) / 360) * state.t.t0.z;
  const zoomPixel = visibleHeight / state.gl.canvas.clientHeight;
  const diffX = x - state.t.t1.x;
  const diffY = y - state.t.t1.y;
  state.cameraPosition.x = state.t.t0.x - diffX * zoomPixel;
  state.cameraPosition.y = state.t.t0.y + diffY * zoomPixel;
};
const setResizeOrigin = (state: State, x: number, y: number) => {
  setRay(state, x, y);
  state.t.t0.copy(state.ray);
  state.resizeMesh.visible = true;
  state.baseGrid.visible = true;
};
const updateResize = (state: State, x: number, y: number) => {
  setRay(state, x, y);
  state.t.t1.copy(state.ray);
  // min
  state.t.t2.copy(state.t.t0).min(state.t.t1); // max
  state.t.t3.copy(state.t.t0).max(state.t.t1);
  let [minX, maxY] = worldToCanvasPixel(state, state.t.t2);
  let [maxX, minY] = worldToCanvasPixel(state, state.t.t3);
  minX = Math.floor(minX / 16) * 16;
  minY = Math.floor(minY / 16) * 16;
  maxY = Math.ceil(maxY / 16) * 16;
  maxX = Math.ceil(maxX / 16) * 16;
  const diffX = maxX - minX;
  const diffY = maxY - minY;
  state.resize.x = minX;
  state.resize.y = minY;
  state.resize.w = diffX;
  state.resize.h = diffY;
};
const renderResizing = (state: State) => {
  const { width, height, resize, resizeMesh } = state;
  const { camera, canvas } = state.gl;
  resizeMesh.scale.x = pixelToWorld(camera, state.initHeight, resize.w);
  resizeMesh.scale.y = pixelToWorld(camera, state.initHeight, resize.h);
  resizeMesh.position.x = pixelToWorld(
    camera,
    state.initHeight,
    resize.x + resize.w / 2 - width / 2
  );
  resizeMesh.position.y = pixelToWorld(
    camera,
    state.initHeight,
    -(resize.y + resize.h / 2 - height / 2)
  );
};
const copy = (state: State) => {
  state.tempCanvas.width = state.selection.w;
  state.tempCanvas.height = state.selection.h;
  const ctx = state.tempCanvas.getContext("2d", { alpha: false })!;
  ctx.drawImage(
    state.main,
    state.selection.x,
    state.selection.y,
    state.selection.w,
    state.selection.h,
    0,
    0,
    state.selection.w,
    state.selection.h
  );
  ctx.canvas.toBlob((blob) => {
    navigator.clipboard.write([new ClipboardItem({ "image/png": blob! })]);
  });
};

export const rerenderGrid = (state: State) => {
  let selectGridHelper;
  const { width, height } = state;
  const { camera, canvas, scene } = state.gl;
  const { selection } = state;
  {
    const roundedWidth = Math.ceil(width / selection.w + 2) * selection.w;
    const roundedHeight = Math.ceil(height / selection.h + 2) * selection.h;

    selectGridHelper = new GridHelper(
      pixelToWorld(camera, state.initHeight, roundedWidth),
      pixelToWorld(camera, state.initHeight, roundedHeight),
      roundedWidth / selection.w,
      roundedHeight / selection.h,
      0x444444
    );

    const diffX =
      pixelToWorld(camera, state.initHeight, roundedWidth / 2) -
      pixelToWorld(camera, state.initHeight, width / 2);
    const diffY =
      pixelToWorld(camera, state.initHeight, roundedHeight / 2) -
      pixelToWorld(camera, state.initHeight, height / 2);

    selectGridHelper.position.x += diffX;
    selectGridHelper.position.y += diffY;

    // subtract cell to get full coverage
    const xOffset = (selection.x % selection.w) - selection.w;
    const yOffset = ((height - selection.y) % selection.h) - selection.h;

    selectGridHelper.position.x += pixelToWorld(
      camera,
      state.initHeight,
      xOffset
    );
    selectGridHelper.position.y += pixelToWorld(
      camera,
      state.initHeight,
      yOffset
    );
    selectGridHelper.position.z = 0;

    scene.remove(state.selectGridHelper);
    scene.add(selectGridHelper);
    state.selectGridHelper = ref(selectGridHelper);

    selectGridHelper.renderOrder = -2;

    selectGridHelper.visible = state.showGrid;
  }
};
const finishResize = (state: State) => {
  state.resizeMesh.visible = false;
  state.selection.x = state.resize.x;
  state.selection.y = state.resize.y;
  state.selection.w = state.resize.w;
  state.selection.h = state.resize.h;

  rerenderGrid(state);

  renderSelection(state);
  state.baseGrid.visible = false;
};
const moveSelectionNext = (state: State) => {
  if (!state.moveNext) return;
  if (state.nextDir === "right") {
    state.selection.x += state.selection.w;
  } else if (state.nextDir === "down") {
    state.selection.y += state.selection.h;
  } else if (state.nextDir === "left") {
    state.selection.x -= state.selection.w;
  } else if (state.nextDir === "up") {
    state.selection.y -= state.selection.h;
  }
};
const moveSelectionNextReverse = (state: State) => {
  if (!state.moveNext) return;
  if (state.nextDir === "right") {
    state.selection.x -= state.selection.w;
  } else if (state.nextDir === "down") {
    state.selection.y -= state.selection.h;
  } else if (state.nextDir === "left") {
    state.selection.x += state.selection.w;
  } else if (state.nextDir === "up") {
    state.selection.y += state.selection.h;
  }
};
const setPageOrigin = (state: State, x: number, y: number) => {
  setRay(state, x, y);
  state.t.t0.copy(state.ray);
  state.pageMesh.visible = true;
  state.baseGrid.visible = true;
};
const updatePage = (state: State, x: number, y: number) => {
  setRay(state, x, y);
  state.t.t1.copy(state.ray);
  // min
  state.t.t2.copy(state.t.t0).min(state.t.t1);
  // max
  state.t.t3.copy(state.t.t0).max(state.t.t1);
  let [minX, maxY] = worldToCanvasPixel(state, state.t.t2);
  let [maxX, minY] = worldToCanvasPixel(state, state.t.t3);
  const minMax = (val: number) => Math.min(Math.max(0, val), state.width);
  minX = minMax(Math.floor(minX / 16) * 16);
  minY = minMax(Math.floor(minY / 16) * 16);
  maxY = minMax(Math.ceil(maxY / 16) * 16);
  maxX = minMax(Math.ceil(maxX / 16) * 16);
  const diffX = maxX - minX;
  const diffY = maxY - minY;
  state.page.x = minX;
  state.page.y = minY;
  state.page.w = diffX;
  state.page.h = diffY;
};
const renderPage = (state: State) => {
  const { width, height, page, pageMesh } = state;
  const { camera } = state.gl;
  pageMesh.scale.x = pixelToWorld(camera, state.initHeight, page.w);
  pageMesh.scale.y = pixelToWorld(camera, state.initHeight, page.h);
  pageMesh.position.x = pixelToWorld(
    camera,
    state.initHeight,
    page.x + page.w / 2 - width / 2
  );
  pageMesh.position.y = pixelToWorld(
    camera,
    state.initHeight,
    -(page.y + page.h / 2 - height / 2)
  );
};
const toggleGridVisibility = (state: State) => {
  state.showGrid = !state.showGrid;
  localStorage.setItem("showGrid", state.showGrid.toString());
  state.selectGridHelper.visible = !state.selectGridHelper.visible;
};
const regenerateTextSource = (state: State) => {
  const textSources = [];
  for (const size of state.textSizes) {
    const textSource = {} as any;
    const chars =
      " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%$€¥£¢&*@#|áâàäåãæçéêèëíîìï:;-–—•,.…'\"`„‹›«»/\\?!¿¡()[]{}©®§+×=_°~^<>".split(
        ""
      );
    const textCanvas = document.createElement("canvas");

    const ctx = textCanvas.getContext("2d", { alpha: false })!;

    const multiplier = size / 16;
    const fs = 13.333 * multiplier;
    ctx.font = fs + "px custom";
    const container = 16 * multiplier;
    const halfContainer = container / 2;

    const toMeasure = ctx.measureText("M");
    const cw = toMeasure.width;
    ctx.canvas.width = 2048;
    const rows = Math.ceil((chars.length * halfContainer) / ctx.canvas.width);
    ctx.canvas.height = rows * container;
    const perRow = Math.floor(ctx.canvas.width / cw);

    textSource.chars = chars;
    textSource.textCols = perRow;
    textSource.charWidth = halfContainer;
    textSource.charHeight = container;
    textSource.canvas = textCanvas;

    const c = ctx.canvas;

    ctx.font = fs + "px custom";

    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.fillStyle = state.foregroundColor;
    ctx.textBaseline = "middle";
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      ctx.fillText(
        char,
        col * halfContainer + halfContainer / 2 - cw / 2,
        row * container + container / 2
      );
    }
    textSources.push(textSource);
  }
  state.textSources = ref(textSources);
  state.regenerateCounter = state.regenerateCounter + 1;
};
const renderReturnToNext = (state: State) => {
  let x = 0;
  let y = 0;
  if (state.nextDir === "right") {
    x = state.returnSource.x;
    y = state.returnSource.y + state.returnSource.h / 2;
  } else if (state.nextDir === "down") {
    x = state.returnSource.x + state.returnSource.w / 2;
    y = state.returnSource.y;
  } else if (state.nextDir === "left") {
    x = state.returnSource.x + state.returnSource.w;
    y = state.returnSource.y + state.returnSource.h / 2;
  } else if (state.nextDir === "up") {
    x = state.returnSource.x + state.returnSource.w / 2;
    y = state.returnSource.y + state.returnSource.h;
  }
  state.returnMesh.position.x = pixelToWorld(
    state.gl.camera,
    state.initHeight,
    x - state.width / 2
  );
  state.returnMesh.position.y = pixelToWorld(
    state.gl.camera,
    state.initHeight,
    -(y - state.height / 2)
  );
};
const setReturnSourceToSelection = (state: State) => {
  state.returnSource.x = state.selection.x;
  state.returnSource.y = state.selection.y;
  state.returnSource.w = state.selection.w;
  state.returnSource.h = state.selection.h;
  renderReturnToNext(state);
};
const saveUndoState = (state: State) => {
  const indexOf = state.undoStack.indexOf(state.undoStack[state.activeUndo]);
  state.undoStack = state.undoStack.slice(0, indexOf + 1);

  let lastCanvas = state.undoStack[state.activeUndo];
  if (lastCanvas === undefined) lastCanvas = -1;

  const nextCanvas = (lastCanvas + 1) % state.undoCanvases.length;
  const undoCanvas = state.undoCanvases[nextCanvas];
  const ctx = undoCanvas.getContext("2d")!;
  ctx.drawImage(state.main, 0, 0, 2048, 2048);

  const extra = {
    selection: Object.assign({}, state.selection),
    returnSource: Object.assign({}, state.returnSource),
  };
  state.undoExtra[nextCanvas] = ref(extra);

  state.undoStack = state.undoStack.slice(-(state.undoCanvases.length - 1));
  state.undoStack.push(nextCanvas);
  state.activeUndo = state.undoStack.length - 1;
};
const updateTexture = (state: State) => {
  state.texture.needsUpdate = true;
};
const setMode = (state: State, e: { mode: string }) => {
  // @ts-ignore
  state.mode = e.mode;
  if (state.mode === "page") {
    state.pageMesh.setColor(0xffff00);
    state.baseGrid.visible = true;
  } else if (state.mode === "normal") {
    if (state.keyboardRef && state.keyboardRef.current) {
      state.keyboardRef.current.focus();
    }
  }
  if (state.mode !== "page") {
    state.pageMesh.setColor(0x666666);
    state.baseGrid.visible = false;
  }
};

function MachineLoader({ state }: { state: State }) {
  const [mounted, setMounted] = useState(false);
  const mRef = useRef<any>();
  const debounced = debounce(regenerateTextSource, 200);

  useEffect(() => {
    const machine = createMachine(machineSpec, {
      actions: {
        setMousePosition: (_, e) => {
          state.mousePosition = e.mousePosition;
        },
        pointZoomCanvasToMouse: (_: any, e: any) => {
          const { x, y } = state.mousePosition;
          pointZoomCanvas(state, x, y, e.deltaY);
        },
        setMouseSelected: () => {
          const { x, y } = state.mousePosition;
          setRay(state, x, y);
          const canvasRay = worldToCanvasPixel(state, state.ray);
          if (state.keyboardRef && state.keyboardRef.current) {
            state.keyboardRef.current.focus();
          }
          // if (
          //   canvasRay[0] >= state.selection.x &&
          //   canvasRay[0] <= state.selection.x + state.selection.w &&
          //   canvasRay[1] >= state.selection.y &&
          //   canvasRay[1] <= state.selection.y + state.selection.h &&
          //   state.selection.x === state.returnSource.x &&
          //   state.selection.y === state.returnSource.y &&
          //   state.selection.w === state.returnSource.w &&
          //   state.selection.h === state.returnSource.h
          // ) {
          //   // @ts-ignore
          //   state.nextDir = nextDirObj[state.nextDir];
          //   renderReturnToNext(state);
          // } else {
          setSelectionXY(state, x, y);
          renderSelection(state);
          // }
        },
        setPanOriginMouse: () => {
          const { x, y } = state.mousePosition;
          setPanOrigin(state, x, y);
        },
        panCanvasMouse: () => {
          const { x, y } = state.mousePosition;
          panCanvas(state, x, y);
        },
        setResizeOriginMouse: () => {
          const { x, y } = state.mousePosition;
          setResizeOrigin(state, x, y);
        },
        updateResizeMouse: () => {
          const { x, y } = state.mousePosition;
          updateResize(state, x, y);
          renderResizing(state);
        },
        finishResize: () => {
          finishResize(state);
          setReturnSourceToSelection(state);
        },
        setSelectedArrow: (_: any, e: any) => {
          if (e.key === "ArrowUp") {
            state.selection.y -= state.selection.h;
          } else if (e.key === "ArrowDown") {
            state.selection.y += state.selection.h;
          } else if (e.key === "ArrowLeft") {
            state.selection.x -= state.selection.w;
          } else if (e.key === "ArrowRight") {
            state.selection.x += state.selection.w;
          }
          renderSelection(state);
        },
        setMode: (_: any, e: any) => {
          setMode(state, e);
        },
        printLetter: (_: any, e: any) => {
          const width = state.selection.w;
          const height = state.selection.h;
          const max = Math.max(width * 2, height);
          let textSize = 16;
          let counter = 0;
          for (const size of state.textSizes) {
            if (size >= max) {
              textSize = size;
              break;
            }
            counter++;
          }
          if (counter === state.textSizes.length) {
            textSize = state.textSizes[state.textSizes.length - 1];
          }
          const sizeIndex = state.textSizes.indexOf(textSize);
          const char = e.key;
          const textSource = state.textSources[sizeIndex];
          const index = textSource.chars.indexOf(char);
          const c = index % textSource.textCols;
          const r = Math.floor(index / textSource.textCols);
          const sx = c * textSource.charWidth;
          const sy = r * textSource.charHeight;
          const ctx = state.main.getContext("2d", { alpha: false })!;
          ctx.drawImage(
            textSource.canvas,
            sx,
            sy,
            textSource.charWidth,
            textSource.charHeight,
            state.selection.x,
            state.selection.y,
            state.selection.w,
            state.selection.h
          );
          updateTexture(state);
          moveSelectionNext(state);
          renderSelection(state);
          saveUndoState(state);
        },
        backspace: () => {
          moveSelectionNextReverse(state);
          const ctx = state.main.getContext("2d", { alpha: false })!;
          ctx.fillStyle = "black";
          ctx.fillRect(
            state.selection.x,
            state.selection.y,
            state.selection.w,
            state.selection.h
          );
          updateTexture(state);
          renderSelection(state);
          saveUndoState(state);
        },
        setSelectedDirection: (_: any, e: any) => {
          state.nextDir = e.direction;
          localStorage.setItem("nextDir", state.nextDir);
          renderReturnToNext(state);
        },
        setNextDirection: (_: any, e: any) => {
          state.nextDir = e.key.toLowerCase().replace("arrow", "");
          localStorage.setItem("nextDir", state.nextDir);
          renderSelection(state);
          renderReturnToNext(state);
        },
        shiftSelection: (_: any, e: any) => {
          if (e.key === "ArrowUp") {
            state.selection.y -= 16;
          } else if (e.key === "ArrowDown") {
            state.selection.y += 16;
          } else if (e.key === "ArrowLeft") {
            state.selection.x -= 16;
          } else if (e.key === "ArrowRight") {
            state.selection.x += 16;
          }
          renderSelection(state);
          rerenderGrid(state);
          setReturnSourceToSelection(state);
          renderReturnToNext(state);
        },
        openImageDialog: (_: any) => {
          state.fileInput.dispatchEvent(
            new PointerEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
        },
        printImageFromSrc: (_: any, e: any) => {
          const src = e.src;
          const img = new Image();
          img.onload = () => {
            const ctx = state.main.getContext("2d", { alpha: false });
            if (!ctx) return;
            const aspect = img.width / img.height;
            const dstAspect = state.selection.w / state.selection.h;

            ctx.clearRect(
              state.selection.x,
              state.selection.y,
              state.selection.w,
              state.selection.h
            );

            let dstW = state.selection.w;
            let dstH = state.selection.h;
            if (state.imageFill === "cover") {
              const tempCanvas = state.tempCanvas;
              if (aspect > dstAspect) {
                dstW = state.selection.h * aspect;
              } else {
                dstH = state.selection.w / aspect;
              }
              tempCanvas.width = state.selection.w;
              tempCanvas.height = state.selection.h;
              const tempCtx = tempCanvas.getContext("2d", { alpha: false });
              tempCtx!.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                state.selection.w / 2 - dstW / 2,
                state.selection.h / 2 - dstH / 2,
                dstW,
                dstH
              );
              ctx.drawImage(
                tempCanvas,
                0,
                0,
                tempCanvas.width,
                tempCanvas.height,
                state.selection.x,
                state.selection.y,
                state.selection.w,
                state.selection.h
              );
              updateTexture(state);
              moveSelectionNext(state);
              renderSelection(state);
              saveUndoState(state);
              return;
            } else if (state.imageFill === "contain") {
              if (aspect > dstAspect) {
                dstH = state.selection.w / aspect;
              } else {
                dstW = state.selection.h * aspect;
              }
            }

            ctx.drawImage(
              img,
              0,
              0,
              img.width,
              img.height,
              state.selection.x + state.selection.w / 2 - dstW / 2,
              state.selection.y + state.selection.h / 2 - dstH / 2,
              dstW,
              dstH
            );
            updateTexture(state);
            moveSelectionNext(state);
            renderSelection(state);
            saveUndoState(state);
          };
          img.src = src;
        },
        toggleMoveNext: () => {
          state.moveNext = !state.moveNext;
          localStorage.setItem("moveNext", state.moveNext ? "true" : "false");
        },
        copySelection: (_: any) => {
          copy(state);
        },
        cut: () => {
          copy(state);
          const ctx = state.main.getContext("2d", { alpha: false })!;
          ctx.fillStyle = "black";
          ctx.fillRect(
            state.selection.x,
            state.selection.y,
            state.selection.w,
            state.selection.h
          );
          updateTexture(state);
          renderSelection(state);
        },
        paste: (_: any, e: any) => {
          const clipboardData = e.clipboardData;
          for (const item of clipboardData.items) {
            if (item.type.indexOf("image") !== -1) {
              const blob = item.getAsFile();
              const url = URL.createObjectURL(blob);
              m.send("imageSelected", { src: url });
            }
          }
        },
        setPageOrigin: () => {
          // state.pageMesh.setColor(0xffff00);
          const { x, y } = state.mousePosition;
          setPageOrigin(state, x, y);
          renderPage(state);
        },
        updatePage: () => {
          const { x, y } = state.mousePosition;
          updatePage(state, x, y);
          renderPage(state);
        },
        finishPageResize: () => {
          // state.pageMesh.setColor(0x666666);
          state.baseGrid.visible = false;
        },
        toggleGridVisibility: () => {
          toggleGridVisibility(state);
        },
        regenerateTextSource: () => {
          debounced(state);
        },
        cycleFillMode: () => {
          let next = "contain";
          if (state.imageFill === "fill") {
            next = "contain";
          } else if (state.imageFill === "contain") {
            next = "cover";
          } else if (state.imageFill === "cover") {
            next = "fill";
          }
          state.imageFill = next as "fill" | "contain" | "cover";
          localStorage.setItem("imageFill", state.imageFill);
        },
        updateReturnSource: (_: any, e: any) => {
          setReturnSourceToSelection(state);
        },
        ctrlResize: (_: any, e: any) => {
          const direction = e.key.toLowerCase().replace("arrow", "");
          let dx = 0;
          let dy = 0;
          if (direction === "left") {
            dx = -1;
          } else if (direction === "right") {
            dx = 1;
          } else if (direction === "up") {
            dy = -1;
          } else if (direction === "down") {
            dy = 1;
          }
          state.selection.w += dx * 16;
          state.selection.h += dy * 16;
          state.selection.w = Math.max(state.selection.w, 16);
          state.selection.h = Math.max(state.selection.h, 16);
          renderSelection(state);
          setReturnSourceToSelection(state);
          rerenderGrid(state);
        },
        ctrlShiftResize: (_: any, e: any) => {
          const direction = e.key.toLowerCase().replace("arrow", "");
          let dx = 0;
          let dy = 0;
          if (direction === "left") {
            dx = -1;
          } else if (direction === "right") {
            dx = 1;
          } else if (direction === "up") {
            dy = -1;
          } else if (direction === "down") {
            dy = 1;
          }
          if (state.selection.w - dx * 16 < 16) {
            dx = 0;
          }
          if (state.selection.h - dy * 16 < 16) {
            dy = 0;
          }
          state.selection.w -= dx * 16;
          state.selection.h -= dy * 16;
          state.selection.x += dx * 16;
          state.selection.y += dy * 16;
          renderSelection(state);
          setReturnSourceToSelection(state);
          rerenderGrid(state);
        },
        moveToReturn: () => {
          if (state.nextDir === "right") {
            state.selection.y += state.selection.h;
            state.selection.x = state.returnSource.x;
          }
          if (state.nextDir === "left") {
            state.selection.y += state.selection.h;
            state.selection.x = state.returnSource.x;
          }
          if (state.nextDir === "up") {
            state.selection.x += state.selection.w;
            state.selection.y = state.returnSource.y;
          }
          if (state.nextDir === "down") {
            state.selection.x += state.selection.w;
            state.selection.y = state.returnSource.y;
          }
          setReturnSourceToSelection(state);
          renderSelection(state);
        },
        zoomInCenter: () => {
          zoomInCenter(state);
        },
        zoomOutCenter: () => {
          zoomOutCenter(state);
        },
        undo: () => {
          if (state.activeUndo > 0) {
            const lastCanvas = state.undoStack[state.activeUndo - 1];
            const extra = state.undoExtra[lastCanvas];
            state.selection = { ...extra.selection };
            state.returnSource = { ...extra.returnSource };
            renderSelection(state);
            renderReturnToNext(state);
            const ctx = state.main.getContext("2d")!;
            ctx.drawImage(
              state.undoCanvases[lastCanvas],
              0,
              0,
              2048,
              2048,
              0,
              0,
              2048,
              2048
            );
            state.activeUndo--;
            state.texture.needsUpdate = true;
          }
        },
        redo: () => {
          if (state.activeUndo + 1 < state.undoStack.length) {
            const lastCanvas = state.undoStack[state.activeUndo + 1];
            const extra = state.undoExtra[lastCanvas];
            state.selection = { ...extra.selection };
            state.returnSource = { ...extra.returnSource };
            renderSelection(state);
            renderReturnToNext(state);
            const ctx = state.main.getContext("2d")!;
            ctx.drawImage(
              state.undoCanvases[lastCanvas],
              0,
              0,
              2048,
              2048,
              0,
              0,
              2048,
              2048
            );
            state.activeUndo++;
            state.texture.needsUpdate = true;
          }
        },

        setDraggedDirection: (_: any, e: any) => {
          const direction = e.direction;
          if (direction === "left") {
            state.nextDir = "left";
          } else if (direction === "right") {
            state.nextDir = "right";
          } else if (direction === "up") {
            state.nextDir = "up";
          } else if (direction === "down") {
            state.nextDir = "down";
          }
          localStorage.setItem("nextDir", state.nextDir);
          renderReturnToNext(state);
        },
        print: () => {
          const printCanvas = state.printCanvas;
          printCanvas.width = state.page.w;
          printCanvas.height = state.page.h;
          const ctx = printCanvas.getContext("2d", { alpha: false });
          if (!ctx) return;
          ctx.drawImage(
            state.main,
            state.page.x,
            state.page.y,
            state.page.w,
            state.page.h,
            0,
            0,
            state.page.w,
            state.page.h
          );
          printCanvas.toBlob(async (blob) => {
            const imageURL = URL.createObjectURL(blob!);
            let link = document.createElement("a");
            link.setAttribute(
              "download",
              "grid-" + Math.round(new Date().getTime() / 1000) + ".png"
            );
            link.setAttribute("href", imageURL);
            link.dispatchEvent(
              new MouseEvent(`click`, {
                bubbles: true,
                cancelable: true,
                view: window,
              })
            );
          });
        },
      },
    });

    const m = interpret(machine);
    m.start();
    mRef.current = m;

    const selectionStorageCheck = localStorage.getItem("selection");
    if (selectionStorageCheck) {
      const selection = JSON.parse(selectionStorageCheck);
      state.selection = selection;
    } else {
      setSelectionXY(state, 128, 128);
    }
    renderSelection(state);
    const returnSourceCheck = localStorage.getItem("returnSource");
    if (returnSourceCheck) {
      state.returnSource = JSON.parse(returnSourceCheck);
    } else {
      setReturnSourceToSelection(state);
    }
    renderReturnToNext(state);

    const cameraStorageCheck = localStorage.getItem("cameraPosition");
    if (cameraStorageCheck) {
      const cameraPosition = JSON.parse(cameraStorageCheck);
      state.cameraPosition = cameraPosition;
      state.gl.camera.position.x = cameraPosition.x;
      state.gl.camera.position.y = cameraPosition.y;
      state.gl.camera.position.z = cameraPosition.z;
    }

    renderPage(state);
    m.send("setMode_" + state.mode, { mode: state.mode });

    // Init
    state.selectionMesh.visible = true;
    state.returnMesh.visible = true;
    zoomAdjust(state);
    rerenderGrid(state);

    saveUndoState(state);

    setMounted(true);

    const unsubscribeSelection = subscribe(state.selection, () => {
      localStorage.setItem("selection", JSON.stringify(state.selection));
    });
    const unsubscribeCameraPosition = subscribe(state.cameraPosition, () => {
      state.gl.camera.position.x = state.cameraPosition.x;
      state.gl.camera.position.y = state.cameraPosition.y;
      state.gl.camera.position.z = state.cameraPosition.z;
      localStorage.setItem(
        "cameraPosition",
        JSON.stringify(state.cameraPosition)
      );
    });
    const unsubscribeReturnSource = subscribe(state.returnSource, () => {
      localStorage.setItem("returnSource", JSON.stringify(state.returnSource));
    });
    const unsubscribePage = subscribe(state.page, () => {
      localStorage.setItem("page", JSON.stringify(state.page));
    });
    const unsubscribeMode = subscribeKey(state, "mode", () => {
      localStorage.setItem("mode", JSON.stringify(state.mode));
    });

    // Sync data image
    const interval = setInterval(() => {
      const dataURL = state.main.toDataURL("image/png");
      localStorage.setItem("main", dataURL);
    }, 3000);

    return () => {
      unsubscribeSelection();
      unsubscribeCameraPosition();
      unsubscribeReturnSource();
      unsubscribePage();
      unsubscribeMode();
      clearInterval(interval);
    };
  }, []);

  return mounted ? <Main state={state} m={mRef.current} /> : null;
}

export default MachineLoader;
