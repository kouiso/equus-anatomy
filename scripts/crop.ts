import { renderGrid } from './debug-render'
const [file, x, y, w, h, step] = process.argv.slice(2)
renderGrid({
  imageFile: file ?? 'muscle_left.jpg',
  crop: { x: Number(x), y: Number(y), w: Number(w), h: Number(h) },
  step: step ? Number(step) : 50,
  out: 'shots/crop.jpg',
})
console.log(`shots/crop.jpg  (${x},${y}) から ${w}x${h}  目盛り ${step ?? 50}px`)
