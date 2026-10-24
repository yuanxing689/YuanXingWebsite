function isRootRelative(source) {
  return (
    typeof source === 'string' &&
    source.startsWith('/') &&
    !source.startsWith('//')
  )
}

export function createSiteImagePlugin(siteBase) {
  const normalizedBase = siteBase.endsWith('/') ? siteBase : `${siteBase}/`

  return function configureSiteImages(md) {
    const renderImage = md.renderer.rules.image

    md.renderer.rules.image = (tokens, index, options, env, self) => {
      const token = tokens[index]
      const source = token.attrGet('src')

      if (
        normalizedBase !== '/' &&
        isRootRelative(source) &&
        !source.startsWith(normalizedBase)
      ) {
        token.attrSet('src', `${normalizedBase}${source.slice(1)}`)
      }

      return renderImage(tokens, index, options, env, self)
    }
  }
}
