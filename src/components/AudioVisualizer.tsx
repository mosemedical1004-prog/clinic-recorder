'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { AudioVisualizerProps } from '@/types';
import { getFrequencyData } from '@/lib/audio';

export default function AudioVisualizer({
  analyserNode,
  isRecording,
  isPaused,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDataRef = useRef<Uint8Array | null>(null);

  const drawBars = useCallback(
    (canvas: HTMLCanvasElement, dataArray: Uint8Array, alpha: number = 1) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const bufferLength = dataArray.length;
      const barCount = Math.min(bufferLength, 64);
      const barWidth = (width / barCount) * 0.8;
      const gap = (width / barCount) * 0.2;

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * height * 0.85;
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        // Gradient color based on value
        const intensity = value / 255;
        let r, g, b;

        if (isPaused) {
          r = Math.floor(245 * intensity);
          g = Math.floor(158 * intensity);
          b = Math.floor(11 * intensity);
        } else {
          r = Math.floor(59 + 150 * intensity);
          g = Math.floor(130 - 80 * intensity);
          b = Math.floor(246 - 200 * intensity);
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        // Rounded bars
        const radius = Math.min(barWidth / 2, 4);
        if (barHeight > radius * 2) {
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
          ctx.lineTo(x + barWidth, y + barHeight - radius);
          ctx.quadraticCurveTo(
            x + barWidth,
            y + barHeight,
            x + barWidth - radius,
            y + barHeight
          );
          ctx.lineTo(x + radius, y + barHeight);
          ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fill();
        } else if (barHeight > 0) {
          ctx.fillRect(x, y, barWidth, Math.max(barHeight, 2));
        }
      }

      // Center line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    },
    [isPaused]
  );

  const drawIdleState = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw flat line with subtle bars
    const barCount = 64;
    const barWidth = (width / barCount) * 0.8;
    const gap = (width / barCount) * 0.2;

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const barHeight = 2;
      const y = (height - barHeight) / 2;
      ctx.fillStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Center text
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('마이크가 준비되면 녹음을 시작하세요', width / 2, height / 2 - 20);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (analyserNode && isRecording && !isPaused) {
      const dataArray = getFrequencyData(analyserNode);
      lastDataRef.current = dataArray;
      drawBars(canvas, dataArray);
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (isPaused && lastDataRef.current) {
      // Draw frozen state when paused
      drawBars(canvas, lastDataRef.current, 0.4);
    } else {
      drawIdleState(canvas);
    }
  }, [analyserNode, isRecording, isPaused, drawBars, drawIdleState]);

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (isRecording && !isPaused) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate, isRecording, isPaused]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    });

    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      resizeObserver.observe(container);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="relative w-full h-full bg-dark-bg rounded-xl overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      {isRecording && !isPaused && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-medium">LIVE</span>
        </div>
      )}
      {isPaused && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-amber-400 text-xs font-medium">PAUSED</span>
        </div>
      )}
    </div>
  );
}
