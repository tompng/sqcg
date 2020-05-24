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
let cameraDistance = 12
let numCalcs = 2
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
  window.renderer = renderer
  document.body.appendChild(renderer.domElement)
  renderer.domElement.style.boxShadow = '0 0 1px black'
  const width = 800
  const height = 600
  renderer.setSize(width, height)
  renderer.domElement.style.width = width + 'px'
  renderer.domElement.style.height = height + 'px'
  renderer.setPixelRatio(window.devicePixelRatio)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100)
  camera.position.set(0, 0, 4)
  window.camera = camera
  function createSquidTexture(color) {
    const texcanvas = document.createElement('canvas')
    texcanvas.width = texcanvas.height = 512
    const texctx = texcanvas.getContext('2d')
    texctx.scale(texcanvas.width, texcanvas.height)
    texctx.fillStyle = color || 'transparent'
    texctx.fillRect(0, 0, 1, 1)
    texctx.translate(0.5, 0.5)
    texctx.scale(0.5, 0.5)
    sqDrawEyes(texctx)
    const texture = new THREE.Texture(texcanvas)
    texture.needsUpdate = true
    return texture
  }
  const colors = ['#F4A', '#CF4', '#F62', '#24F', '#4FD', '#E4F', '#FD3', '#FFF']
  const texture = createSquidTexture()
  const squids = []
  function addSquid(z = 2) {
    const color = colors.shift()
    colors.push(color)
    const sq = new Squid(ikaSections, numSections, texture, color, { hitSphere: false, mesh: true, wire: false })
    randomizeSquid(sq, z)
    squids.push(sq)
    scene.add(sq.meshGroup)
  }
  function randomizeSquid(sq, z) {
    sq.randomJelly(16 * Math.random())
    sq.setPosition({ x: 4 * Math.random() - 2, y: 0, z: z })
    sq.calculateJellyXYZ()
    sq.updateSpherePosition()
    sq.updateMorph()
  }
  window.squids = squids
  addSquid()
  const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 16, 16), new THREE.MeshPhongMaterial)
  plane.position.set(0, 0, 0)
  plane.scale.set(10, 10, 10)
  scene.add(plane)
  plane.receiveShadow = true

  const directionalLight = new THREE.DirectionalLight(0xEEEEEE)
  directionalLight.castShadow = true
  renderer.shadowMap.enabled = true
  renderer.shadowMapType = THREE.PCFSoftShadowMap
  directionalLight.shadow.mapSize.width = directionalLight.shadow.mapSize.height = 2048;
  directionalLight.position.set(2,1,3)
  scene.add(directionalLight)
  document.body.onclick = () => {
    if (squids.length < 3) {
      addSquid()
    } else {
      const sq = squids.shift()
      sq.meshGroup
      squids.push(sq)
      sq.countdown = 20
    }
  }
  let running = true
  let wasd = { w: false, a: false, s: false, d: false }
  function keychanged(code, flag) {
    if (code == 87) wasd.w = flag
    if (code == 65) wasd.a = flag
    if (code == 83) wasd.s = flag
    if (code == 68) wasd.d = flag
  }
  document.body.onkeyup = e => keychanged(e.keyCode, false)
  document.body.onkeydown = e => keychanged(e.keyCode, true)
  document.body.onkeypress = e => {
    if (e.keyCode === 32) running = !running
  }
  window.time = {}
  function update(dt) {
    for(let k=0;k<4;k++){
    squids.forEach(s => s.resetSphereForce())
    squids.forEach(s => !s.countdown && s.hitFloor())
    const t0 = performance.now()
    squids.forEach(s => s.calcHitMap())
    const t1 = performance.now()
    squids.forEach(s1 => {
      squids.forEach(s2 => {
        if (s1 === s2 || s1.countdown || s2.countdown) return
        Squid.hitBoth(s1, s2)
      })
    })
    // squids[0].action(wasd)
    const t2 = performance.now()
    squids.forEach(s => s.updateJelly(dt))
    const t3 = performance.now()
    time.prepare = (time.prepare||0) * 0.99 + 0.01 * (t1-t0)
    time.hit = (time.hit||0) * 0.99 + 0.01 * (t2-t1)
    time.update = (time.update||0) * 0.99 + 0.01 * (t3-t2)
    squids.forEach(s => s.calculateJellyXYZ())
    squids.forEach(s => s.updateSpherePosition())
    }
  }
  let cnt = 0
  function animate() {
    const t = ++cnt * 0.01
    const zcos = Math.cos(0.24 * t)
    const zsin = Math.sin(0.24 * t)
    squids.forEach(sq => {
      if (sq.countdown) {
        sq.countdown--
        if (sq.countdown === 0) {
          randomizeSquid(sq, 4)
        }
      }
    })
    if (running) {
      for (let i = 0; i < numCalcs; i++) update(0.05)
      squids.forEach(s => s.updateMorph())
    }
    // camera.up.set(0, 0, 1)
    // camera.position.set(cameraDistance * Math.cos(0.2 * t), cameraDistance * Math.sin(0.2 * t), 4)
    camera.position.set(0, 0, 16)
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
  document.body.onclick = () => {
    if (DeviceMotionEvent.requestPermission)
    DeviceMotionEvent.requestPermission()
    document.body.onClick = null
  }
  window.addEventListener('devicemotion', e => {
    const { x, y, z } = e.accelerationIncludingGravity
    const r = Math.hypot(x, y, z)
    const scale = 0.01 * (r > 10 ? 10 / r : 1)
    window.gx = x * scale
    window.gy = y * scale
    window.gz = z * scale
  })
})