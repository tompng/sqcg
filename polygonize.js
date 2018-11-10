function each2D(size, f) {
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) f(i, j)
  }
}

function funcShapeInflate(func, scale, n) {
  const size = 2 * n + 1
  const map = Array(size).fill().map(()=>Array(size).fill(0))
  const wmap = Array(size).fill().map(()=>Array(size).fill(0))

  each2D(size, (i, j) => {
    const x = (i - n) * scale / n
    const y = (j - n) * scale / n
    const d = scale / n / 2
    const vs = [func(x-d,y-d), func(x-d,y+d), func(x+d,y-d), func(x+d,y+d)]
    let minus = 0, plus = 0
    for (const v of vs) v < 0 ? minus -= v : plus += v
    wmap[i][j] = minus / (minus + plus)
    map[i][j] = wmap[i][j]
  })
  for (let k = 0; k < 256; k++) {
    const A = (1 / size) ** 2
    each2D(size, (i, j) => {
      if (wmap[i][j] === 0) return
      const sum = map[i - 1][j] + map[i + 1][j] + map[i][j - 1] + map[i][j + 1]
      map[i][j] = (sum + A) / (A + 4) * wmap[i][j]
    })
  }
  each2D(size, (i, j) => { map[i][j] = Math.sqrt(map[i][j]) })
  return { map, wmap }
}
function showMap(map) {
  const size = map.length
  const c=document.createElement('canvas')
  c.width = c.height = size
  c.style.width = size/2
  const g = c.getContext('2d')
  const d = g.createImageData(size, size)
  each2D(size, (i, j) => {
    const k = 4 * (j * size + i)
    const v = map[i][j]
    d.data[k+0] = v * 0xff
    d.data[k+1] = v * 0xff
    d.data[k+2] = v * 0xff
    d.data[k+3] = 0xff
  })
  window.m=map
  g.putImageData(d, 0, 0)
  document.body.appendChild(c)
}

setTimeout(() => showMap(funcShapeInflate(ikachanShapeFunc, 1.6, 128).map), 1000)
