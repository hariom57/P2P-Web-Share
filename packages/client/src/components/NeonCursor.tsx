import { useEffect, useRef } from 'react';

export default function NeonCursor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    import('threejs-toys').then((mod) => {
      const el = containerRef.current;
      if (!el) return;

      mod.neonCursor({
        el,
        shaderPoints: 16,
        curvePoints: 80,
        curveLerp: 0.5,
        radius1: 5,
        radius2: 30,
        velocityTreshold: 10,
        sleepRadiusX: 100,
        sleepRadiusY: 100,
        sleepTimeCoefX: 0.0025,
        sleepTimeCoefY: 0.0025,
      });

      let hovered = false;

      const onMove = (e: PointerEvent) => {
        if (!hovered) {
          hovered = true;
          el.dispatchEvent(new PointerEvent('pointerenter', {
            clientX: e.clientX, clientY: e.clientY,
            pointerType: e.pointerType,
            button: e.button, buttons: e.buttons,
          }));
        }
        el.dispatchEvent(new PointerEvent('pointermove', {
          clientX: e.clientX, clientY: e.clientY,
          pointerType: e.pointerType,
          button: e.button, buttons: e.buttons,
        }));
      };

      const onLeave = () => {
        hovered = false;
        el.dispatchEvent(new PointerEvent('pointerleave'));
      };

      const onDown = (e: PointerEvent) => {
        el.dispatchEvent(new PointerEvent('pointerdown', {
          clientX: e.clientX, clientY: e.clientY,
          pointerType: e.pointerType,
          button: e.button, buttons: e.buttons,
        }));
      };

      const onUp = (e: PointerEvent) => {
        el.dispatchEvent(new PointerEvent('pointerup', {
          clientX: e.clientX, clientY: e.clientY,
          pointerType: e.pointerType,
          button: e.button, buttons: e.buttons,
        }));
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerleave', onLeave);
      window.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
    });
  }, []);

  return (
    <div
      ref={containerRef}
      id="neon"
    />
  );
}
