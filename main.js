onload = () => {
  const canvas = document.createElement('canvas')
  const size = 1024
  canvas.width = canvas.height = size
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.scale(size / 4, size / 4)
  ctx.beginPath()
  ctx.curve(ikachanCoords(), true)
  ctx.lineWidth = 0.01
  ctx.translate(0.15,0)
  ctx.stroke()
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
}

window.addEventListener('load', () => {
  const inflated = funcShapeInflate((x, y) => ikachanShapeFunc(x + 1 / 3, y), 1.4, 64)
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
  showMap(inflated.map)
  const triangles = inflatedMapToPolygon(inflated)
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
})
