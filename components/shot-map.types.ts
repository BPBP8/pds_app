import type { SeedPost } from '@/src/data/seed-posts';

export type ShotMapProps = {
  posts: readonly SeedPost[];
  selectedId: string;
  onSelect: (id: string) => void;
  coordinates?: { latitude: number; longitude: number };
};
