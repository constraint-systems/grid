import { useEffect, useRef, useState } from "react";
import { State } from "./State";
import { subscribe, useSnapshot, ref } from "valtio";
import * as THREE from "three";

const isDarwin = () => {
  return /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
};

const metaKey = (e: KeyboardEvent | React.KeyboardEvent) => {
  return isDarwin() ? e.metaKey : e.ctrlKey;
};

const meta = (string: string) => {
  return isDarwin() ? string.replace("ctrl", "cmd") : string;
};

function ButtonImg({
  src,
  style,
  onClick,
  className,
}: {
  src: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={"buttonImg " + className}
      style={{
        width: 40,
        height: 40,
        backgroundColor: "white",
        backgroundImage: `url(${src})`,
        backgroundSize: "32px 32px",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        ...style,
      }}
      draggable={false}
      onClick={onClick}
    />
  );
}

export const nextDirObj = {
  right: "down",
  down: "left",
  left: "up",
  up: "right",
};

function Main({ m, state }: { m: any; state: State }) {
  const readoutRef = useRef<HTMLDivElement | null>(null);
  const backgroundSettingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const foregroundSettingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const snap = useSnapshot(state);
  const keyboardRef = useRef<HTMLInputElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const dragRef = useRef(false);

  const pointersRef = useRef<{ [key: string]: { x: number; y: number } }>({});
  const pointersDownRef = useRef<{ [key: string]: { x: number; y: number } }>(
    {}
  );
  const cameraDownRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    const handleMouseDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      pointersRef.current[e.pointerId] = { x: e.clientX, y: e.clientY };
      pointersDownRef.current[e.pointerId] = { x: e.clientX, y: e.clientY };

      const pointerIds = Object.keys(pointersRef.current);
      if (pointerIds.length === 2) {
        state.keyboardRef?.current?.blur();
        cameraDownRef.current.copy(state.gl.camera.position);
        return;
      }

      if (e.button === 0) {
        dragRef.current = true;
      }

      if (e.pointerType === "touch") {
        setTimeout(() => {
          if (Object.keys(pointersRef.current).length < 2) {
            m.send("mouseMove", {
              mousePosition: { x: e.clientX, y: e.clientY },
            });
            if (e.button === 0) {
              m.send("leftMouseDown");
            } else if (e.button === 1) {
              m.send("middleMouseDown", { x: e.clientX, y: e.clientY });
            } else if (e.button === 2) {
              m.send("rightMouseDown", { x: e.clientX, y: e.clientY });
            }
          }
        }, 40);
      } else {
        m.send("mouseMove", {
          mousePosition: { x: e.clientX, y: e.clientY },
        });
        if (e.button === 0) {
          m.send("leftMouseDown");
        } else if (e.button === 1) {
          m.send("middleMouseDown", { x: e.clientX, y: e.clientY });
        } else if (e.button === 2) {
          m.send("rightMouseDown", { x: e.clientX, y: e.clientY });
        }
      }
    };
    const handleMouseUp = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.button === 0) {
        dragRef.current = false;
      }

      if (e.button === 0) {
        m.send("leftMouseUp", { x: e.clientX, y: e.clientY });
      } else if (e.button === 1) {
        m.send("middleMouseUp", { x: e.clientX, y: e.clientY });
      } else if (e.button === 2) {
        m.send("rightMouseUp", { x: e.clientX, y: e.clientY });
      }

      delete pointersRef.current[e.pointerId];
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };
    const mouseMove = (e: PointerEvent) => {
      m.send("mouseMove", { mousePosition: { x: e.clientX, y: e.clientY } });

      pointersRef.current[e.pointerId] = { x: e.clientX, y: e.clientY };
      const pointerIds = Object.keys(pointersRef.current);
      if (pointerIds.length === 1) {
        if (dragRef.current) {
          const draggedX = e.clientX - pointersDownRef.current[e.pointerId].x;
          const draggedY = e.clientY - pointersDownRef.current[e.pointerId].y;
          const absX = Math.abs(draggedX);
          const absY = Math.abs(draggedY);
          const threshold = 3;
          if (absX > threshold || absY > threshold) {
            if (absX > absY) {
              if (draggedX > 0) {
                m.send("dragged", { direction: "right" });
              } else if (draggedX < 0) {
                m.send("dragged", { direction: "left" });
              }
            } else {
              if (draggedY > 0) {
                m.send("dragged", { direction: "down" });
              } else if (draggedY < 0) {
                m.send("dragged", { direction: "up" });
              }
            }
          }
        }
      } else if (pointerIds.length === 2) {
        // start here
        const a = pointersRef.current[pointerIds[0]];
        const b = pointersRef.current[pointerIds[1]];
        const aDown = pointersDownRef.current[pointerIds[0]];
        const bDown = pointersDownRef.current[pointerIds[1]];

        const minDown = [
          Math.min(aDown.x, bDown.x),
          Math.min(aDown.y, bDown.y),
        ];
        const maxDown = [
          Math.max(aDown.x, bDown.x),
          Math.max(aDown.y, bDown.y),
        ];
        const min = [Math.min(a.x, b.x), Math.min(a.y, b.y)];
        const max = [Math.max(a.x, b.x), Math.max(a.y, b.y)];
        const combined = {
          down: [
            minDown[0] + (maxDown[0] - minDown[0]) / 2,
            minDown[1] + (maxDown[1] - minDown[1]) / 2,
          ],
          current: [
            min[0] + (max[0] - min[0]) / 2,
            min[1] + (max[1] - min[1]) / 2,
          ],
        };

        const visibleHeight =
          2 *
          Math.tan((state.gl.camera.fov * Math.PI) / 360) *
          cameraDownRef.current.z;
        const zoomPixel = visibleHeight / window.innerHeight;

        const dragged = [
          (combined.current[0] - combined.down[0]) * zoomPixel,
          (combined.current[1] - combined.down[1]) * zoomPixel,
        ];

        const adjustedDown = new THREE.Vector3();
        adjustedDown.x = cameraDownRef.current.x - dragged[0];
        adjustedDown.y = cameraDownRef.current.y + dragged[1];

        const downDiff = Math.sqrt(
          Math.pow(aDown.x - bDown.x, 2) + Math.pow(aDown.y - bDown.y, 2)
        );
        const currDiff = Math.sqrt(
          Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
        );
        const percent = (currDiff - downDiff) / downDiff + 1;

        const relx = combined.current[0] - window.innerWidth / 2;
        const rely = -(combined.current[1] - window.innerHeight / 2);
        const worldRelX = relx * zoomPixel;
        const worldRelY = rely * zoomPixel;

        const nextZoom = Math.min(
          32,
          Math.max(1, cameraDownRef.current.z / percent)
        );

        const newVisibleHeight =
          2 * Math.tan((state.gl.camera.fov * Math.PI) / 360) * nextZoom;
        const newZoomPixel = newVisibleHeight / window.innerHeight;

        const newWorldX = relx * newZoomPixel;
        const newWorldY = rely * newZoomPixel;

        const diffX = newWorldX - worldRelX;
        const diffY = newWorldY - worldRelY;

        state.cameraPosition.x = adjustedDown.x - diffX;
        state.cameraPosition.y = adjustedDown.y - diffY;
        state.cameraPosition.z = nextZoom;
      }
    };
    const wheel = (e: WheelEvent) => {
      m.send("mouseWheel", { deltaY: e.deltaY });
    };
    const keyDown = (e: KeyboardEvent) => {
      if (e.key.includes("Arrow")) {
        if (metaKey(e) && e.shiftKey) {
          m.send("arrowCtrlShiftKeyDown", { key: e.key });
        } else if (metaKey(e)) {
          m.send("arrowCtrlKeyDown", { key: e.key });
        } else if (e.shiftKey) {
          m.send("arrowShiftKeyDown", { key: e.key });
        } else {
          m.send("arrowKeyDown", { key: e.key });
        }
        e.preventDefault();
      }
      if (metaKey(e) && e.key === "o") {
        m.send("ctrlO");
        e.preventDefault();
      }
      if (metaKey(e) && e.key === "m") {
        m.send("ctrlM");
        e.preventDefault();
      }
      if (metaKey(e) && e.key === "g") {
        m.send("ctrlG");
        e.preventDefault();
      }
      if (metaKey(e) && e.key === "p") {
        m.send("ctrlP");
        e.preventDefault();
      }
      if (metaKey(e) && e.key === "f") {
        m.send("ctrlF");
        e.preventDefault();
      }
      if (metaKey(e) && e.shiftKey && e.key.toLowerCase() === "z") {
        m.send("ctrlShiftZ");
        e.preventDefault();
      }
      if (metaKey(e) && e.key === "z") {
        m.send("ctrlZ");
        e.preventDefault();
      }
      if (e.key === "Tab") {
        m.send("directionClick", {
          direction: nextDirObj[state.nextDir],
        });
        e.preventDefault();
      }
      if (metaKey(e) && ["1", "2", "3", "4"].includes(e.key)) {
        m.send("ctrl" + e.key, { mode: state.modes[parseInt(e.key) - 1] });
        e.preventDefault();
      }
      if (metaKey(e) && ["+", "="].includes(e.key)) {
        m.send("ctrlPlus", { key: e.key });
        e.preventDefault();
      }
      if (metaKey(e) && e.key === "-") {
        m.send("ctrlMinus", { key: e.key });
        e.preventDefault();
      }
      if (!metaKey(e) && state.textSources[0].chars.includes(e.key)) {
        m.send("charKeyDown", { key: e.key });
      }
      if (e.key === "Escape" || e.key === "Enter") {
        m.send("escape", { mode: "normal" });
        e.preventDefault();
      }
      if (e.key === " ") {
        e.preventDefault();
      }
      if (e.key === "Enter" || e.key === "Enter") {
        m.send("enter");
      }
      if (e.key === "Backspace") {
        m.send("backspaceKeyDown");
      }
    };
    const cut = (e: ClipboardEvent) => {
      m.send("cut");
      e.preventDefault();
      return;
    };
    const copy = (e: ClipboardEvent) => {
      m.send("copy");
      e.preventDefault();
      return;
    };
    const paste = (e: ClipboardEvent) => {
      m.send("paste", { clipboardData: e.clipboardData });
      e.preventDefault();
      return;
    };

    const handleImageOpen = () => {
      //@ts-ignore
      for (let item of state.fileInput.files) {
        if (item.type.indexOf("image") < 0) {
          continue;
        }
        let src = URL.createObjectURL(item);
        m.send("imageSelected", { src: src });
      }
    };

    const onDrop = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      let file = e.dataTransfer.files[0];
      let src = URL.createObjectURL(file);
      m.send("imageSelected", { src: src });
    };

    const onDrag = (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };

    const handleResize = () => {
      state.gl.camera.aspect = window.innerWidth / window.innerHeight;
      state.gl.camera.updateProjectionMatrix();
      state.gl.renderer.setSize(
        window.innerWidth * window.devicePixelRatio,
        window.innerHeight * window.devicePixelRatio
      );
      state.gl.renderer.domElement.style.width = window.innerWidth + "px";
      state.gl.renderer.domElement.style.height = window.innerHeight + "px";
      // @ts-ignore
      state.resizeMesh.children[0].material.resolution.set(
        window.innerWidth,
        window.innerHeight
      );
      // @ts-ignore
      state.selectionMesh.children[0].material.resolution.set(
        window.innerWidth,
        window.innerHeight
      );
      // @ts-ignore
      state.pageMesh.children[0].material.resolution.set(
        window.innerWidth,
        window.innerHeight
      );
    };

    const handleMouseDownForMobile = (e: MouseEvent) => {
      e.preventDefault();
    };
    state.gl.canvas.addEventListener("pointermove", mouseMove);
    state.gl.canvas.addEventListener("wheel", wheel);
    state.gl.canvas.addEventListener("pointerdown", handleMouseDown);
    state.gl.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
    state.gl.canvas.addEventListener("pointerup", handleMouseUp);
    state.gl.canvas.addEventListener("mousedown", handleMouseDownForMobile);
    window.addEventListener("keydown", keyDown);
    state.fileInput.addEventListener("change", handleImageOpen);
    // @ts-ignore
    window.addEventListener("copy", copy);
    // @ts-ignore
    window.addEventListener("paste", paste);
    // @ts-ignore
    window.addEventListener("cut", cut);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", onDrag);
    window.addEventListener("resize", handleResize);

    return () => {
      state.gl.canvas.removeEventListener("pointermove", mouseMove);
      state.gl.canvas.removeEventListener("wheel", wheel);
      state.gl.canvas.removeEventListener("pointerdown", handleMouseDown);
      state.gl.canvas.removeEventListener("pointerup", handleMouseUp);
      state.gl.canvas.removeEventListener(
        "mousedown",
        handleMouseDownForMobile
      );
      window.removeEventListener("keydown", keyDown);
      state.fileInput.removeEventListener("change", handleImageOpen);
      // @ts-ignore
      window.removeEventListener("copy", copy);
      // @ts-ignore
      window.removeEventListener("paste", paste);
      // @ts-ignore
      window.removeEventListener("cut", cut);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", onDrag);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const { selection, resize, page } = state;
    const setSelectionReadout = () => {
      if (!readoutRef.current) return;
      readoutRef.current.innerText = `${selection.x - page.x},${
        selection.y - page.y
      } ${selection.w}x${selection.h} ${page.w}x${page.h}`;
    };
    const unsubscribeSelection = subscribe(
      state.selection,
      setSelectionReadout
    );
    const unsubscribePage = subscribe(state.page, setSelectionReadout);
    const unsubscribeResize = subscribe(state.resize, () => {
      if (!readoutRef.current) return;
      readoutRef.current.innerText = `${resize.x - page.x},${
        resize.y - page.y
      } ${resize.w}x${resize.h} ${page.w}x${page.h}`;
    });

    setSelectionReadout();
    return () => {
      unsubscribeSelection();
      unsubscribeResize();
      unsubscribePage();
    };
  }, [readoutRef, isMounted]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (backgroundSettingCanvasRef.current) {
      backgroundSettingCanvasRef.current.width = 40 * window.devicePixelRatio;
      backgroundSettingCanvasRef.current.height = 40 * window.devicePixelRatio;
      backgroundSettingCanvasRef.current.style.width = "40px";
      backgroundSettingCanvasRef.current.style.height = "40px";
      const ctx = backgroundSettingCanvasRef.current.getContext("2d", {
        alpha: false,
      });
      if (!ctx) return;
      ctx.fillStyle = snap.backgroundColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      let count = 0;
      const textSource = state.textSources[1];
      if (textSource.canvas) {
        for (let char of "BACKGRND".split("")) {
          const col = count % 4;
          const row = Math.floor(count / 4);
          const index = textSource.chars.indexOf(char);
          const c = index % textSource.textCols;
          const r = Math.floor(index / textSource.textCols);
          const sx = c * textSource.charWidth;
          const sy = r * textSource.charHeight;
          ctx.drawImage(
            textSource.canvas,
            sx,
            sy,
            textSource.charWidth,
            textSource.charHeight,
            (col * 8 + 4) * window.devicePixelRatio,
            (row * 16 + 4) * window.devicePixelRatio,
            8 * window.devicePixelRatio,
            16 * window.devicePixelRatio
          );
          count++;
        }
      }
    }
  }, [backgroundSettingCanvasRef, snap.regenerateCounter, isMounted]);

  useEffect(() => {
    if (foregroundSettingCanvasRef.current) {
      foregroundSettingCanvasRef.current.width = 40 * window.devicePixelRatio;
      foregroundSettingCanvasRef.current.height = 40 * window.devicePixelRatio;
      foregroundSettingCanvasRef.current.style.width = "40px";
      foregroundSettingCanvasRef.current.style.height = "40px";
      const ctx = foregroundSettingCanvasRef.current.getContext("2d", {
        alpha: false,
      });
      if (!ctx) return;
      ctx.fillStyle = snap.backgroundColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = snap.foregroundColor;
      let count = 0;
      const textSource = state.textSources[1];
      if (textSource.canvas) {
        for (let char of "TEXT".split("")) {
          const col = count % 2;
          const row = Math.floor(count / 2);
          const index = textSource.chars.indexOf(char);
          const c = index % textSource.textCols;
          const r = Math.floor(index / textSource.textCols);
          const sx = c * textSource.charWidth;
          const sy = r * textSource.charHeight;
          ctx.drawImage(
            textSource.canvas,
            sx,
            sy,
            textSource.charWidth,
            textSource.charHeight,
            (col * 16 + 4) * window.devicePixelRatio,
            (row * 16 + 4) * window.devicePixelRatio,
            16 * window.devicePixelRatio,
            16 * window.devicePixelRatio
          );
          count++;
        }
      }
    }
  }, [foregroundSettingCanvasRef, snap.regenerateCounter, isMounted]);

  useEffect(() => {
    state.keyboardRef = ref(keyboardRef);
  }, [keyboardRef]);

  return isMounted ? (
    <>
      <div
        style={{
          position: "fixed",
          left: 16,
          top: 16,
        }}
      >
        <img
          src="/mode.png"
          draggable={false}
          style={{
            marginBottom: 8,
            width: 40,
            height: 24,
            backgroundColor: "white",
            padding: 4,
          }}
        />
        {state.modes.map((mode, i) => {
          const titles = [
            "Type and select (ctrl+1)",
            "Move camera (ctrl+2)",
            "Resize selection (ctrl+3)",
            "Set print size (ctrl+4)",
          ].map((v) => meta(v));
          return (
            <div key={titles[i]} title={titles[i]}>
              <ButtonImg
                className={mode === snap.mode ? "selected" : ""}
                src={"/" + mode + ".png"}
                key={mode}
                style={{
                  marginBottom: 8,
                }}
                onClick={() => {
                  m.send("setMode_" + mode, { mode });
                  state.mode = mode;
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "fixed",
          right: 16,
          top: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <div
            title="Change background color"
            style={{
              position: "relative",
              width: 40,
              height: 40,
              pointerEvents: "auto",
            }}
          >
            <label>
              <canvas width={40} height={40} ref={backgroundSettingCanvasRef} />
              <div className="cover"></div>
              <input
                style={{
                  position: "absolute",
                  left: 0,
                  top: -8,
                  width: 40,
                  height: 40 + 16,
                  opacity: 0,
                }}
                onChange={(e) => {
                  localStorage.setItem("backgroundColor", e.target.value);
                  state.backgroundColor = e.target.value;
                  m.send("textSettingsChange");
                }}
                value={snap.backgroundColor}
                type="color"
              />
            </label>
          </div>
          <div
            title="Change text color"
            style={{
              position: "relative",
              marginRight: 8,
              width: 40,
              height: 40,
              pointerEvents: "auto",
            }}
          >
            <label>
              <canvas width={40} height={40} ref={foregroundSettingCanvasRef} />
              <div className="cover"></div>
              <input
                style={{
                  position: "absolute",
                  left: 0,
                  top: -8,
                  width: 40,
                  height: 40 + 16,
                  opacity: 0,
                }}
                onChange={(e) => {
                  localStorage.setItem("foregroundColor", e.target.value);
                  state.foregroundColor = e.target.value;
                  m.send("textSettingsChange");
                }}
                value={snap.foregroundColor}
                type="color"
              />
            </label>
          </div>

          <div
            onClick={() => {
              m.send("gridButtonClick");
            }}
            title={meta("Toggle grid visibility (ctrl+g)")}
            style={{ marginRight: 8 }}
          >
            {snap.showGrid ? (
              <ButtonImg src="/gridon.png" />
            ) : (
              <ButtonImg src="/gridoff.png" />
            )}
          </div>
          <div
            onClick={() => {
              m.send("toggleAutospaceClick");
            }}
            title={meta("Auto move next (ctrl+m)")}
          >
            {snap.moveNext ? (
              <ButtonImg src="/autoon.png" />
            ) : (
              <ButtonImg src="/autooff.png" />
            )}
          </div>

          <div
            title={meta("Move next direction (tab)")}
            onClick={() => {
              m.send("directionClick", {
                direction: nextDirObj[snap.nextDir],
              });
            }}
          >
            {snap.nextDir === "left" ? <ButtonImg src="/left.png" /> : null}
            {snap.nextDir === "right" ? <ButtonImg src="/right.png" /> : null}
            {snap.nextDir === "up" ? <ButtonImg src="/up.png" /> : null}
            {snap.nextDir === "down" ? <ButtonImg src="/down.png" /> : null}
          </div>
        </div>
        <div
          style={{
            position: "fixed",
            right: 16,
            top: 72,
          }}
        >
          <div title="Open info">
            <ButtonImg
              src={"/info.png"}
              onClick={() => {
                state.showInfo = true;
                localStorage.setItem("showInfo", "true");
              }}
              style={{ marginBottom: 16 }}
            />
          </div>
          <div title={meta("Undo (ctrl + z)")}>
            <ButtonImg
              className={snap.activeUndo < 1 ? "disabled" : ""}
              src={"/undo.png"}
              onClick={() => {
                m.send("clickUndo");
              }}
              style={{ marginBottom: 8 }}
            />
          </div>
          <div title={meta("Redo (ctrl + shift + z)")}>
            <ButtonImg
              className={
                snap.activeUndo === snap.undoStack.length - 1 ? "disabled" : ""
              }
              src={"/redo.png"}
              onClick={() => {
                m.send("clickRedo");
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <div title={meta("Add image (ctrl+o)")}>
            <ButtonImg
              src="/addimage.png"
              onClick={() => {
                m.send("imageButtonClick");
              }}
            />
          </div>
          <div title={meta("Image fill style (ctrl+f)")}>
            <ButtonImg
              style={{
                marginRight: 8,
              }}
              src={`/${snap.imageFill}.png`}
              onClick={() => {
                m.send("fillButtonClick");
              }}
            />
          </div>
          <div title={meta("Save as image (ctrl+p)")}>
            <ButtonImg
              style={{ marginRight: 8 }}
              src="/print.png"
              onClick={() => {
                m.send("printClick");
              }}
            />
          </div>
        </div>
        <div
          ref={readoutRef}
          style={{
            height: 24,
            display: "grid",
            alignItems: "center",
            color: "#ddd",
            padding: 4,
            lineHeight: "24px",
            marginTop: 8,
          }}
        />
      </div>
      <input
        ref={keyboardRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          background: "tansparent",
          border: "none",
          opacity: 0,
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {snap.showInfo ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 99,
            padding: "24px 0",
          }}
          onClick={() => {
            state.showInfo = false;
            localStorage.setItem("showInfo", "false");
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "white",
              margin: "0 auto",
              color: "black",
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>Info</div>
              <div
                onClick={() => {
                  state.showInfo = false;
                  localStorage.setItem("showInfo", "false");
                }}
              >
                X
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              Grid is an experimental collage editor. Adjust the grid cell size
              and text direction to create weird and expressive layouts.
            </div>
            <div>
              The best way to get started with Grid is just experimenting by
              typing and clicking around. There are multiple ways to do most
              actions. Come back and read through the controls when you get
              curious or stuck.
            </div>
            <div style={{ marginBottom: 16 }}>CONTROLS</div>
            <div style={{ marginBottom: 0 }}>Mouse</div>
            <div>Left click - select a cell</div>
            <div>Left click and drag - set autospace direction</div>
            <div>Middle click and drag - pan canvas</div>
            <div>Right click and drag - resize cell</div>
            <div style={{ marginTop: 16 }}>Mouse or touchpad</div>
            <div>Scroll to zoom</div>
            <div style={{ marginTop: 16 }}>Touchscreen</div>
            <div>Two fingers to pan and zoom</div>
            <div style={{ marginTop: 16 }}>Frame mode</div>
            <div>
              Click and drag to set the area that will be saved as an image when
              you click the PRINT button.
            </div>
            <div style={{ marginTop: 16 }}>Keyboard controls</div>
            <div>Type to write letters</div>
            <div>Arrow keys - move selection</div>
            <div>Enter - return to text direction start</div>
            <div>Ctrl + arrow keys - resize grid cell from the top left</div>
            <div>
              Ctrl + shift + arrow keys - resize grid cell from the bottom right
            </div>
            <div>Shift + arrow key - shift cell position</div>
            <div style={{ marginTop: 16 }}>Images</div>
            <div>
              You can add images by drag and drop, copy and paste, or clicking
              the button in the bottom left.
            </div>
            <div style={{ marginTop: 16 }}>Saving</div>
            <div>
              Your image and settings are automatically saved in your browser's
              local storage. To download an image, click print.
            </div>
            <div style={{ marginTop: 16 }}>About</div>
            <div>
              Font is JetBrains Mono, it is printed to multiple spritesheets
              selected based on the cell-size resolution.
            </div>
            <div>A Constraint Systems project</div>
          </div>
        </div>
      ) : null}
    </>
  ) : null;
}

export default Main;
