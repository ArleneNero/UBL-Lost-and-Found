import React from 'react';
import { CheckCircle2, ArrowRight, RotateCcw, Package } from 'lucide-react';
import { FoundItem } from '@/types/domain';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface RegisterItemSuccessProps {
  item: FoundItem;
  onViewCatalog: () => void;
  onRecordAnother: () => void;
  onViewInventory: () => void;
}

export const RegisterItemSuccess: React.FC<RegisterItemSuccessProps> = ({
  item,
  onViewCatalog,
  onRecordAnother,
  onViewInventory,
}) => {
  return (
    <Card className="flex flex-col items-center text-center p-8 max-w-lg mx-auto gap-5">
      <div className="w-16 h-16 rounded-full bg-[var(--lf-success-soft)] text-[var(--lf-success)] flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-[var(--lf-ink)]">Barang berhasil dicatat</h2>
        <p className="text-xs sm:text-sm text-[var(--lf-muted)] mt-1">
          Barang sudah masuk inventaris pos dan tersedia di katalog.
        </p>
      </div>

      <div className="w-full p-4 bg-[var(--lf-canvas)] border border-[var(--lf-border)] rounded-[var(--lf-radius-md)] flex items-center justify-between text-left">
        <div>
          <h3 className="text-sm font-bold text-[var(--lf-ink)]">{item.name}</h3>
          <p className="text-xs font-mono text-[var(--lf-muted)] mt-0.5">
            {item.inventoryCode} · Pos: {item.postName}
          </p>
        </div>
        <Badge variant="available">Tersedia di pos</Badge>
      </div>

      <div className="flex flex-col w-full gap-2.5 pt-2">
        <Button variant="primary" onClick={onViewCatalog} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Lihat di Katalog
        </Button>
        <Button variant="secondary" onClick={onRecordAnother} leftIcon={<RotateCcw className="w-4 h-4" />}>
          Catat Barang Lagi
        </Button>
        <Button variant="ghost" onClick={onViewInventory} leftIcon={<Package className="w-4 h-4" />}>
          Lihat Inventaris
        </Button>
      </div>
    </Card>
  );
};
