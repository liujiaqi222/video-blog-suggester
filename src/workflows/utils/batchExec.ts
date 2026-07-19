import { sleep } from "workflow";

type BatchExecOptions = {
  batchSize?: number;
  delayMs?: number;
};

export async function batchExec<T, TResult>(
  items: readonly T[],
  fn: (item: T) => Promise<TResult>,
  { batchSize = 10, delayMs = 0 }: BatchExecOptions = {},
) {


  const results: TResult[] = [];
  let failed = 0;

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const outcomes = await Promise.allSettled(batch.map(fn));

    for (const outcome of outcomes) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        failed++;
      }
    }

    // 每批之间的等待在工作流上下文中持久化，避免长任务占用执行资源。
    if (delayMs > 0 && index + batchSize < items.length) {
      await sleep(delayMs);
    }
  }

  return {
    total: items.length,
    succeeded: results.length,
    failed,
    results,
  };
}
