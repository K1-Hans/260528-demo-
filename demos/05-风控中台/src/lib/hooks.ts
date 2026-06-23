import { useEffect, useRef, useState } from 'react';

/** Animated count-up for KPI numbers. Triggers when `start` becomes true. */
export function useCountUp(target: number, duration = 900, start = true) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, start]);
  return value;
}

/** IntersectionObserver — returns [ref, inView]. */
export function useInView<T extends HTMLElement = HTMLDivElement>(once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) setInView(false);
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);
  return [ref, inView] as const;
}

/** setInterval as a hook (latest-callback safe). Pass active=false to pause (尊重 reduce-motion / 暂停按钮). */
export function useInterval(cb: () => void, delay: number, active = true) {
  const saved = useRef(cb);
  saved.current = cb;
  useEffect(() => {
    if (!active || delay <= 0) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay, active]);
}

/** prefers-reduced-motion 检测（实时流/动效降级） */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

/** 千分位格式化（tabular-friendly）。 */
export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 金额格式化：默认元（带千分位）；large=true 时大额折万/亿，KPI 用。 */
export function fmtMoney(n: number, opts?: { large?: boolean; sign?: boolean }): string {
  const sign = opts?.sign && n > 0 ? '+' : '';
  if (opts?.large) {
    if (Math.abs(n) >= 1e8) return `${sign}${(n / 1e8).toFixed(2)} 亿`;
    if (Math.abs(n) >= 1e4) return `${sign}${(n / 1e4).toFixed(1)} 万`;
  }
  return `${sign}${n.toLocaleString('zh-CN')}`;
}
