import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  build: () => Record<string, unknown>;
  height?: number | string;
  deps?: unknown[];
  className?: string;
}

/** Theme-aware ECharts wrapper. Rebuilds option on theme switch (after the
 *  data-theme attribute is applied, via rAF) so CSS-var colors stay correct. */
export default function Chart({ build, height = 280, deps = [], className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const { mode } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); inst.current?.dispose(); inst.current = null; };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => inst.current?.setOption(build() as Parameters<echarts.ECharts['setOption']>[0], true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ...deps]);

  return <div ref={ref} className={className} style={{ width: '100%', height }} />;
}
