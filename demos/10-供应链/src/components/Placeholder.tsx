import { Construction } from 'lucide-react';
import { PageHeader } from './ui';

export default function Placeholder({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="card col" style={{ alignItems: 'center', padding: '72px 20px', textAlign: 'center' }}>
        <Construction size={38} style={{ color: 'var(--gold)', opacity: 0.6, marginBottom: 16 }} />
        <div className="t-h3" style={{ marginBottom: 6 }}>模块开发中</div>
        <div className="text-3 t-small">该模块正在接入数据与功能，敬请期待</div>
      </div>
    </div>
  );
}
