import { memo, useRef, useState, type CSSProperties } from 'react';
import { Building2, Clock3, Pin, ShieldX } from 'lucide-react';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useBadgeStore } from '../../shared-bus/badge.store';
import { getTileViewportBounds, useWorkspaceStore } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile as WorkspaceTileType } from '../model/types';
import { useCompanyAccess } from '../../../shared/hooks/useCompanyAccess';
import styles from './Workspace.module.css';

export interface WorkspaceFlightTileLayout {
  left: number;
  top: number;
  scale: number;
  opacity: number;
  blur: number;
  zIndex: number;
  visible: boolean;
}

interface Props {
  tile: WorkspaceTileType;
  snapshot?: WorkspaceSnapshot;
  presentation?: 'surface' | 'flight';
  flightLayout?: WorkspaceFlightTileLayout;
}

const DRAG_THRESHOLD = 5;

function LockedPreview() {
  const access = useCompanyAccess();

  return (
    <div className={styles.tileMonitorLocked}>
      <div className={styles.tileMonitorLockedIcon}>
        {access.needsApproval ? <Clock3 size={16} /> : access.wasRejected ? <ShieldX size={16} /> : <Building2 size={16} />}
      </div>
      <div className={styles.tileMonitorLockedTitle}>
        {access.needsApproval ? 'Ожидается подтверждение' : access.wasRejected ? 'Доступ отклонён' : 'Компания не подключена'}
      </div>
      <div className={styles.tileMonitorLockedText}>
        {access.needsApproval
          ? 'Плитка создана, но данные откроются только после подтверждения администратором.'
          : access.wasRejected
            ? 'Подайте новую заявку или используйте актуальную ссылку приглашения.'
            : 'Подключите компанию или активируйте реферальную ссылку в настройках доступа.'}
      </div>
    </div>
  );
}

export const WorkspaceTile = memo(function WorkspaceTile({
  tile,
  snapshot,
  presentation = 'surface',
  flightLayout,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const monitorRef = useRef<HTMLDivElement>(null);
  const access = useCompanyAccess();
  const openTile = useWorkspaceStore((state) => state.openTile);
  const setTilePosition = useWorkspaceStore((state) => state.setTilePosition);
  const bringToFront = useWorkspaceStore((state) => state.bringToFront);
  const markTileActive = useWorkspaceStore((state) => state.markTileActive);
  const openContextMenu = useWorkspaceStore((state) => state.openContextMenu);
  const setHoveredTile = useWorkspaceStore((state) => state.setHoveredTile);
  const sceneMode = useWorkspaceStore((state) => state.sceneMode);
  const isHovered = useWorkspaceStore((state) => state.hoveredTileId === tile.id);
  const isActive = useWorkspaceStore((state) => state.activeTileId === tile.id);
  const isNew = useWorkspaceStore((state) => state.recentTileId === tile.id);
  const definition = WORKSPACE_WIDGET_MAP[tile.kind];

  if (!definition) {
    return null;
  }

  const Icon = definition.icon;
  const isFlightPresentation = presentation === 'flight';
  const badge = useBadgeStore((state) => state.getBadge(tile.kind));
  const showBadge = badge > 0;
  const isPinned = tile.pinned ?? false;
  const tileDistanceClass =
    tile.distance3D === 'near'
      ? styles.tileDistanceNear
      : tile.distance3D === 'far'
        ? styles.tileDistanceFar
        : styles.tileDistanceMid;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isFlightPresentation) {
      event.stopPropagation();
      bringToFront(tile.id);
      return;
    }

    if (sceneMode === 'flight') {
      return;
    }

    if (useWorkspaceStore.getState().activeTileId || event.button === 2) {
      return;
    }

    if ((event.target as HTMLElement).closest('[data-workspace-tile-screen="true"]')) {
      return;
    }

    event.stopPropagation();
    bringToFront(tile.id);

    const element = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = tile.x;
    const originY = tile.y;
    let dragged = false;

    element.setPointerCapture(event.pointerId);
    element.style.cursor = 'grabbing';

    const { viewport, viewportSize, zoom } = useWorkspaceStore.getState();
    const visibleBounds = getTileViewportBounds(viewport, viewportSize, zoom, tile);

    const onMove = (moveEvent: PointerEvent) => {
      if (isPinned) {
        return;
      }

      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;

      if (!dragged && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
        dragged = true;
        setDragging(true);
      }

      if (dragged) {
        setTilePosition(
          tile.id,
          Math.max(visibleBounds.minX, Math.min(originX + deltaX, visibleBounds.maxX)),
          Math.max(visibleBounds.minY, Math.min(originY + deltaY, visibleBounds.maxY)),
        );
      }
    };

    const onUp = () => {
      setDragging(false);
      element.style.cursor = '';
      element.releasePointerCapture(event.pointerId);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
    };

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
  };

  const handleScreenPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (sceneMode === 'flight' && !isFlightPresentation) {
      return;
    }

    event.stopPropagation();
    bringToFront(tile.id);
  };

  const handleScreenClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (sceneMode === 'flight' && !isFlightPresentation) {
      return;
    }

    event.stopPropagation();
    openTile(tile.id);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (sceneMode === 'flight' || isFlightPresentation) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    markTileActive(tile.id, { status: 'floating' });
    openContextMenu(tile.id, event.clientX, event.clientY);
  };

  const surfaceStyle: CSSProperties = {
    width: tile.width,
    height: tile.height,
    transform: `translate(${tile.x}px, ${tile.y}px)`,
    zIndex: tile.zIndex ?? 10,
  };

  const flightStyle: CSSProperties = {
    width: tile.width,
    height: tile.height,
    left: `${flightLayout?.left ?? -9999}px`,
    top: `${flightLayout?.top ?? -9999}px`,
    zIndex: flightLayout?.zIndex ?? (tile.zIndex ?? 10),
    '--tile-flight-scale': String(flightLayout?.scale ?? 0.84),
    '--tile-flight-opacity': String(flightLayout?.opacity ?? 0.92),
    '--tile-flight-blur': `${flightLayout?.blur ?? 0}px`,
    visibility: (flightLayout?.visible ?? false) ? 'visible' : 'hidden',
    pointerEvents: (flightLayout?.visible ?? false) ? 'auto' : 'none',
  } as CSSProperties;

  return (
    <div
      data-workspace-tile="true"
      data-tile-id={tile.id}
      className={`${styles.tile} ${isFlightPresentation ? styles.tileFlight : styles.tileSurface} ${tileDistanceClass} ${isNew ? styles.tileNew : ''} ${isPinned ? styles.tilePinned : ''} ${isHovered ? styles.tileHovered3d : ''} ${isActive ? styles.tileActive : ''} ${tile.status === 'drifting' ? styles.tileDrifting : ''} ${dragging ? styles.tileDragging : ''}`}
      style={isFlightPresentation ? flightStyle : surfaceStyle}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
      onPointerEnter={() => {
        if (sceneMode === 'flight' && !isFlightPresentation) {
          return;
        }

        setHoveredTile(tile.id);
        if (!isFlightPresentation && tile.status !== 'floating') {
          markTileActive(tile.id, { status: 'floating' });
        }
      }}
      onPointerLeave={() => {
        if (sceneMode === 'flight' && !isFlightPresentation) {
          return;
        }

        if (useWorkspaceStore.getState().hoveredTileId === tile.id) {
          setHoveredTile(null);
        }
      }}
    >
      <div className={styles.tileHeader}>
        <div className={styles.tileIdentity}>
          <span className={styles.tileIconWrap}>
            <span className={styles.tileIcon}><Icon size={14} /></span>
            {showBadge && (
              <span className={styles.tileBadge}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
          <div className={styles.tileTitle}>{tile.title}</div>
        </div>
        {isPinned && (
          <span className={styles.tilePinIndicator} title="Плитка закреплена">
            <Pin size={9} />
          </span>
        )}
      </div>

      <div
        ref={monitorRef}
        className={styles.tileMonitor}
        data-workspace-tile-screen="true"
        onPointerDown={handleScreenPointerDown}
        onClick={handleScreenClick}
      >
        <div className={styles.tileMonitorViewport}>
          {definition.requiresCompanyAccess && !access.hasCompanyAccess
            ? <LockedPreview />
            : definition.renderPreview(snapshot, tile.version, tile.id)}
        </div>
      </div>
    </div>
  );
});
