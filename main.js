function sqDrawEyes(ctx) {
  ctx.save()
  ctx.translate(0.15,0)
  ctx.beginPath()
  ctx.curve([
    {x:0.34,y:0},
    {x:0.4,y:0.32},
    {x:0.2,y:0.65},
    {x:-0.22,y:0.65},
    {x:-0.4,y:0.32},
    {x:-0.34,y:0},
    {x:-0.4,y:-0.32},
    {x:-0.22,y:-0.65},
    {x:0.2,y:-0.65},
    {x:0.4,y:-0.32}
  ], true)
  ctx.fillStyle = 'black'
  ctx.fill()
  for (let d = -1; d <= 1; d += 2) {
    ctx.beginPath()
    ctx.arc(0.02,0.3*d,0.34,0,2*Math.PI)
    ctx.fillStyle = 'white'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0.08,0.3*d,0.22,0,2*Math.PI)
    ctx.fillStyle = 'black'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0.15,0.3*d-0.1,0.03,0,2*Math.PI)
    ctx.fillStyle = 'white'
    ctx.fill()
  }
  ctx.restore()
}

onload = () => {
  const canvas = document.createElement('canvas')
  const size = 1024
  canvas.width = canvas.height = size
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.scale(size / 4, size / 4)
  ctx.lineWidth = 0.01
  ctx.beginPath()
  ctx.curve(ikachanCoords(), true)
  ctx.stroke()

  function coordsMap(coords, f) {
    return coords.map((p, i) => {
      const a = coords[(i + coords.length - 1) % coords.length]
      const b = coords[(i + 1) % coords.length]
      return f(a, p, b)
    })
  }

  const coords = ikachanCoords()
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
  for(let tmpcoords = coords, i = 0; i < 18; i++) {
    console.error(tmpcoords.length)
    const sh = 0.1 * (i + 1) ** 2 / 256
    tmpcoords = shrinkCoords(tmpcoords, sh)
    tmpcoords = replotCoords(tmpcoords, 0.06)
    tmpcoords = smooth(tmpcoords, i < 6 ? 0 : (i - 6))
    ctx.beginPath()
    ctx.curve(tmpcoords, true)
    ctx.stroke()
  }

  ctx.globalAlpha = 0.6
  sqDrawEyes(ctx)
}


const triangles = coordsShrink3D()
window.addEventListener('load', () => {
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
  // showMap(inflated.map)
  for (let i = triangles.length - 1; i >= 0; i--) {
    triangles.push(triangles[i].map(p => {
      const nz = -p.nz / 2
      const nr = Math.sqrt(p.nx ** 2 + p.ny ** 2 + nz ** 2)
      return {
        x: p.x,
        y: p.y,
        z: -p.z / 2,
        nx: p.nx / nr,
        ny: p.ny / nr,
        nz: nz / nr
      }
    }).reverse())
  }

  const c=document.createElement('canvas')
  const size = c.width = c.height = 1024
  const g = c.getContext('2d')
  g.translate(size / 2, size / 2)
  g.scale(size / 4, size / 4)
  g.beginPath()
  g.fillStyle = 'rgba(0, 0, 0, 0.2)'
  g.strokeStyle = 'red'
  g.lineWidth = 0.001
  triangles.forEach(tri => {
    const [a, b, c] = tri
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.lineTo(c.x, c.y)
    g.closePath()
    g.fill()
    g.stroke()
  })

  document.body.appendChild(c)
  console.error(triangles.length)

  const renderer = new THREE.WebGLRenderer()
  document.body.appendChild(renderer.domElement)
  renderer.domElement.style.boxShadow = '0 0 1px black'
  const width = 800
  const height = 600
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 0, 4)
  const vertices = []
  const indices = []
  const normals = []
  const uvs = []
  const indicesMap = {}
  for (const triangle of triangles) {
    for (const p of triangle) {
      const key = [p.x, p.y, p.z]
      let index = indicesMap[key]
      if (index === undefined) {
        index = vertices.length / 3
        indicesMap[key] = index
        uvs.push((p.x + 1) / 2, (p.y + 1) / 2)
        vertices.push(p.x, p.y, p.z)
        normals.push(p.nx, p.ny, p.nz)
      }
      indices.push(index)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  // geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  geometry.computeVertexNormals()
  const texcanvas = document.createElement('canvas')
  texcanvas.width = texcanvas.height = 256
  const texctx = texcanvas.getContext('2d')
  texctx.scale(texcanvas.width, texcanvas.height)
  texctx.fillStyle = '#fa4'
  texctx.fillRect(0, 0, 1, 1)
  texctx.translate(0.5, 0.5)
  texctx.scale(0.5, 0.5)
  sqDrawEyes(texctx)


  const texture = new THREE.Texture(texcanvas)
  texture.needsUpdate = true
  const material = new THREE.MeshPhongMaterial({ color: 0xffffff, map: texture })
  const box = new THREE.Mesh(geometry, material)
  const directionalLight = new THREE.DirectionalLight(0xEEEEEE)
  directionalLight.position.set(1, 2, 3)
  scene.add(box)
  scene.add(directionalLight)
  function animate() {
    box.rotation.y += 0.01
    box.rotation.x += 0.005
    // box.rotation.y = 1.2
    // box.rotation.x = 0.5
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
})
