import container from 'markdown-it-container'

const BLOCK_POSITIONS = new Set(['left', 'right', 'center', 'full'])
const STACK_POSITIONS = new Set(['left', 'right'])
const GRID_COLUMNS = new Set(['2', '3'])

function readContainerOption(info, name, allowedOptions) {
  const parts = info.trim().split(/\s+/)
  if (parts.length !== 2 || parts[0] !== name) return null
  if (!allowedOptions.has(parts[1])) return null
  return parts[1]
}

function registerOptionContainer(md, {
  name,
  allowedOptions,
  className
}) {
  md.use(container, name, {
    validate(params) {
      return readContainerOption(params, name, allowedOptions) !== null
    },
    render(tokens, index) {
      if (tokens[index].nesting !== 1) return '</div>\n'

      const option = readContainerOption(
        tokens[index].info,
        name,
        allowedOptions
      )

      // 选项已通过白名单校验，避免把未经过滤的文本写入 class 属性。
      return `<div class="${className} ${className}--${option}">\n`
    }
  })
}

export function registerMediaContainers(md) {
  registerOptionContainer(md, {
    name: 'media-block',
    allowedOptions: BLOCK_POSITIONS,
    className: 'media-block'
  })
  registerOptionContainer(md, {
    name: 'media-stack',
    allowedOptions: STACK_POSITIONS,
    className: 'media-stack'
  })
  registerOptionContainer(md, {
    name: 'media-grid',
    allowedOptions: GRID_COLUMNS,
    className: 'media-grid'
  })
}
