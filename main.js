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
const ikaSections = []
const subTriStep = 4
for (let i = -subTriStep; i < subTriStep; i++) {
  for (let j = -subTriStep; j < subTriStep; j++) {
    const xmin = i / subTriStep * 1.3 + 0.3
    const ymin = j / subTriStep * 1.3
    const size = 1.3 / subTriStep
    const tris = trimTriangles(ikaTriangles, xmin, ymin, size)
    if (tris.length) ikaSections.push({ triangles: tris, xmin, ymin, size })
  }
}

function geometryFromIkaSection(section) {
  const vertices = []
  const indices = []
  const normals = []
  const tan1 = []
  const tan2 = []
  const uvs = []
  const indicesMap = {}
  const r0 = Math.sqrt(section.xmin ** 2 + section.ymin ** 2)
  for (const triangle of section.triangles) {
    for (const p of triangle) {
      const key = [p.x, p.y, p.z]
      let index = indicesMap[key]
      if (index === undefined) {
        index = vertices.length / 3
        indicesMap[key] = index
        if (p.z < 0.5) {
          uvs.push((section.xmin / r0 + 1) / 2, (section.ymin / r0 + 1) / 2)
        } else {
          const x = section.xmin + section.size * p.x
          const y = section.ymin + section.size * p.y
          uvs.push((x + 1) / 2, (y + 1) / 2)
        }
        vertices.push(p.x, p.y, p.z)
        let t1
        if (p.nz === 0) {
          t1 = { x: 0, y: 0, z: 1 }
        } else {
          const tr = Math.sqrt(1 + (p.nx / p.nz) ** 2)
          t1 = { x: 1 / tr, y: 0, z: -p.nx / p.nz / tr}
        }
        const t2 = {
          x: t1.z * p.ny - t1.y * p.nz,
          y: t1.x * p.nz - t1.z * p.nx,
          z: t1.y * p.nx - t1.x * p.ny,
        }
        normals.push(p.nx, p.ny, p.nz)
        tan1.push(t1.x, t1.y, t1.z)
        tan2.push(t2.x, t2.y, t2.z)
      }
      indices.push(index)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geometry.addAttribute('tan1', new THREE.BufferAttribute(new Float32Array(tan1), 3))
  geometry.addAttribute('tan2', new THREE.BufferAttribute(new Float32Array(tan2), 3))
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
  for (const section of ikaSections) {
    g.save()
    g.translate(section.xmin, section.ymin)
    g.scale(section.size, section.size)
    for (const tri of section.triangles) {
      const [a, b, c] = tri
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
      g.lineTo(c.x, c.y)
      g.closePath()
      g.fill()
      g.stroke()
    }
    g.restore()
  }
  document.body.appendChild(c)

  const renderer = new THREE.WebGLRenderer()
  document.body.appendChild(renderer.domElement)
  renderer.domElement.style.boxShadow = '0 0 1px black'
  const width = 1200
  const height = 900
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 0, 4)
  const texcanvas = document.createElement('canvas')
  texcanvas.width = texcanvas.height = 512
  const texctx = texcanvas.getContext('2d')
  texctx.scale(texcanvas.width, texcanvas.height)
  texctx.fillStyle = '#fa4'
  texctx.fillRect(0, 0, 1, 1)
  texctx.translate(0.5, 0.5)
  texctx.scale(0.5, 0.5)
  sqDrawEyes(texctx)

  const texture = new THREE.Texture(texcanvas)
  texture.needsUpdate = true
  const meshes = []
  for (const sec of ikaSections) {
    const mesh = new THREE.Mesh(geometryFromIkaSection(sec), ikaShader({ map: { value: texture } }))
    mesh.updateMorph = (a, b, c) => {
      const fv = (x, y, z) => new THREE.Vector3(x + 0.1 * Math.sin(a * x - 4 * c), y, z + 0.1 * Math.sin(a * x + b * y + c))
      const fx = (x, y, z) => new THREE.Vector3(sec.size + 0.1 * a * sec.size * Math.cos(a * x - 4 * c), 0, 0.1 * sec.size * a * Math.cos(a * x + b * y + c))
      const fy = (x, y, z) => new THREE.Vector3(0, sec.size, 0.1 * sec.size * b *  Math.cos(a * x + b * y + c))
      const fz = (x, y, z) => new THREE.Vector3(0, 0, 1)
      const uniforms = {
        v000: { value: fv(sec.xmin, sec.ymin, -0.5) },
        v001: { value: fv(sec.xmin, sec.ymin, 0.5) },
        v010: { value: fv(sec.xmin, sec.ymin + sec.size, -0.5) },
        v011: { value: fv(sec.xmin, sec.ymin + sec.size, 0.5) },
        v100: { value: fv(sec.xmin + sec.size, sec.ymin, -0.5) },
        v101: { value: fv(sec.xmin + sec.size, sec.ymin, 0.5) },
        v110: { value: fv(sec.xmin + sec.size, sec.ymin + sec.size, -0.5) },
        v111: { value: fv(sec.xmin + sec.size, sec.ymin + sec.size, 0.5) },
        vx000: { value: fx(sec.xmin, sec.ymin, -0.5) },
        vx001: { value: fx(sec.xmin, sec.ymin, 0.5) },
        vx010: { value: fx(sec.xmin, sec.ymin + sec.size, -0.5) },
        vx011: { value: fx(sec.xmin, sec.ymin + sec.size, 0.5) },
        vx100: { value: fx(sec.xmin + sec.size, sec.ymin, -0.5) },
        vx101: { value: fx(sec.xmin + sec.size, sec.ymin, 0.5) },
        vx110: { value: fx(sec.xmin + sec.size, sec.ymin + sec.size, -0.5) },
        vx111: { value: fx(sec.xmin + sec.size, sec.ymin + sec.size, 0.5) },
        vy000: { value: fy(sec.xmin, sec.ymin, -0.5) },
        vy001: { value: fy(sec.xmin, sec.ymin, 0.5) },
        vy010: { value: fy(sec.xmin, sec.ymin + sec.size, -0.5) },
        vy011: { value: fy(sec.xmin, sec.ymin + sec.size, 0.5) },
        vy100: { value: fy(sec.xmin + sec.size, sec.ymin, -0.5) },
        vy101: { value: fy(sec.xmin + sec.size, sec.ymin, 0.5) },
        vy110: { value: fy(sec.xmin + sec.size, sec.ymin + sec.size, -0.5) },
        vy111: { value: fy(sec.xmin + sec.size, sec.ymin + sec.size, 0.5) },
        vz000: { value: fz(sec.xmin, sec.ymin, -0.5) },
        vz001: { value: fz(sec.xmin, sec.ymin, 0.5) },
        vz010: { value: fz(sec.xmin, sec.ymin + sec.size, -0.5) },
        vz011: { value: fz(sec.xmin, sec.ymin + sec.size, 0.5) },
        vz100: { value: fz(sec.xmin + sec.size, sec.ymin, -0.5) },
        vz101: { value: fz(sec.xmin + sec.size, sec.ymin, 0.5) },
        vz110: { value: fz(sec.xmin + sec.size, sec.ymin + sec.size, -0.5) },
        vz111: { value: fz(sec.xmin + sec.size, sec.ymin + sec.size, 0.5) },
      }
      for (const name in uniforms) mesh.material.uniforms[name] = uniforms[name]
    }
    meshes.push(mesh)
    scene.add(mesh)
  }
  const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(), new THREE.MeshPhongMaterial())
  plane.position.set(0, 0, 0)
  plane.scale.set(3, 3, 3)
  scene.add(plane)
  const directionalLight = new THREE.DirectionalLight(0xEEEEEE)
  directionalLight.position.set(1, 2, 3)
  scene.add(directionalLight)
  function animate() {
    const t = performance.now() / 1000
    const zcos = Math.cos(0.24 * t)
    const zsin = Math.sin(0.24 * t)
    for (const mesh of meshes){
      mesh.updateMorph(4 * Math.cos(t), 4 * Math.sin(t), 4 * t)
    }
    // camera.position.set(4 * Math.cos(0.2 * t) * zsin, 4 * Math.sin(0.2 * t) * zsin, 4 * zcos)
    camera.position.set(4 * Math.cos(0.2 * t) * zsin, 4 * Math.sin(0.2 * t) * zsin, 3)
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
})
