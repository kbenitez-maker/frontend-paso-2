'use client';

import { useState } from 'react';

import type { DocumentChecklistItem } from '@/server/api';
import type { PreviewTarget } from '../file-preview-modal';

import { FilePreviewModal } from '../file-preview-modal';
import { ProfileCard } from '../profile-card';
import { UploadCard } from '../upload-card';
import { documentCardsTheme } from './themes';

const { grid } = documentCardsTheme();

interface DocumentCardsProps {
  requestId: string;
  items: readonly DocumentChecklistItem[];
}

/**
 * Columns of exactly one card's width (284), not elastic ones: with `1fr` the
 * leftover of every column reads as spacing and the gap stops meaning
 * anything. The `min()` is the net for screens narrower than a card. The
 * template cannot be a utility class because it is built from the card width.
 */
const CARD_WIDTH = 284;
const GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${String(CARD_WIDTH)}px, 100%), ${String(CARD_WIDTH)}px))`,
};

/** Grid of upload cards, one per checklist item (read-only for the profiling ones), with the preview they share. */
const DocumentCards = ({ requestId, items }: Readonly<DocumentCardsProps>) => {
  const [previewing, setPreviewing] = useState<PreviewTarget | null>(null);

  return (
    <>
      <div className={grid()} style={GRID_STYLE}>
        {items.map((item) => {
          const Card = item.from_profile === true ? ProfileCard : UploadCard;
          return (
            <Card
              key={item.item_id}
              requestId={requestId}
              item={item}
              onPreview={(file) => {
                setPreviewing({ itemId: item.item_id, file });
              }}
            />
          );
        })}
      </div>

      <FilePreviewModal
        requestId={requestId}
        target={previewing}
        onClose={() => {
          setPreviewing(null);
        }}
      />
    </>
  );
};

export { DocumentCards, type DocumentCardsProps };
