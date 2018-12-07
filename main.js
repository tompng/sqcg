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
  const width = 800
  const height = 600
  renderer.setSize(width, height)
  renderer.domElement.style.width = width + 'px'
  renderer.domElement.style.height = height + 'px'
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
  const squids = []
  function addSquid(z = 2) {
    const sq = new Squid(ikaSections, numSections, texture, { hitSphere: false, mesh: true, wire: false })
    randomizeSquid(sq, z)
    squids.push(sq)
    scene.add(sq.meshGroup)
  }
  function randomizeSquid(sq, z) {
    sq.randomJelly(16 * Math.random())
    sq.setPosition({ x: 0, y: 0, z: z })
    sq.calculateJellyXYZ()
    sq.updateSpherePosition()
  }
  window.squids = squids
  addSquid(3)
  const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 16, 16), new THREE.MeshPhongMaterial({ wireframe: true }))
  plane.position.set(0, 0, 0)
  plane.scale.set(8, 8, 8)
  scene.add(plane)
  const directionalLight = new THREE.DirectionalLight(0xEEEEEE)
  directionalLight.position.set(1, 2, 3)
  scene.add(directionalLight)
  document.body.onclick = () => {
    if (squids.length < 2) addSquid(3)
    else {
      const sq = squids.shift()
      squids.push(sq)
      randomizeSquid(sq, 3)
    }
  }
  let cnt = 0
  function animate() {
    const t = ++cnt * 0.01
    const zcos = Math.cos(0.24 * t)
    const zsin = Math.sin(0.24 * t)

    const dt = 0.1
    for(let i = 0; i < 2; i++) {
      squids.forEach(s => s.resetSphereForce())
      squids.forEach(s => s.hitFloor())
      squids.forEach(s1 => {
        squids.forEach(s2 => {
          if (s1 == s2) return
          Squid.hitBoth(s1, s2)
        })
      })
      squids.forEach(s => s.updateJelly(dt))
      squids.forEach(s => s.calculateJellyXYZ())
      squids.forEach(s => s.updateSpherePosition())
    }
    squids.forEach(s => s.updateMorph())
    camera.up.set(0, 0, 1)
    camera.position.set(6 * Math.cos(0.2 * t), 6 * Math.sin(0.2 * t), 2)
    camera.lookAt(0, 0, 1)
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
})
