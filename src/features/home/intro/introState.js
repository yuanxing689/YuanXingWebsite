export const SCENE_START = {
  starReveal: -0.2,
  ringReveal: 0,
  star: 0,
  ribbon: 0,
  glow: 0,
  light: 0,
  bloom: 0,
  motion: 0,
  nav1: 0,
  nav2: 0,
  nav3: 0
}

export const SCENE_END = {
  starReveal: 1.7,
  ringReveal: 1.25,
  star: 1,
  ribbon: 1,
  glow: 1,
  light: 1,
  bloom: 1,
  motion: 1,
  nav1: 1,
  nav2: 1,
  nav3: 1
}

export const CSS_START = {
  '--intro-wordmark': '0.15',
  '--intro-glow': '0',
  '--intro-spread': '1.5',
  '--intro-shift': '-30',
  '--intro-reveal': '0',
  '--intro-backdrop': '0',
  '--intro-nav-label': '0'
}

export const CSS_END = {
  '--intro-wordmark': '1',
  '--intro-glow': '1',
  '--intro-spread': '1.25',
  '--intro-shift': '0',
  '--intro-reveal': '1',
  '--intro-backdrop': '1',
  '--intro-nav-label': '1'
}

export function writeIntroCss(values) {
  const rootStyle = document.documentElement.style

  Object.entries(values).forEach(([name, value]) => {
    rootStyle.setProperty(name, value)
  })
}

export function applyIntroEndState(scene) {
  if (scene?.intro) Object.assign(scene.intro, SCENE_END)
  writeIntroCss(CSS_END)
}
