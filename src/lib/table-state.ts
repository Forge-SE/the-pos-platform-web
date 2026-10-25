import { useUrlState } from "@/lib/url-state"

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function useTablePagination(key: string, defaultPageSize = 20, allowedSizes: readonly number[] = [10, 20, 25, 50, 100]) {
  const [pageParam, setPageParam] = useUrlState(`${key}Page`, "push")
  const [sizeParam, setSizeParam] = useUrlState(`${key}PageSize`)
  const pageIndex = positiveInteger(pageParam, 1) - 1
  const pageSize = allowedSizes.includes(
    positiveInteger(sizeParam, defaultPageSize)
  )
    ? positiveInteger(sizeParam, defaultPageSize)
    : defaultPageSize

  return {
    pageIndex,
    pageSize,
    onPageChange: (index: number) =>
      setPageParam(index > 0 ? String(index + 1) : null),
    onPageSizeChange: (size: number) => {
      setSizeParam(size === defaultPageSize ? null : String(size))
      setPageParam(null)
    },
    resetPage: () => setPageParam(null),
  }
}
