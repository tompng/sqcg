onload = () => {
  const canvas = document.createElement('canvas')
  const size = 1024
  canvas.width = canvas.height = size
  // document.body.appendChild(canvas)
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
let numCalcs = 4
function start() {
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
    // document.body.appendChild(c)
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
  // document.body.appendChild(c)

  const renderer = new THREE.WebGLRenderer()
  window.renderer = renderer
  document.body.appendChild(renderer.domElement)
  renderer.domElement.style.cssText = `
    position:fixed;
    left:0;
    top:0;
  `
  let camera = null
  let wsize = 3
  let hsize = 3
  resize = () => {
    renderer.setSize(innerWidth, innerHeight)
    if (innerWidth > innerHeight) {
      camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100)
    } else {
      const fov1 = 30
      const fov = 2 * 180 / Math.PI * Math.atan(Math.tan(fov1 * Math.PI / 180 / 2) * innerHeight / innerWidth)
      camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.1, 16)
    }
    const vmin =Math.min(innerWidth, innerHeight)
    wsize = 3 * innerWidth / vmin
    hsize = 3 * innerHeight / vmin
  }
  resize()
  window.addEventListener('resize', resize)
  renderer.setPixelRatio(window.devicePixelRatio)
  const scene = new THREE.Scene()

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
  function addSquid(i) {
    const color = colors.shift()
    colors.push(color)
    const sq = new Squid(ikaSections, numSections, texture, color, { hitSphere: false, mesh: true, wire: false })
    randomizeSquid(sq, 2, i)
    squids.push(sq)
    scene.add(sq.meshGroup)
  }
  function randomizeSquid(sq, z, i = undefined) {
    sq.randomJelly(16 * Math.random())
    if (i === undefined) {
      sq.setPosition({ x: 2 * Math.random() - 1, y: 2 * Math.random() - 1, z })
    } else {
      const th = 2 * Math.PI * i / 3
      sq.setPosition({ x: 2 * Math.cos(th), y: 2 * Math.sin(th), z })
    }
    sq.calculateJellyXYZ()
    sq.updateSpherePosition()
    sq.updateMorph()
  }
  window.squids = squids
  for(let i = 0; i < 3; i++) addSquid(i)
  const planeGeoetry = new THREE.PlaneBufferGeometry(1, 1, 1, 1)
  const planeMaterial = new THREE.MeshPhongMaterial
  const plane = new THREE.Mesh(planeGeoetry, planeMaterial)
  plane.position.set(0, 0, 0)
  plane.scale.set(60, 60, 1)
  plane.receiveShadow = true
  scene.add(plane)
  const walls = []
  for (let i = 0; i < 4; i++) {
    const material = [
      new THREE.MeshBasicMaterial({ color: '#444' }),
      planeMaterial,
      planeMaterial,
      new THREE.MeshBasicMaterial({ color: '#333' })
    ][i]
    const plane = new THREE.Mesh(planeGeoetry, material)
    const th = Math.PI * i / 2
    plane.rotateOnAxis(new THREE.Vector3(Math.cos(th), Math.sin(th), 0), Math.PI / 2)
    plane.position.set(-3 * Math.sin(th), 3 * Math.cos(th), 0)
    if (i % 2 === 0) plane.scale.set(60, 6, 1)
    else plane.scale.set(6, 60, 1)
    plane.receiveShadow = true
    scene.add(plane)
    walls.push(plane)
  }

  const directionalLight = new THREE.DirectionalLight(0xEEEEEE)
  directionalLight.castShadow = true
  renderer.shadowMap.enabled = true
  renderer.shadowMapType = THREE.PCFSoftShadowMap
  directionalLight.shadow.mapSize.width = directionalLight.shadow.mapSize.height = 2048;
  directionalLight.position.set(2,1,3)
  scene.add(directionalLight)
  let target = null
  function pointerPos(e) {
    const dom = renderer.domElement
    const sx = (2 * (e.pageX - dom.offsetLeft) / dom.offsetWidth - 1) * wsize
    const sy = (1 - 2 * (e.pageY - dom.offsetTop) / dom.offsetHeight) * hsize
    const cz = camera.position.z
    const v = { x: sx, y: sy, z: -cz }//-1 / Math.tan(Math.PI / 180 * camera.fov / 2) }
    return { cz, v }
  }
  function calcDestination(cz, v) {
    const z = 1.5
    const t = (z - cz) / v.z
    return { x: v.x * t, y: v.y * t, z: cz + v.z * t }
  }
  function down(e) {
    const { cz, v } = pointerPos(e)
    const vv = v.x ** 2 + v.y ** 2 + v.z ** 2
    let hit = { tmin: Infinity, sphere: null }
    squids.forEach(sq => {
      sq.spheres.forEach((sphere) => {
        const { x, y, z, r } = sphere
        const vs = -v.x * x - v.y * y + v.z * (cz - z)
        const ss = x ** 2 + y ** 2 + (cz - z) ** 2
        const t = -vs / vv
        const dist2 = vv * t * t + 2 * vs * t + ss
        if (dist2 < r ** 2 && t < hit.tmin) {
          hit.tmin = t
          hit.squid = sq
          hit.sphere = sphere
        }
      })
    })
    if (hit.sphere) {
      target = {
        squid: hit.squid,
        sphere: hit.sphere,
        destination: calcDestination(cz, v)
      }
    }
  }
  function move(e) {
    const { cz, v } = pointerPos(e)
    if (target) target.destination = calcDestination(cz, v)
  }
  function up(e) {
    target = null
  }
  document.addEventListener('mousedown', e => {
    e.preventDefault()
    down(e)
  })
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
  window.addEventListener('touchstart', e => {
    e.preventDefault()
    down(e.touches[0])
  }, { passive: false })
  window.addEventListener('touchmove', e => move(e.touches[0]))
  window.addEventListener('touchend', up)

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
    squids.forEach(s => s.resetSphereForce())
    squids.forEach(s => !s.countdown && s.hitFloor(wsize, hsize))
    if (target) {
      const dx = target.destination.x - target.sphere.x
      const dy = target.destination.y - target.sphere.y
      const dz = target.destination.z - target.sphere.z
      const r = Math.hypot(dx, dy, dz)
      target.sphere.fx += dx / 2
      target.sphere.fy += dy / 2
      target.sphere.fz += dz / 2
      target.squid.spheres.forEach(s => {
        s.fx += dx / target.squid.spheres.length * 4
        s.fy += dy / target.squid.spheres.length * 4
        s.fz += dz / target.squid.spheres.length * 4
      })
    }
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
  let cnt = 0
  function animate() {
    walls[1].position.x = -wsize
    walls[3].position.x = wsize
    walls[0].position.y = hsize
    walls[2].position.y = -hsize
    const t = ++cnt * 0.01
    const zcos = Math.cos(0.24 * t)
    const zsin = Math.sin(0.24 * t)
    squids.forEach(sq => {
      if (sq.countdown) {
        sq.countdown--
        if (sq.countdown === 0) {
          randomizeSquid(sq, 2)
        }
      }
    })
    if (running) {
      for (let i = 0; i < numCalcs; i++) update(0.05)
      squids.forEach(s => s.updateMorph())
    }
    // camera.up.set(0, 0, 1)
    // camera.position.set(cameraDistance * Math.cos(0.2 * t), cameraDistance * Math.sin(0.2 * t), 4)
    camera.position.set(0, 0, 13)
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
  document.body.onclick = () => {
    if (DeviceMotionEvent.requestPermission)
    DeviceMotionEvent.requestPermission()
    document.body.onclick = null
  }
  window.addEventListener('devicemotion', e => {
    const { x, y, z } = e.accelerationIncludingGravity
    const r = Math.hypot(x, y, z)
    const scale = 0.01 * (r > 10 ? 10 / r : 1)
    window.gx = x * scale
    window.gy = y * scale
    window.gz = z * scale
  })
}
window.addEventListener('load', start)
