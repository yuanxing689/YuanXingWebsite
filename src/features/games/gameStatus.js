const statusLabels = {
  planned: '计划中',
  translating: '汉化中',
  released: '已发布',
  paused: '暂停'
}

export function getGameStatusLabel(status) {
  return statusLabels[status] || status || '状态待补充'
}
