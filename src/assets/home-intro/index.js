// Auto-discovered photo list for the home-page intro montage.
// Drop any .jpg / .jpeg / .png / .webp file into this folder and it
// will be picked up on the next build — no manifest to maintain.
// Sorted alphabetically so order is deterministic across builds.
const modules = import.meta.glob('./*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const introPhotos = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url)
