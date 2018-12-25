CanvasRenderingContext2D.prototype.curveLine = function(points, wa, wb) {
  const v = points.map((p, i) => {
    const pb = points[i + 1] || p
    const pa = points[i - 1] || p
    const dx = pb.x - pa.x
    const dy = pb.y - pa.y
    const dr = Math.sqrt(dx ** 2 + dy ** 2)
    return { x: dx / dr, y: dy / dr }
  })
  function genCoords(dir) {
    return points.map((p, i) => {
      const w = wa + (wb - wa) * i / (points.length - 1)
      return {
        x: p.x + v[i].y * dir * w / 2,
        y: p.y - v[i].x * dir * w / 2
      }
    })
  }
  const coords1 = genCoords(1)
  const coords2 = genCoords(-1).reverse()
  ctx.curve(coords1)
  ctx.lineTo(coords2[0].x, coords2[0].y)
  ctx.curve(coords2, false, false)
  ctx.lineTo(coords1[0].x, coords1[0].y)
}
const squidCoords = ikachanCoords()
onload = () => {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.left = 0
  canvas.style.top = 0
  document.body.overflow = 'hidden'
  canvas.width = canvas.height = 512
  canvas.style.width = canvas.style.height
  window.onresize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  window.onresize()
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  let cameraZ = 0
  let cameraX = 0
  let clicks = []
  function addSquid(x, y, c = undefined, offset = 0) {
    const rnd = Math.random()
    const t = performance.now() / 1000 + offset
    clicks.push({ x, y, rnd, t, c })
  }
  let initializedTime = null
  function addMessage() {
    initializedTime = performance.now() / 1000
    const msg1 = 'Merry'
    const msg2 = 'Christmas!'
    function addText(msg, y, offset) {
      for (let i = 0; i < msg.length; i++) {
        addSquid(
          0.5 * (2 * (i + 0.5) / msg.length - 1),
          y - 0.1 + 0.2 * Math.random(),
          msg[i],
          offset + i * 0.1
        )
      }
    }
    addText('Merry', -0.4, 0)
    addText('Christmas', 0, 0.25)
  }
  canvas.onmousemove = canvas.ontouchmove = e => {
    const t = e.touches ? e.touches[0] : e
    const x = 2 * t.pageX / window.innerWidth - 1
    const y = 2 * t.pageY / window.innerHeight - 1
    cameraZ = y
    cameraX = x
    if (!initializedTime || performance.now() / 1000 < initializedTime + 1) return false
    if (Math.random() < 0.1) addSquid(x, y)
    return false
  }
  canvas.onclick = () => false
  canvas.onmousedown = canvas.ontouchstart = e => {
    if (initializedTime && performance.now() / 1000 < initializedTime + 2) return false
    addMessage()
    return false
  }
  function render() {
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.translate(canvas.width / 2, canvas.height / 1.7)
    const maxsize = Math.max(canvas.width, canvas.height)
    const minsize = Math.min(canvas.width, canvas.height)
    ctx.scale(minsize / 2.2, minsize / 2.2)
    renderChristmasTree(ctx, { cameraX, cameraZ })
    ctx.restore()
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)

    ctx.scale(maxsize / 2, maxsize / 2)
    const time = performance.now() / 1000
    for (let i = 0; i < 100; i++) {
      ctx.save()
      const x = Math.sin(i * 10000) % 1
      const y = Math.sin(i * 12345) % 1
      const rot = Math.sin(i * 23456) % 1
      const spd = 0.4 + 0.1 * (Math.sin(i * 34567) % 1)
      const fr1 = (Math.sin(i * 45678) % 1)
      const fr2 = (Math.sin(i * 45678) % 1)
      ctx.translate(x + 0.1 * Math.sin(fr1 * time) + 0.1 * Math.sin(fr2 * time), (y + spd * time) % 2.1 - 1 )
      ctx.scale(0.02, 0.02)
      ctx.globalAlpha = 0.3
      ctx.rotate(3 * rot * time)
      ikarenderer.render(ctx)
      ctx.restore()
    }

    clicks = clicks.filter(p => {
      p.t += 0.002
      const t = (time - p.t) / 2
      if (t > 1) return false
      if (t < 0) return true
      ctx.save()
      const x = p.x + (t - 0.5) * (p.rnd - 0.5)
      const y = p.y + 4 * (t - 0.5) ** 2
      const dx = (p.rnd - 0.5)
      const dy = 4 * 2 * (t - 0.5)
      ctx.translate(x, y)
      ctx.scale(0.1, 0.1)
      ctx.globalAlpha = 4 * t * (1 - t)
      const colors = ['#faa', '#afa', '#aaf', '#ffa', '#aff', '#faf']
      const color = colors[Math.floor(colors.length * p.rnd)]
      ctx.save()
      ctx.rotate(Math.atan2(dy, dx))
      renderSquid(ctx, { t: 8 * t, color })
      ctx.restore()
      if (p.c) {
        ctx.fillStyle = 'white'
        ctx.font = '2px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.c, 0, 0)
      }
      ctx.restore()
      return true
    })
    ctx.restore()
    const animate = window.requestAnimationFrame || window.webkitRequestAnimationFrame || (f => setTimeout(f, 16))
    animate(render)
  }
  render()
}
function renderSquid(ctx, option = {}) {
  ctx.save()
  ctx.beginPath()
  if (option.t === undefined) {
    ctx.curve(squidCoords, true)
  } else {
    const t = 8 * (option.t || 0)
    const a = (Math.sin(t - Math.sin(t) / 4) + 1) / 2
    ctx.curve(squidCoords.map(p => {
      return {
        x: p.x + a * (Math.log(Math.exp(- 4 * p.x - 3) + 1)) / 12,
        y: p.y
      }
    }), true)
  }
  if (option.border) {
    ctx.strokeStyle = typeof option.border === 'string' ? option.border : 'black'
    ctx.lineWidth = 0.1
    ctx.stroke()
  }
  ctx.fillStyle = option.color || 'silver'
  ctx.fill()
  if (option.noEyes !== true) sqDrawEyes(ctx)
  ctx.restore()
}
class SquidRenderer {
  constructor(option = {}) {
    const canvas = document.createElement('canvas')
    const size = option.size || 64
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.translate(size / 2.5, size / 2)
    ctx.scale(size / 2.8, size / 2.8)
    ctx.beginPath()
    renderSquid(ctx, option)
    this.canvas = canvas
  }
  render(ctx) {
    ctx.drawImage(this.canvas, -1, -1, 2, 2)
  }
}

function renderStar(ctx) {
  const coords = []
  const points = []
  for (let i = 0; i < 5; i++) {
    const th = 2 * Math.PI * i / 5 - Math.PI / 2
    const p = { x: Math.cos(th), y: Math.sin(th) }
    coords.push(p)
    points.push(p)
  }
  const curves = []
  for (let i = 0; i < 5; i++) {
    const p1 = coords[i]
    const p2 = coords[(i + 2) % 5]
    const curve = []
    curves.push(curve)
    for (let j = 0; j <= 4; j++) {
      const t = j / 4
      const p3 = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t }
      const p = t === 0 ? p1 : t === 1 ? p2 : p3
      if (p === p3) points.push(p3)
      curve.push(p)
    }
  }
  points.forEach(p => {
    p.x += 0.1 * (2 * Math.random() - 1)
    p.y += 0.1 * (2 * Math.random() - 1)
  })
  ctx.beginPath()
  curves.forEach((c, i) => {
    console.error(c)
    ctx.curve(c, false)
  })
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.1
  ctx.strokeStyle = 'red'
  ctx.stroke()
}
const ikarenderer = new SquidRenderer({ noEyes: true, color: 'white' })
function renderChristmasTree(ctx, option = {}) {
  let a = Math.sqrt(123456789)
  const time = performance.now() / 1000
  const rotate = time / 8 + (option.cameraX || 0)
  function rand() {
    a = (a + (123 + 456 * a * a ) / (789 + a)) % 1000
    return a % 1
  }
  function drawGround({ z = 0, color = 'white', alpha = 1, zfixed = false }) {
    const coords = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      coords.push({ x: -2 + 4 * t, y: z + 0.2 * (2 * rand() - 1) })
    }
    if (zfixed) {
      const delta = z - coords[3].y
      coords.forEach(p => p.y += delta)
    }
    ctx.save()
    ctx.beginPath()
    ctx.curve(coords)
    ctx.lineTo(2, 2)
    ctx.lineTo(-2, 2)
    ctx.closePath()
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }
  ctx.save()
  let x0 = 0
  let y0 = 0
  let z0 = 0.9
  const trunk = []
  const N = 32
  const leafs = []
  const gcz = 0.1 * (-1 - (option.cameraZ || 0))
  drawGround({ z: 0.1 + 6 * gcz, color: '#111' })
  drawGround({ z: 0.2 + 5 * gcz, color: '#222' })
  drawGround({ z: 0.3 + 4 * gcz, color: '#333' })
  drawGround({ z: 0.4 + 3 * gcz, color: '#444' })
  drawGround({ z: 0.5 + 2 * gcz, color: '#555' })
  drawGround({ z: 0.6 + 1 * gcz, color: '#666' })
  ctx.fillStyle = 'silver'
  ctx.strokeStyle = 'silver'
  function transFunc(th) {
    const a = ((option.cameraZ || 0) + 1) / 2
    const b = Math.sqrt(1 - a * a / 4)
    const cos = Math.cos(th)
    const sin = Math.sin(th)
    return ({ x, y, z }) => {
      return {
        x: x * cos + y * sin,
        y: 1 + b * (z - 1) + (y * cos - x * sin) * a / 2
      }
    }
  }
  const trans = transFunc(rotate)
  let th = 2 * Math.PI * rand()
  for (let i = 0; i < N; i++) {
    const t = i / N
    x0 += 0.01 * (2 * rand() - 1)
    y0 += 0.01 * (2 * rand() - 1)
    z0 -= 1.8 / N
    const r = (1 - t) * (0.8 + 0.4 * rand())
    th += (1 + Math.sqrt(5) + (2 * rand() - 1) / 8) * Math.PI

    let x = x0, y = y0, z = z0
    trunk.push({ x, y, z })
    if (t < 0.2) continue
    const branch = [{ x, y, z }]
    for (let j = 0; j < 5; j++) {
      const th2 = th + 0.2 * (2 * rand() - 1)
      const x2 = x + r * Math.cos(th2) / 5
      const y2 = y + r * Math.sin(th2) / 5
      const z2 = z + r * 0.1 * (2 * rand() - 1)
      const count = 0.5 + 4 * (1 - t) * j + rand()
      for (let k = 0; k < count; k++) {
        leafs.push([{ x, y, z }, { x: x2, y: y2, z: z2 }])
      }
      x = x2
      y = y2
      z = z2
      branch.push({ x, y, z })
    }

    ctx.beginPath()
    ctx.curveLine(branch.map(trans), 0.02 * (z0 + 1), 0)
    ctx.lineWidth = 0.001
    ctx.stroke()
    ctx.fill()
  }
  ctx.beginPath()
  ctx.curveLine(trunk.map(trans), 0.08, 0)
  ctx.fill()
  drawGround({ z: 0.8, color: '#777', zfixed: true })
  leafs.forEach(pq => {
    const [q1, q2] = pq
    const qt = rand()
    const p = {
      x: q1.x + (q2.x - q1.x) * qt,
      y: q1.y + (q2.y - q1.y) * qt,
      z: q1.z + (q2.z - q1.z) * qt
    }
    ctx.save()
    const th = 2 * Math.PI * rand()
    const r = 0.3 * rand() * (1 + p.y) / 2 + 0.03
    const pos = trans({ x: p.x + r * (2 * rand() - 1), y: p.y + r * (2 * rand() - 1), z: p.z + r * (2 * rand() - 1) / 4 })
    ctx.translate(pos.x, pos.y)
    ctx.rotate(rand() * 16)
    ctx.scale(0.05, 0.05)
    ctx.globalAlpha = 0.5
    ikarenderer.render(ctx)
    ctx.restore()
  })
  const top = trans(trunk[trunk.length - 1])
  ctx.strokeStyle = 'white'
  for (let i = 0; i < 5; i++) {
    const rotth = 2 * Math.PI * i / 5 + rotate
    const rotc = Math.cos(rotth)
    const rots = Math.sin(rotth)
    const points = []
    for (let j = 0; j < 12; j++) {
      const th = 2 * Math.PI * j / 12
      const x = 0.1 * Math.cos(th)
      const z = 0.1 * Math.sin(th)
      points.push({ x: rotc * x, y: z + rots * x / 4 })
    }
    const coords = []
    for (let j = 0, k = 0; j < 12; j++) coords[j] = points[(k += 5) % 12]
    const offset = -0.2
    ctx.save()
    ctx.beginPath()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 0.01
    ctx.globalAlpha = 0.5
    ctx.line(coords.map(p => ({ x: p.x + top.x, y: p.y + offset + top.y })))
    ctx.stroke()
    ctx.lineWidth = 0.06
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    points.forEach((p, i) => {
      p.x += 0.01 * Math.sin((8 + 4 * Math.sin(i * 123 + i * i) / 2) * time + i)
      p.y += 0.01 * Math.sin((8 + 4 * Math.sin(i * 456 + i * i) / 2) * time + 2 * i)
    })
    const a = 1.5
    ctx.curve(points.map(p => ({ x: p.x * a + top.x, y: p.y * a + offset + top.y })), true)
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}
