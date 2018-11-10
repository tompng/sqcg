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
  each2D(size, (i, j) => {
    map[i][j] = Math.min(map[i][j], map[i][size - 1 - j])
  })
  return { map, wmap, size }
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

const inflated = funcShapeInflate(ikachanShapeFunc, 1.6, 32)
window.addEventListener('load', () => {
  showMap(inflated.map)
  inflatedMapToPolygon(inflated)
})

function inflatedMapToPolygon(info) {
  const { map, wmap, size } = info
  const lmap = Array(size).fill().map(() => Array(size).fill())
  each2D(size - 1, (i, j) => {
    if (Math.min(wmap[i][j], wmap[i + 1][j], wmap[i][j + 1], wmap[i + 1][j + 1]) <= 0.5) return
    lmap[i][j] = Infinity
  })
  each2D(size - 1, (i, j) => {
    if (lmap[i][j] !== undefined) return
    if (Math.max(wmap[i][j], wmap[i + 1][j], wmap[i][j + 1], wmap[i + 1][j + 1]) <= 0.5) return
    lmap[i][j] = 0.5
    setLevel(i - 1, j, 1)
    setLevel(i + 1, j, 1)
    setLevel(i, j - 1, 1)
    setLevel(i, j + 1, 1)
  })
  function setLevel(i, j, n) {
    if (i % n !== 0 || j % n !== 0) throw 'a'
    let outOfRange = false
    each2D(n, (ii, jj) => {
      if (lmap[i + ii][j + jj] === undefined) outOfRange = true
    })
    if (outOfRange) return
    let changed = false
    each2D(n, (ii, jj) => {
      const nwas = lmap[i + ii][j + jj]
      if (n >= nwas) return
      lmap[i + ii][j + jj] = n
      changed = true
    })
    if (!changed) return
    const ij2 = i => Math.floor(i / 2 / n) * 2 * n
    setLevel(ij2(i - n), ij2(j), 2 * n)
    setLevel(ij2((i + n)), ij2(j), 2 * n)
    setLevel(ij2(i), ij2((j - n)), 2 * n)
    setLevel(ij2(i), ij2((j + n)), 2 * n)
  }
  function checkLevel(i, j, n) {
    if (n == 1) {
      setLevel(i, j, 1)
      return
    }
    const v00 = map[i][j]
    const v01 = map[i + n][j]
    const v10 = map[i][j + n]
    const v11 = map[i + n][j + n]
    let ok = true
    each2D(n + 1, (ii, jj) => {
      const x = ii / n
      const y = jj / n
      const v = v00 * (1 - x) * (1 - y) + v01 * x * (1 - y) + v10 * (1 - x) * y + v11 * x * y
      if (wmap[i + ii][j + jj] <= 0.5) ok = false
      if (Math.abs(map[i + ii][j + jj] - v) > 0.01) ok = false
    })
    if (ok) {
      setLevel(i, j, n)
    } else {
      const n2 = n / 2
      checkLevel(i, j, n2)
      checkLevel(i + n2, j, n2)
      checkLevel(i, j + n2, n2)
      checkLevel(i + n2, j + n2, n2)
    }
  }
  const lines = []
  function createPolygon(i, j, n) {
    if (lmap[i][j] === n) {
      lines.push([{i, j}, {i: i+n, j}])
      lines.push([{i: i+n, j}, {i: i+n, j: j+n}])
      lines.push([{i: i+n, j: j+n}, {i, j: j+n}])
      lines.push([{i, j: j+n}, {i, j}])
    } else {
      if (n == 1) return
      const n2 = n / 2
      createPolygon(i, j, n2)
      createPolygon(i + n2, j, n2)
      createPolygon(i, j + n2, n2)
      createPolygon(i + n2, j + n2, n2)
    }
  }
  checkLevel(0, 0, size - 1)
  createPolygon(0, 0, size - 1)
  const mdlValue = (a, b) => (0.5 - a) / (b - a)
  each2D(size, (i, j) => {
    if (lmap[i][j] !== 0.5) return
    const v00 = wmap[i][j]
    const v01 = wmap[i + 1][j]
    const v10 = wmap[i][j + 1]
    const v11 = wmap[i + 1][j + 1]
    const coords = []
    const vs = [[v00, 0, 0], [v01, 1, 0], [v11, 1, 1], [v10, 0, 1]]
    const push = p => {
      const last = coords[coords.length -1 ]
      if (last && last.i == p.i && last.j == p.j) return
      coords.push(p)
    }
    for (let k = 0; k < 4; k++) {
      const [a, i1, j1] = vs[k]
      const [b, i2, j2] = vs[(k + 1) % 4]
      if (a > 0.5) push({ i: i + i1, j: j + j1 })
      if ((a > 0.5 && b <= 0.5) || (a <= 0.5 && b > 0.5)) {
        const c = mdlValue(a, b)
        push({ i: i + i1 + c * (i2 - i1), j: j + j1 + c * (j2 - j1) })
      }
      if (b > 0.5) push({ i: i + i2, j: j + j2 })
    }
    for (let k = 0; k < coords.length; k++) {
      lines.push([coords[k], coords[(k + 1) % coords.length]])
    }
  })
  const c=document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  g.beginPath()
  g.scale(512/size, 512/size)
  lines.forEach(l => {
    const [p, q] = l
    g.moveTo(p.i, p.j)
    g.lineTo(q.i, q.j)
  })
  g.lineWidth = 0.1
  g.stroke()
  document.body.appendChild(c)
  console.error(lines.length)
  return lmap
}