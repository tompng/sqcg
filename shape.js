CanvasRenderingContext2D.prototype.line = function(points, closed, noMove) {
  if (!noMove) this.moveTo(points[0].x, points[0].y)
  const len = closed ? points.length : points.length - 1
  for (let i  = 0; i < len; i++) {
    const s = 1 / 3
    const j = (i + 1) % points.length
    this.lineTo(points[j].x, points[j].y)
  }
}
function coordsToBezierParams(points, closed) {
  const dfunc = array => {
    const out = array.map(v => { return { v, d: 0 } })
    for (let n = 0; n < 4; n++) {
      out.forEach((p, i) => {
        let ia = i - 1
        let ib = i + 1
        if (ia === -1) ia = closed ? array.length - 1 : i
        if (ib === array.length) ib = closed ? 0 : i
        const k = ia === i || ib === i ? 2 : 4
        out[i].d = (3 * (out[ib].v - out[ia].v) - out[ia].d - out[ib].d) / k
      })
    }
    return out
  }
  const xs = dfunc(points.map(p => p.x))
  const ys = dfunc(points.map(p => p.y))
  const out = []
  const len = closed ? points.length : points.length - 1
  for (let i  = 0; i < len; i++) {
    const s = 1 / 3
    const j = (i + 1) % points.length
    out.push([
      xs[i].v, ys[i].v,
      xs[i].v + s * xs[i].d, ys[i].v + s * ys[i].d,
      xs[j].v - s * xs[j].d, ys[j].v - s * ys[j].d,
      xs[j].v, ys[j].v
    ])
  }
  return out
}
CanvasRenderingContext2D.prototype.curve = function(points, closed, noMove) {
  const beziers = coordsToBezierParams(points, closed)
  beziers.forEach((b, i) => {
    const [ax, ay, bx, by, cx, cy, dx, dy] = b
    if (!noMove && i === 0) this.moveTo(ax, ay)
    this.bezierCurveTo(bx, by, cx, cy, dx, dy)
  })
}

function ikachanShapeFunc(x, y) {
  const f = 5/2+Math.pow(6/5-Math.cos(15*y), 1/4)
  const g = 5+Math.pow(5*y*(1+x/3)/3,16)
  const h = 1+Math.exp(4*x)
  const a = 6-3*y-3*x
  const b = 6+3*y-3*x
  return Math.exp(-a)+Math.exp(-b)+Math.exp(-x-1/2-6*f/g/h/5)-2/3
}
function ikachanCoords(n = 64) {
  return funcToCoords(ikachanShapeFunc, n, 0)
}
function replotCoords(coords, delta) {
  const params = coordsToBezierParams(coords, true)
  const step = 10
  const points = [{ x: params[0][0], y: params[0][1] }]
  for (const bez of params) {
    const [ax, ay, bx, by, cx, cy, dx, dy] = bez
    for (let j = 1; j <= step; j++) {
      const t = j / step
      const a = (1 - t) ** 3
      const b = 3 * t * (1 - t) ** 2
      const c = 3 * t ** 2 * (1 - t)
      const d = t ** 3
      points.push({
        x: a * ax + b * bx + c * cx + d * dx,
        y: a * ay + b * by + c * cy + d * dy
      })
    }
  }
  // points.splice(points.length / 2)
  const eachLen = f => {
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i], q = points[i + 1]
      const l = Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
      f(q, l)
    }
  }
  let length = 0
  eachLen((p, l) => length += l)
  const output = [points[0]]
  const n = Math.round(length / delta)
  let lastLen = 0
  eachLen((p, l) => {
    const i = Math.floor(lastLen / length * n)
    lastLen += l
    if (Math.floor(lastLen / length * n) > i) {
      output.push(p)
    }
  })
  // for (let i = output.length - 2; i > 0; i--) {
  //   const p = output[i]
  //   output.push({ x: p.x, y: -p.y })
  // }
  return output
}
function funcToCoords(f, n, z, m =  0x100) {
  const bs = f => {
    let a = 0, b = 4
    for (let i = 0; i < 32; i++) {
      const c = (a + b) / 2
      f(c) ? a = c : b = c
    }
    return (a + b) / 2
  }
  const at = t => {
    const c = Math.cos(t)
    const s = Math.sin(t)
    const r = bs(r => f(1 + r * c, r * s) < z)
    return { x: 1 + r * c, y: r * s}
  }
  const num = n * m
  const a = 0
  const points = []
  for (let i = 0; i <= num; i++) {
    points[i] = at(Math.PI * i / num)
  }
  const eachLen = f => {
    for (let i = 0; i < num; i++) {
      const p = points[i], q = points[i+1]
      const l = Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
      f(q, l)
    }
  }
  points[0].y = 0
  points[num].y = 0
  let length = 0
  eachLen((p, l) => { length += l })
  const output = [points[0]]
  let lastLen = 0
  eachLen((p, l) => {
    const i = Math.floor(lastLen / length * n)
    lastLen += l
    if (Math.floor(lastLen / length * n) > i) {
      output.push(p)
    }
  })
  for (let i = output.length - 2; i > 0; i--) {
    const p = output[i]
    output.push({ x: p.x, y: -p.y })
  }
  return output
}

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
