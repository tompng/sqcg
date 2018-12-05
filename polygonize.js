function coordsShrink3D() {
  const coords = ikachanCoords(128)
  function coordsMap(coords, f) {
    return coords.map((p, i) => {
      const a = coords[(i + coords.length - 1) % coords.length]
      const b = coords[(i + 1) % coords.length]
      return f(a, p, b)
    })
  }
  function shrinkCoords(coords, l){
    return coordsMap(coords, (a, p, b) => {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dr = Math.sqrt(dx ** 2 + dy ** 2)
      return {
        x: p.x - l * dy / dr,
        y: p.y + l * dx / dr
      }
    })
  }
  function smooth(coords, pow) {
    for (let i = 0; i < pow; i++) {
      const c = Math.min(1, pow - i) / 2
      const s = 1 / (1 + 2 * c)
      coords = coordsMap(coords, (a, p, b) => {
        return { x: (p.x + c * (a.x + b.x)) * s, y: (p.y + c * (a.y + b.y)) * s }
      })
    }
    return coords
  }
  const triangles = []
  function fill(coords1, coords2, z1, z2) {
    let i = -1
    let j = -1
    while (coords1[i + 1] || coords2[j + 1]) {
      const pi = coords1[i < 0 ? coords1.length - 1 : i]
      const pj = coords2[j < 0 ? coords2.length - 1 : j]
      if (i / coords1.length < j / coords2.length) {
        const pi2 = coords1[++i]
        if (!pi2) return
        if (pi.x === pi2.x && pi.y === pi2.y) continue
        triangles.push([{ ...pj, z: z2 }, { ...pi, z: z1 }, { ...pi2, z: z1 }])
      } else {
        const pj2 = coords2[++j]
        if (!pj2) return
        if (pj.x === pj2.x && pj.y === pj2.y) continue
        triangles.push([{ ...pj, z: z2 }, { ...pi, z: z1 }, { ...pj2, z: z2 }])
      }
    }
  }
  function zfunc(i) {
    const t = i / 18
    return (1 - (1 - t) ** 3) / 3
  }
  let tmpcoords = coords
  for(let i = 0; i < 16; i++) {
    const sh = 0.1 * (i + 1) / 16
    const coordsWas = tmpcoords
    tmpcoords = shrinkCoords(tmpcoords, sh)
    tmpcoords = replotCoords(tmpcoords, 0.04)
    tmpcoords = smooth(tmpcoords, i)
    fill(coordsWas, tmpcoords, zfunc(i), zfunc(i + 1))
  }
  const center = { x: 0, y: 0 }
  tmpcoords.forEach(p => {
    center.x += p.x / tmpcoords.length
    center.y += p.y / tmpcoords.length
  })
  for (let i = 0; i < tmpcoords.length; i++) {
    const p = { ...tmpcoords[i], z: zfunc(16) }
    const q = { ...tmpcoords[(i + 1) % tmpcoords.length], z: zfunc(16) }
    const c = { ...center, z: zfunc(17) }
    triangles.push([p, q, c])
  }
  for (let i = triangles.length - 1; i >= 0; i--) {
    triangles.push(triangles[i].map(p => {
      const nz = -p.nz / 2
      const nr = Math.sqrt(p.nx ** 2 + p.ny ** 2 + nz ** 2)
      return {
        x: p.x,
        y: p.y,
        z: Math.atan(-8 * p.z) / 8
      }
    }).reverse())
  }
  for (const tri of triangles) {
    for (const p of tri) p.z += 0.2
  }
  const pointNormals = {}
  for (const tri of triangles) {
    const [a, b, c] = tri
    const va = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z }
    const vb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z }
    const ra = Math.sqrt(va.x ** 2 + va.y ** 2 + va.z ** 2)
    const rb = Math.sqrt(vb.x ** 2 + vb.y ** 2 + vb.z ** 2)
    const dot = va.x * vb.x + va.y * vb.y + va.z * vb.z
    const s = ra * rb * Math.sin(Math.acos(dot / ra / rb))
    const nx = va.y * vb.z - va.z * vb.y
    const ny = va.z * vb.x - va.x * vb.z
    const nz = va.x * vb.y - va.y * vb.x
    for (const p of tri) {
      const key = [p.x, p.y, p.z]
      const norm = pointNormals[key] = pointNormals[key] || { x: 0, y: 0, z: 0 }
      norm.x += s * nx
      norm.y += s * ny
      norm.z += s * nz
    }
  }
  for (const tri of triangles) {
    for (const p of tri) {
      const norm = pointNormals[[p.x, p.y, p.z]]
      const nr = Math.sqrt(norm.x ** 2 + norm.y ** 2 + norm.z ** 2)
      p.nx = norm.x / nr
      p.ny = norm.y / nr
      p.nz = norm.z / nr
    }
  }
  return triangles
}

function trimTriangles(triangles, xmin, ymin, size) {
  const xmax = xmin + size
  const ymax = ymin + size
  const out = []
  function interpolate2(a, b, t) {
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t
    const z = a.z + (b.z - a.z) * t
    let nx = a.nx + (b.nx - a.nx) * t
    let ny = a.ny + (b.ny - a.ny) * t
    let nz = a.nz + (b.nz - a.nz) * t
    const nr = Math.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nx /= nr
    ny /= nr
    nz /= nr
    return { x, y, z, nx, ny, nz }
  }
  function tinclude(x, y, xth, yth) {
    if (xth != null) {
      return xth === xmin ? xmin <= x : x <= xmax
    } else {
      return yth === ymin ? ymin <= y : y <= ymax
    }
  }
  for (const tri of triangles) {
    let coords = tri
    for (cut of [[xmin, null], [xmax, null], [null, ymin], [null, ymax]]) {
      const [xth, yth] = cut
      const coords2 = []
      for (let i = 0; i < coords.length; i++) {
        const p = coords[i]
        const q = coords[(i + 1) % coords.length]
        const tp = tinclude(p.x, p.y, xth, yth)
        const tq = tinclude(q.x, q.y, xth, yth)
        if (!tp && !tq) continue
        if (tp) {
          coords2.push(p)
          if (tq) continue
        }
        const t = xth != null ? (xth - p.x) / (q.x - p.x) : (yth - p.y) / (q.y - p.y)
        coords2.push(interpolate2(p, q, t))
      }
      coords = coords2
    }
    for (let i = 1; i < coords.length - 1; i++) {
      out.push([coords[0], coords[i], coords[i + 1]])
    }
  }
  return out.map(tri => {
    return tri.map(p => {
      window.aaa = window.aaa || p.z
      window.bbb = window.bbb || p.z
      if (window.aaa < p.z) window.aaa = p.z
      if (window.bbb > p.z) window.bbb = p.z
      0.25 + p.z
      const zscale = size
      const nr = Math.sqrt(p.nx ** 2 + p.ny ** 2 + (p.nz / size) ** 2)
      return {
        nx: p.nx / nr,
        ny: p.ny / nr,
        nz: p.nz / size / nr,
        x: (p.x - xmin) / size,
        y: (p.y - ymin) / size,
        z: 0.25 + p.z
      }
    })
  })
}
