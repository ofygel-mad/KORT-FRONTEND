import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Copy, Expand, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../model/store';
import styles from './Workspace.module.css';

interface Props {
  tileId: string;
  x: number;
  y: number;
}

export function WorkspaceTileContextMenu({ tileId, x, y }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const tile = useWorkspaceStore((state) => state.tiles.find((item) => item.id === tileId));
  const openTile = useWorkspaceStore((state) => state.openTile);
  const duplicateTile = useWorkspaceStore((state) => state.duplicateTile);
  const pinTile = useWorkspaceStore((state) => state.pinTile);
  const reloadTile = useWorkspaceStore((state) => state.reloadTile);
  const removeTile = useWorkspaceStore((state) => state.removeTile);
  const closeContextMenu = useWorkspaceStore((state) => state.closeContextMenu);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeContextMenu();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
    }, 30);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeContextMenu]);

  if (!tile) {
    return null;
  }

  const menuWidth = 232;
  const menuHeight = 236;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 12);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 12);

  const item = (Icon: React.ElementType, label: string, onClick: () => void, danger = false) => (
    <button
      className={`${styles.ctxItem} ${danger ? styles.ctxItemDanger : ''}`}
      onClick={() => {
        onClick();
        closeContextMenu();
      }}
    >
      <Icon size={13} />
      <span>{label}</span>
    </button>
  );

  return createPortal(
    <motion.div
      ref={menuRef}
      className={styles.ctxMenu}
      style={{ position: 'fixed', left: clampedX, top: clampedY, zIndex: 600 }}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }}
      transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.6 }}
    >
      <div className={styles.ctxLabel}>{tile.title}</div>
      <div className={styles.ctxDivider} />
      {item(Expand, 'Открыть', () => openTile(tileId))}
      {item(Copy, 'Дублировать', () => duplicateTile(tileId))}
      {item(tile.pinned ? PinOff : Pin, tile.pinned ? 'Открепить' : 'Закрепить', () => pinTile(tileId))}
      {item(RotateCcw, 'Перезагрузить', () => reloadTile(tileId))}
      <div className={styles.ctxDivider} />
      {item(Trash2, 'Удалить плитку', () => removeTile(tileId), true)}
    </motion.div>,
    document.body,
  );
}
