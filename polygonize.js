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
    const v = func(x, y)
    wmap[i][j] = v
    map[i][j] = v < 0 ? 1 : 0
  })
  for (let k = 0; k < 512; k++) {
    const A = 4 / size
    const wat = (i, j, v) => {
      const v2 = wmap[i][j]
      return v2 < 0 ? 1 : v / (v - v2)
    }
    each2D(size, (i, j) => {
      const v = wmap[i][j]
      if (v >= 0) return
      let wsum = 0, sum = 0, w, wp, wm
      wp = wat(i + 1, j, v)
      wm = wat(i - 1, j, v)
      wsum += 1 / wm + 1 / wp
      sum += ((wp === 1 ? map[i + 1][j] : 0) / wp + (wm === 1 ? map[i - 1][j] : 0) / wm) / (wp + wm)
      wp = wat(i, j + 1, v)
      wm = wat(i, j - 1, v)
      wsum += 1 / wm + 1 / wp
      sum += ((wp === 1 ? map[i][j + 1] : 0) / wp + (wm === 1 ? map[i][j - 1] : 0) / wm) / (wp + wm)
      map[i][j] = (2 * sum + A) / (A + wsum)
    })
  }
  each2D(size, (i, j) => { map[i][j] = Math.sqrt(map[i][j]) })
  each2D(size, (i, j) => {
    map[i][j] = Math.min(map[i][j], map[i][size - 1 - j])
  })
  const wfunc = (i, j) => func((i - n) * scale / n, (j - n) * scale / n)
  return { map, wmap, size, wfunc, n, scale }
}

function inflatedMapToPolygon(info, zscale = 1 / 3) {
  const { map, wfunc, size } = info
  const lmap = Array(size).fill().map(() => Array(size).fill())
  each2D(size - 1, (i, j) => {
    if (Math.max(wfunc(i, j), wfunc(i + 1, j), wfunc(i, j + 1), wfunc(i + 1, j + 1)) > 0) return
    lmap[i][j] = Infinity
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
    setLevel(ij2(i), ij2(j), n)
    setLevel(ij2(i), ij2(j) + n, n)
    setLevel(ij2(i) + n, ij2(j), n)
    setLevel(ij2(i) + n, ij2(j) + n, n)
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
      if (wfunc(i + ii, j + jj) > 0) ok = false
      if (Math.abs(map[i + ii][j + jj] - v) > 0.025*0+0.01) ok = false
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
  const triangles = []
  function createPolygon(i, j, n) {
    if (lmap[i][j] === n) {
      if (n == 1 || (lmap[i - n][j] >= n && lmap[i + n][j] >= n && lmap[i][j - n] >= n && lmap[i][j + n] >= n)) {
        const points = [{i, j}, {i: i+n, j}, {i: i+n, j: j+n}, {i, j: j+n}]
        triangles.push([points[0], points[1], points[2]])
        triangles.push([points[0], points[2], points[3]])
      } else {
        const coords = []
        coords.push({ i, j })
        if (lmap[i - n][j] < n) coords.push({ i, j: j + n / 2 })
        coords.push({ i, j: j + n})
        if (lmap[i][j + n] < n) coords.push({ i: i + n / 2, j: j + n })
        coords.push({ i: i + n, j: j + n})
        if (lmap[i + n][j] < n) coords.push({ i: i + n, j: j + n / 2 })
        coords.push({ i: i + n, j})
        if (lmap[i][j - n] < n) coords.push({ i: i + n / 2, j })
        const c = { i: i + n / 2, j: j + n / 2 }
        for (let k = 0; k < coords.length; k++) {
          triangles.push([c, coords[(k + 1) % coords.length], coords[k]])
        }
      }
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
  each2D(size - 1, (i, j) => {
    if (lmap[i][j] !== undefined) return
    if (Math.min(wfunc(i, j), wfunc(i + 1, j), wfunc(i, j + 1), wfunc(i + 1, j + 1)) > 0) return
    lmap[i][j] = 0.5
  })
  createPolygon(0, 0, size - 1)
  const mdlValue = (a, b) => a / (a - b)
  each2D(size, (i, j) => {
    if (lmap[i][j] !== 0.5) return
    const v00 = wfunc(i, j)
    const v01 = wfunc(i + 1, j)
    const v10 = wfunc(i, j + 1)
    const v11 = wfunc(i + 1, j + 1)
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
      if (a < 0) push({ i: i + i1, j: j + j1 })
      if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) {
        const c = mdlValue(a, b)
        push({ i: i + i1 + c * (i2 - i1), j: j + j1 + c * (j2 - j1), fixed: true })
      }
      if (b < 0) push({ i: i + i2, j: j + j2 })
    }
    const last = coords[coords.length - 1]
    if (coords[0].i == last.i && coords[0].j == last.j) coords.shift()
    for (let k = 0; k < coords.length - 2; k++) {
      triangles.push([coords[k], coords[k + 1], coords[coords.length - 1]])
    }
  })
  for (const triangle of triangles) {
    for (const p of triangle) {
      p.x = (p.i - info.n) / info.n * info.scale
      p.y = (p.j - info.n) / info.n * info.scale
      if (p.fixed) {
        const d = 1 / 256 / 1000
        const dx = wfunc(p.i + d, p.j) - wfunc(p.i - d, p.j)
        const dy = wfunc(p.i, p.j + d) - wfunc(p.i, p.j - d)
        const dr = Math.sqrt(dx ** 2 + dy ** 2)
        p.z = 0
        p.nx = dx / dr
        p.ny = dy / dr
        p.nz = 0
      } else {
        let wp, wm
        const f = wfunc(p.i, p.j)
        const v = map[p.i][p.j]
        const wat = (i, j) => {
          const f2 = wfunc(i, j)
          return f2 < 0 ? 1 : f / (f - f2)
        }
        wp = wat(p.i + 1, p.j)
        wm = wat(p.i - 1, p.j)
        const dxp = ((wp === 1 ? map[p.i + 1][p.j] ** 2 : 0) - v ** 2) / wp
        const dxm = (v ** 2 - (wm === 1 ? map[p.i - 1][p.j] ** 2 : 0)) / wm
        const dx = (dxp + dxm) / 2 * zscale / v
        wp = wat(p.i, p.j + 1)
        wm = wat(p.i, p.j - 1)
        const dyp = ((wp === 1 ? map[p.i][p.j + 1] ** 2 : 0) - v ** 2) / wp
        const dym = (v ** 2 - (wm === 1 ? map[p.i][p.j - 1] ** 2 : 0)) / wm
        const dy = (dyp + dym) / 2 * zscale / v
        const dz = 1 / info.n * info.scale
        p.z = map[p.i][p.j] * zscale
        const dr = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)
        p.nx = -dx / dr
        p.ny = -dy / dr
        p.nz = dz / dr
      }
    }
  }
  return triangles
}
