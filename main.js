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
