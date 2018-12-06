const ikaShape = coordsShrink3D()
const numSections = 5
const wireCubeGeometry = createWireCubeGeometry()
const ikaSections = createIkaSections(numSections)
function createIkaSections(step) {
  const sections = []
  for (let i = 0; i < step; i++) {
    for (let j = 0; j < step; j++) {
      const xmin = (2 * i / step - 1) * 1.3 + 0.3
      const ymin = (2 * j / step - 1) * 1.3
      const size = 1.3 * 2 / step
      const triangles = trimTriangles(ikaShape.triangles, xmin, ymin, size)
      const spheres = ikaShape.spheres.filter(s => {
        return xmin <= s.x && s.x < xmin + size && ymin <= s.y && s.y < ymin + size
      }).map(s => {
        return { x: (s.x - xmin) / size, y: (s.y - ymin) / size, z: s.z, r: s.r }
      })
      if (!triangles.length) continue
      const sec = { triangles, xmin, ymin, size, i, j, spheres }
      sec.geometry = geometryFromIkaSection(sec)
      sections.push(sec)
    }
  }
  return sections
}

function createWireCubeGeometry(n = 16, s = 0.02) {
  const vertices = []
  const normals = []
  const tan1 = []
  const tan2 = []
  const uvs = []
  const indices = []
  pipe(0, 0, 0, 1, s, s)
  pipe(0, 0, 0, s, 1, s)
  pipe(0, 0, 0, s, s, 1)
  pipe(1 - s, 0, 0, s, s, 1)
  pipe(1 - s, 0, 0, s, 1, s)
  pipe(0, 1 - s, 0, 1, s, s)
  pipe(0, 1 - s, 0, s, s, 1)
  pipe(0, 0, 1 - s, s, 1, s)
  pipe(0, 0, 1 - s, 1, s, s)
  pipe(0, 1 - s, 1 - s, 1, s, s)
  pipe(1 - s, 0, 1 - s, s, 1, s)
  pipe(1 - s, 1 - s, 0, s, s, 1)
  function pipe(x, y, z, sx, sy, sz) {
    const smax = Math.max(sx, sy, sz)
    const offset = 0.05
    const coord000 = { x, y, z }
    const coord111 = { x: x + sx, y: y + sy, z: z + sz }
    const faces = [
      { ...coord000, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } },
      { ...coord000, u: { x: 0, y: 1, z: 0 }, v: { x: 0, y: 0, z: 1 } },
      { ...coord000, u: { x: 0, y: 0, z: 1 }, v: { x: 1, y: 0, z: 0 } },
      { ...coord111, u: { x: 0, y: -1, z: 0 }, v: { x: -1, y: 0, z: 0 } },
      { ...coord111, u: { x: 0, y: 0, z: -1 }, v: { x: 0, y: -1, z: 0 } },
      { ...coord111, u: { x: -1, y: 0, z: 0 }, v: { x: 0, y: 0, z: -1 } },
    ]
    for (const face of faces) {
      const normal = {
        x: face.u.y * face.v.z - face.u.z * face.v.y,
        y: face.u.z * face.v.x - face.u.x * face.v.z,
        z: face.u.x * face.v.y - face.u.y * face.v.x
      }
      const point = (s, t) => {
        const x = face.x + sx * (face.u.x * s + face.v.x * t)
        const y = face.y + sy * (face.u.y * s + face.v.y * t)
        const z = face.z + sz * (face.u.z * s + face.v.z * t)
        return { s, t, x, y, z }
      }
      const ni = smax === Math.abs(face.u.x * sx + face.u.y * sy + face.u.z * sz) ? n : 1
      const nj = smax === Math.abs(face.v.x * sx + face.v.y * sy + face.v.z * sz) ? n : 1
      const idcmap = {}
      for (let i = 0; i < ni; i++) {
        for (let j = 0; j < nj; j++) {
          const s0 = i / ni
          const s1 = (i + 1) / ni
          const t0 = j / nj
          const t1 = (j + 1) / nj
          const p00 = point(s0, t0)
          const p01 = point(s0, t1)
          const p10 = point(s1, t0)
          const p11 = point(s1, t1)
          for (let p of [p00, p01, p11, p00, p11, p10]) {
            const key = [p.s, p.t]
            if (idcmap[key] !== undefined) {
              indices.push(idcmap[key])
              continue
            }
            const index = idcmap[key] = vertices.length / 3
            indices.push(index)
            normals.push(normal.x, normal.y, normal.z)
            tan1.push(face.u.x, face.u.y, face.u.z)
            tan2.push(face.v.x, face.v.y, face.v.z)
            vertices.push(p.x, p.y, p.z)
            uvs.push(0, 0)
          }
        }
      }
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


const sphereGeometry = new THREE.SphereBufferGeometry(1, 32)
class Squid {
  constructor(sections, step, texture, option) {
    this.xysize = sections[0].size
    this.zsize = 1
    this.step = step
    this.texture = texture
    this.initializeMesh(sections, option || {})
    this.initializeJelly()
    this.rotateJelly(0)
    this.calculateJellyXYZ()
    this.updateMorph()
  }
  initializeMesh(sections, { hitSphereEnabled = true, wireEnabled = true }) {
    this.meshGroup = new THREE.Group()
    this.spheres = []
    this.sections = sections.map(section => {
      const material = ikaShader({ map: { value: this.texture } })
      const mesh = new THREE.Mesh(section.geometry, material)
      const wireMesh = new THREE.Mesh(wireCubeGeometry, material)
      const spheres = section.spheres.map(s => {
        let mesh
        if (hitSphereEnabled) {
          mesh = new THREE.Mesh(sphereGeometry)
          mesh.scale.set(s.r, s.r, s.r)
          this.meshGroup.add(mesh)
        }
        const s2 = { i: section.i, j: section.j, base: { x: s.x, y: s.y, z: s.z }, r: s.r, mesh }
        this.spheres.push(s2)
        return s2
      })
      this.meshGroup.add(mesh)
      if (wireEnabled) this.meshGroup.add(wireMesh)
      return { ...section, material, spheres }
    })
  }
  transform(sec, p) {
    const a1x = p.x * p.x * (3 - 2 * p.x)
    const a1y = p.y * p.y * (3 - 2 * p.y)
    const a1z = p.z * p.z * (3 - 2 * p.z)
    const a0x = 1 - a1x
    const a0y = 1 - a1y
    const a0z = 1 - a1z
    const b0x = p.x * (1 - p.x) * (1 - p.x)
    const b0y = p.y * (1 - p.y) * (1 - p.y)
    const b0z = p.z * (1 - p.z) * (1 - p.z)
    const b1x = p.x * p.x * (p.x - 1)
    const b1y = p.y * p.y * (p.y - 1)
    const b1z = p.z * p.z * (p.z - 1)
    const out = { x: 0, y: 0, z: 0 }
    let x = 0
    let y = 0
    let z = 0
    for (let ijk = 0; ijk < 8; ijk++) {
      const i = ijk & 1
      const j = (ijk >> 1) & 1
      const k = (ijk >> 2) & 1
      const v = this.jelly[sec.i + i][sec.j + j][k]
      x += (
        v.x * (i === 0 ? a0x : a1x) * (j === 0 ? a0y : a1y) * (k === 0 ? a0z : a1z)
        + v.xx * (i === 0 ? b0x : b1x) * (j === 0 ? a0y : a1y) * (k === 0 ? a0z : a1z)
        + v.xy * (i === 0 ? a0x : a1x) * (j === 0 ? b0y : b1y) * (k === 0 ? a0z : a1z)
        + v.xz * (i === 0 ? a0x : a1x) * (j === 0 ? a0y : a1y) * (k === 0 ? b0z : b1z)
      )
      y += (
        v.y * (i === 0 ? a0x : a1x) * (j === 0 ? a0y : a1y) * (k === 0 ? a0z : a1z)
        + v.yx * (i === 0 ? b0x : b1x) * (j === 0 ? a0y : a1y) * (k === 0 ? a0z : a1z)
        + v.yy * (i === 0 ? a0x : a1x) * (j === 0 ? b0y : b1y) * (k === 0 ? a0z : a1z)
        + v.yz * (i === 0 ? a0x : a1x) * (j === 0 ? a0y : a1y) * (k === 0 ? b0z : b1z)
      )
      z += (
        v.z * (i === 0 ? a0x : a1x) * (j === 0 ? a0y : a1y) * (k === 0 ? a0z : a1z)
        + v.zx * (i === 0 ? b0x : b1x) * (j === 0 ? a0y : a1y) * (k === 0 ? a0z : a1z)
        + v.zy * (i === 0 ? a0x : a1x) * (j === 0 ? b0y : b1y) * (k === 0 ? a0z : a1z)
        + v.zz * (i === 0 ? a0x : a1x) * (j === 0 ? a0y : a1y) * (k === 0 ? b0z : b1z)
      )
    }
    return { x, y, z }
  }
  eachBin3D(f) {
    for (let i = 0; i < 8; i++) f((i >> 2) & 1, (i >> 1) & 1, i & 1)
  }
  updateMorph() {
    for (const sec of this.sections) {
      const i = sec.i
      const j = sec.j
      const uniforms = {}
      for (const sphere of sec.spheres) {
        const p = this.transform(sec, sphere.base)
        sphere.x = p.x
        sphere.y = p.y
        sphere.z = p.z
        if (sphere.mesh) sphere.mesh.position.set(p.x, p.y, p.z)
      }
      this.eachBin3D((x,y,z) => {
        const v = this.jelly[i + x][j + y][z]
        sec.material.uniforms['v' + x + y + z] = { value: new THREE.Vector3(v.x, v.y, v.z) }
        sec.material.uniforms['vx' + x + y + z] = { value: new THREE.Vector3(v.xx, v.yx, v.zx) }
        sec.material.uniforms['vy' + x + y + z] = { value: new THREE.Vector3(v.xy, v.yy, v.zy) }
        sec.material.uniforms['vz' + x + y + z] = { value: new THREE.Vector3(v.xz, v.yz, v.zz) }
      })
    }
  }
  eachCoord(f) {
    for (let i = 0; i <= this.step; i++) {
      for (let j = 0; j <= this.step; j++) {
        for (let k = 0; k < 2; k++) {
          f(i, j, k)
        }
      }
    }
  }
  updateJelly() {
    this.eachCoord((i, j, k) => {
      const p = this.jelly[i][j][k]
      p.fx = p.fy = p.fz = 0
    })
    this.eachCoord((ia,ja,ka) => {
      this.eachCoord((ib,jb,kb) => {
        const pa = this.jelly[ia][ja][ka]
        const pb = this.jelly[ib][jb][kb]
        if (pa === pb) return
        const l0 = Math.sqrt((this.xysize*(ia-ib))**2 + (this.xysize*(ja-jb))**2 + (this.zsize*(ka-kb))**2)
        const dx = pb.x - pa.x
        const dy = pb.y - pa.y
        const dz = pb.z - pa.z
        const l = Math.sqrt(dx**2 + dy**2 + dz**2)
        const dotv = (pb.vx - pa.vx) * dx + (pb.vy - pa.vy) * dy + (pb.vz - pa.vz) * dz
        const fx = ((l - l0) * dx / l + dotv * dx / l) / l0 / numSections / numSections
        const fy = ((l - l0) * dy / l + dotv * dy / l) / l0 / numSections / numSections
        const fz = ((l - l0) * dz / l + dotv * dz / l) / l0 / numSections / numSections
        pa.fx += fx
        pa.fy += fy
        pa.fz += fz
        pb.fx -= fx
        pb.fy -= fy
        pb.fz -= fz
      })
    })

    const dt = 0.1
    this.eachCoord((i, j, k) => {
      const p = this.jelly[i][j][k]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      p.vx += p.fx * dt
      p.vy += p.fy * dt
      p.vz += p.fz * dt - 0.05 * dt
      // if (p.z < 0) {
      //   p.z = 0
      //   if (p.vz < 0) p.vz = -0.5 * p.vz
      //   p.vx *= 0.9
      //   p.vy *= 0.9
      // }
    })
    let count = 0
    const rectSize = 1.5
    this.spheres.forEach(s => {
      if (s.z < s.r && Math.abs(s.x) < rectSize && Math.abs(s.y) < rectSize) count ++
    })
    this.spheres.forEach(s => {
      if (!(s.z < s.r && Math.abs(s.x) < rectSize && Math.abs(s.y) < rectSize)) return
      const j000 = this.jelly[s.i][s.j][0]
      const j001 = this.jelly[s.i][s.j][1]
      const j010 = this.jelly[s.i][s.j + 1][0]
      const j011 = this.jelly[s.i][s.j + 1][1]
      const j100 = this.jelly[s.i + 1][s.j][0]
      const j101 = this.jelly[s.i + 1][s.j][1]
      const j110 = this.jelly[s.i + 1][s.j + 1][0]
      const j111 = this.jelly[s.i + 1][s.j + 1][1]
      const bx = s.base.x
      const by = s.base.y
      const bz = s.base.z
      const vx = j000.vx * (1 - bx) * (1 - by) * (1 - bz)
               + j001.vx * (1 - bx) * (1 - by) * bz
               + j010.vx * (1 - bx) * by * (1 - bz)
               + j011.vx * (1 - bx) * by * bz
               + j100.vx * bx * (1 - by) * (1 - bz)
               + j101.vx * bx * (1 - by) * bz
               + j110.vx * bx * by * (1 - bz)
               + j111.vx * bx * by * bz
      const vy = j000.vy * (1 - bx) * (1 - by) * (1 - bz)
               + j001.vy * (1 - bx) * (1 - by) * bz
               + j010.vy * (1 - bx) * by * (1 - bz)
               + j011.vy * (1 - bx) * by * bz
               + j100.vy * bx * (1 - by) * (1 - bz)
               + j101.vy * bx * (1 - by) * bz
               + j110.vy * bx * by * (1 - bz)
               + j111.vy * bx * by * bz
      const vz = j000.vz * (1 - bx) * (1 - by) * (1 - bz)
               + j001.vz * (1 - bx) * (1 - by) * bz
               + j010.vz * (1 - bx) * by * (1 - bz)
               + j011.vz * (1 - bx) * by * bz
               + j100.vz * bx * (1 - by) * (1 - bz)
               + j101.vz * bx * (1 - by) * bz
               + j110.vz * bx * by * (1 - bz)
               + j111.vz * bx * by * bz
      const fz = (- 64 * (s.z - s.r) + (vz < 0? -16 * vz / dt : 0)) / count
      const fx = -16 * vx / count
      const fy = -16 * vy / count
      j000.vx += fx * dt * (1 - bx) * (1 - by) * (1 - bz)
      j001.vx += fx * dt * (1 - bx) * (1 - by) * bz
      j010.vx += fx * dt * (1 - bx) * by * (1 - bz)
      j011.vx += fx * dt * (1 - bx) * by * bz
      j100.vx += fx * dt * bx * (1 - by) * (1 - bz)
      j101.vx += fx * dt * bx * (1 - by) * bz
      j110.vx += fx * dt * bx * by * (1 - bz)
      j111.vx += fx * dt * bx * by * bz
      j000.vy += fy * dt * (1 - bx) * (1 - by) * (1 - bz)
      j001.vy += fy * dt * (1 - bx) * (1 - by) * bz
      j010.vy += fy * dt * (1 - bx) * by * (1 - bz)
      j011.vy += fy * dt * (1 - bx) * by * bz
      j100.vy += fy * dt * bx * (1 - by) * (1 - bz)
      j101.vy += fy * dt * bx * (1 - by) * bz
      j110.vy += fy * dt * bx * by * (1 - bz)
      j111.vy += fy * dt * bx * by * bz
      j000.vz += fz * dt * (1 - bx) * (1 - by) * (1 - bz)
      j001.vz += fz * dt * (1 - bx) * (1 - by) * bz
      j010.vz += fz * dt * (1 - bx) * by * (1 - bz)
      j011.vz += fz * dt * (1 - bx) * by * bz
      j100.vz += fz * dt * bx * (1 - by) * (1 - bz)
      j101.vz += fz * dt * bx * (1 - by) * bz
      j110.vz += fz * dt * bx * by * (1 - bz)
      j111.vz += fz * dt * bx * by * bz
    })

    this.calculateJellyXYZ()
    this.updateMorph()
  }
  rotateJelly(t) {
    const a = 4 * Math.cos(t)
    const b = 4 * Math.sin(t)
    const cosrot = Math.cos(t * 0.2 + 0.5)
    const sinrot = Math.sin(t * 0.2 + 0.5)

    const cosrot2 = Math.cos(t * 0.3 + 0.7)
    const sinrot2 = Math.sin(t * 0.3 + 0.7)
    this.eachCoord((i, j, k) => {
      const p = this.jelly[i][j][k]
      p.x = this.xysize * (i - this.step / 2) + 0.1 * Math.sin(3 * p.x - 4 * t)
      p.y = this.xysize * (j - this.step / 2)
      p.z = this.zsize * (k - 0.5) + 0.1 * Math.sin(a * p.x + b * p.y - 2 * t)
      const px = p.x * cosrot + p.z * sinrot
      const pz = p.z * cosrot - p.x * sinrot
      p.x = px
      p.z = pz
      const py2 = p.y * cosrot2 + p.z * sinrot2
      const pz2 = p.z * cosrot2 - p.y * sinrot2
      p.y = py2
      p.z = pz2
      p.z += 2
      p.vx = p.vy = p.vz = 0
    })
  }
  calculateJellyXYZ() {
    this.eachCoord((i, j, k) => {
      const ia = i === 0 ? 0 : i - 1
      const ib = i === this.step ? this.step : i + 1
      const ja = j === 0 ? 0 : j - 1
      const jb = j === this.step ? this.step : j + 1
      const p = this.jelly[i][j][k]
      p.xx = (this.jelly[ib][j][k].x - this.jelly[ia][j][k].x) / (ib - ia)
      p.yx = (this.jelly[ib][j][k].y - this.jelly[ia][j][k].y) / (ib - ia)
      p.zx = (this.jelly[ib][j][k].z - this.jelly[ia][j][k].z) / (ib - ia)
      p.xy = (this.jelly[i][jb][k].x - this.jelly[i][ja][k].x) / (jb - ja)
      p.yy = (this.jelly[i][jb][k].y - this.jelly[i][ja][k].y) / (jb - ja)
      p.zy = (this.jelly[i][jb][k].z - this.jelly[i][ja][k].z) / (jb - ja)
      p.xz = this.jelly[i][j][1].x - this.jelly[i][j][0].x
      p.yz = this.jelly[i][j][1].y - this.jelly[i][j][0].y
      p.zz = this.jelly[i][j][1].z - this.jelly[i][j][0].z
    })
    for (let n = 0; n < 8; n++) {
      this.eachCoord((i, j, k) => {
        const ia = i === 0 ? 0 : i - 1
        const ib = i === this.step ? this.step : i + 1
        const ja = j === 0 ? 0 : j - 1
        const jb = j === this.step ? this.step : j + 1
        const p = this.jelly[i][j][k]
        const ki = ia === i || ib === i ? 2 : 4
        const kj = ja === j || jb === j ? 2 : 4
        p.xx = (3 * (this.jelly[ib][j][k].x - this.jelly[ia][j][k].x) - this.jelly[ib][j][k].xx - this.jelly[ia][j][k].xx) / ki
        p.yx = (3 * (this.jelly[ib][j][k].y - this.jelly[ia][j][k].y) - this.jelly[ib][j][k].yx - this.jelly[ia][j][k].yx) / ki
        p.zx = (3 * (this.jelly[ib][j][k].z - this.jelly[ia][j][k].z) - this.jelly[ib][j][k].zx - this.jelly[ia][j][k].zx) / ki
        p.xy = (3 * (this.jelly[i][jb][k].x - this.jelly[i][ja][k].x) - this.jelly[i][jb][k].xy - this.jelly[i][ja][k].xy) / kj
        p.yy = (3 * (this.jelly[i][jb][k].y - this.jelly[i][ja][k].y) - this.jelly[i][jb][k].yy - this.jelly[i][ja][k].yy) / kj
        p.zy = (3 * (this.jelly[i][jb][k].z - this.jelly[i][ja][k].z) - this.jelly[i][jb][k].zy - this.jelly[i][ja][k].zy) / kj
      })
    }
  }
  initializeJelly() {
    this.jelly = []
    this.eachCoord((i, j, k) => {
      this.jelly[i] = this.jelly[i] || []
      this.jelly[i][j] = this.jelly[i][j] || []
      this.jelly[i][j][k] = {
        x: this.xysize * (i - this.step / 2),
        y: this.xysize * (j - this.step / 2),
        z: this.zsize * (k - 0.5),
        vx: 0,
        vy: 0,
        vz: 0
      }
    })
    this.calculateJellyXYZ()
  }
}
