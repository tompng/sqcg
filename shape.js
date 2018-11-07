CanvasRenderingContext2D.prototype.line = function(points, closed, noMove) {
  if (!noMove) this.moveTo(points[0].x, points[0].y)
  const len = closed ? points.length : points.length - 1
  for (let i  = 0; i < len; i++) {
    const s = 1 / 3
    const j = (i + 1) % points.length
    this.lineTo(points[j].x, points[j].y)
  }
}
CanvasRenderingContext2D.prototype.curve = function(points, closed, noMove) {
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
  if (!noMove) this.moveTo(xs[0].v, ys[0].v)
  const len = closed ? points.length : points.length - 1
  for (let i  = 0; i < len; i++) {
    const s = 1 / 3
    const j = (i + 1) % points.length
    this.bezierCurveTo(
      xs[i].v + s * xs[i].d, ys[i].v + s * ys[i].d,
      xs[j].v - s * xs[j].d, ys[j].v - s * ys[j].d,
      xs[j].v, ys[j].v
    )
  }
}
function ikachanCoords2(){
  const ikaCoords = [
    {x:0,y:0},
    {x:-47,y:30},
    {x:-112,y:103},
    {x:-135,y:165},
    {x:-94,y:181},
    {x:-80,y:191},
    {x:-73,y:226},
    {x:-78,y:259},
    {x:-61,y:286},
    {x:-42,y:266},
    {x:-37,y:252},
    {x:-35,y:272},
    {x:-20,y:290},
    {x:-5,y:276},
    {x:0,y:258},
  ]
  ;[...ikaCoords].reverse().forEach(c => {
    ikaCoords.push({ x: -c.x, y: c.y })
  })
  ikaCoords.pop()
  ikaCoords.forEach(c => {
    c.x /= 100
    c.y = (c.y - 140) / 100
  })
  return ikaCoords
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
    const r = bs(r => ikachanShapeFunc(1 + r * c, r * s) < 0)
    return { x: 1 + r * c, y: r * s}
  }
  const num = n * 0x100
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
