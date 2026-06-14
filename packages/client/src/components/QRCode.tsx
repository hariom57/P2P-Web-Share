import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  text: string;
  size?: number;
}

function QRCode({ text, size = 180 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, text, {
      width: size,
      margin: 2,
      color: {
        dark: '#ffffff',
        light: 'transparent',
      },
    });
  }, [text, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="inline-block"
    />
  );
}

export default QRCode;
