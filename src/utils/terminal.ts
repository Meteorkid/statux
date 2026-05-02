/** 获取终端宽度 */
export function terminalColumns(): number {
  // Bun/Node 都支持
  if (process.stdout.columns && process.stdout.columns > 0) {
    return process.stdout.columns;
  }
  // 环境变量降级
  const envCols = process.env.COLUMNS;
  if (envCols) {
    const n = parseInt(envCols, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 120;
}
