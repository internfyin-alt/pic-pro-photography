// Responsive WebP copies of the public demo photographs.
// The filename includes a content hash so each version can be cached indefinitely.
export type Photo = { src: string; width: number; height: number; srcSet: string };

export const images = {
  birthday: {
    "src": "/photos/birthday-1000.7a2c22bbdb.webp",
    "width": 1000,
    "height": 667,
    "srcSet": "/photos/birthday-440.c1590d85b5.webp 440w, /photos/birthday-720.6317ded918.webp 720w, /photos/birthday-1000.7a2c22bbdb.webp 1000w"
  },
  cinematic: {
    "src": "/photos/cinematic-1000.4cd7fe0e9d.webp",
    "width": 1000,
    "height": 1250,
    "srcSet": "/photos/cinematic-440.d929eb1dc4.webp 440w, /photos/cinematic-720.6f299c9afc.webp 720w, /photos/cinematic-1000.4cd7fe0e9d.webp 1000w"
  },
  couple: {
    "src": "/photos/couple-1000.2c884b2ab4.webp",
    "width": 1000,
    "height": 667,
    "srcSet": "/photos/couple-440.91648c3962.webp 440w, /photos/couple-720.ef673699d9.webp 720w, /photos/couple-1000.2c884b2ab4.webp 1000w"
  },
  drone: {
    "src": "/photos/drone-1000.9e7306fd0f.webp",
    "width": 1000,
    "height": 667,
    "srcSet": "/photos/drone-440.9d1b7d4510.webp 440w, /photos/drone-720.9374c76105.webp 720w, /photos/drone-1000.9e7306fd0f.webp 1000w"
  },
  engagement: {
    "src": "/photos/engagement-1000.ac0533e727.webp",
    "width": 1000,
    "height": 668,
    "srcSet": "/photos/engagement-440.1b3edcf4e3.webp 440w, /photos/engagement-720.6f34218b8d.webp 720w, /photos/engagement-1000.ac0533e727.webp 1000w"
  },
  hero: {
    "src": "/photos/hero-2000.a93410a608.webp",
    "width": 2000,
    "height": 1333,
    "srcSet": "/photos/hero-640.f9821095e8.webp 640w, /photos/hero-960.56828ee93e.webp 960w, /photos/hero-1440.b5ae7d8fed.webp 1440w, /photos/hero-2000.a93410a608.webp 2000w"
  },
  portrait: {
    "src": "/photos/portrait-1000.2b4336a82d.webp",
    "width": 1000,
    "height": 1500,
    "srcSet": "/photos/portrait-440.094a65a46c.webp 440w, /photos/portrait-720.1b835a0d1c.webp 720w, /photos/portrait-1000.2b4336a82d.webp 1000w"
  },
  prewedding: {
    "src": "/photos/prewedding-1000.097c5c1054.webp",
    "width": 1000,
    "height": 668,
    "srcSet": "/photos/prewedding-440.b0c7ca990c.webp 440w, /photos/prewedding-720.a9c4b18dbc.webp 720w, /photos/prewedding-1000.097c5c1054.webp 1000w"
  },
  wedding: {
    "src": "/photos/wedding-1000.449dfa6a93.webp",
    "width": 1000,
    "height": 1500,
    "srcSet": "/photos/wedding-440.70e0af25d4.webp 440w, /photos/wedding-720.235b0aad7b.webp 720w, /photos/wedding-1000.449dfa6a93.webp 1000w"
  },
} satisfies Record<string, Photo>;
