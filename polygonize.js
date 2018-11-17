function coordsShrink3D() {
  const coords = ikachanCoords()
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
      if (!pi || !pj) throw 'a'
      if (i / coords1.length < j / coords2.length) {
        const pi2 = coords1[++i]
        if (!pi2) return
        triangles.push([{ ...pj, z: z2 }, { ...pi, z: z1 }, { ...pi2, z: z1 }])
      } else {
        const pj2 = coords2[++j]
        if (!pj2) return
        triangles.push([{ ...pj, z: z2 }, { ...pi, z: z1 }, { ...pj2, z: z2 }])
      }
    }
  }
  function zfunc(i) {
    const t = i / 18
    return (1 - (1 - t) ** 2) / 3
  }
  let tmpcoords = coords
  for(let i = 0; i < 18; i++) {
    const sh = 0.1 * (i + 1) ** 2 / 256
    const coordsWas = tmpcoords
    tmpcoords = shrinkCoords(tmpcoords, sh)
    tmpcoords = replotCoords(tmpcoords, 0.06)
    tmpcoords = smooth(tmpcoords, i < 6 ? 0 : (i - 6))
    fill(coordsWas, tmpcoords, zfunc(i), zfunc(i + 1))
  }
  const center = { x: 0, y: 0 }
  tmpcoords.forEach(p => {
    center.x += p.x / tmpcoords.length
    center.y += p.y / tmpcoords.length
  })
  for (let i = 0; i < tmpcoords.length; i++) {
    const p = { ...tmpcoords[i], z: zfunc(18) }
    const q = { ...tmpcoords[(i + 1) % tmpcoords.length], z: zfunc(18) }
    const c = { ...center, z: zfunc(18.5) }
    triangles.push([p, q, c])
  }
  return triangles
}
