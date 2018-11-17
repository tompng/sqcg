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
  sqDrawEyes(ctx)
}

const ikaTriangles = coordsShrink3D()
const subTriangles = []
const subTriStep = 4
for (let i = -subTriStep; i < subTriStep; i++) {
  for (let j = -subTriStep; j < subTriStep; j++) {
    const xmin = i / 4
    const xrange = [i / subTriStep * 1.3 + 0.3, (i + 1) * 1.3 / subTriStep + 0.3]
    const yrange = [j / subTriStep * 1.3, (j + 1) / subTriStep * 1.3]
    const tris = trimTriangles(ikaTriangles, xrange, yrange)
    if (tris.length) subTriangles.push(tris)
  }
}

function geometryFromTriangle(triangles) {
  const vertices = []
  const indices = []
  const normals = []
  const uvs = []
  const indicesMap = {}
  const p0 = triangles[0][0]
  const r0 = Math.sqrt(p0.x ** 2 + p0.y ** 2)
  for (const triangle of triangles) {
    for (const p of triangle) {
      const key = [p.x, p.y, p.z]
      let index = indicesMap[key]
      if (index === undefined) {
        index = vertices.length / 3
        indicesMap[key] = index
        if (p.z < 0) {
          uvs.push((p0.x / r0 + 1) / 2, (p0.y / r0 + 1) / 2)
        } else {
          uvs.push((p.x + 1) / 2, (p.y + 1) / 2)
        }
        vertices.push(p.x, p.y, p.z)
        normals.push(p.nx, p.ny, p.nz)
      }
      indices.push(index)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
  return geometry
}

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

  const c=document.createElement('canvas')
  const size = c.width = c.height = 1024
  const g = c.getContext('2d')
  g.translate(size / 2, size / 2)
  g.scale(size / 4, size / 4)
  g.beginPath()
  g.fillStyle = 'rgba(0, 0, 0, 0.2)'
  g.strokeStyle = 'red'
  g.lineWidth = 0.001
  for (const tris of subTriangles) {
    for (const tri of tris) {
      const [a, b, c] = tri
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
      g.lineTo(c.x, c.y)
      g.closePath()
      g.fill()
      g.stroke()
    }
    console.error(tris.length)
  }
  document.body.appendChild(c)

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
  const meshes = []
  for (const tris of subTriangles) {
    const mesh = new THREE.Mesh(geometryFromTriangle(tris), material)
    meshes.push(mesh)
    scene.add(mesh)
  }
  const directionalLight = new THREE.DirectionalLight(0xEEEEEE)
  directionalLight.position.set(1, 2, 3)
  scene.add(directionalLight)
  function animate() {
    for (const mesh of meshes) {
      mesh.rotation.y += 0.01
      mesh.rotation.x += 0.005
    }
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
})
