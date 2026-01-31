export class WithMeta<T> {
  constructor(
    public readonly data: T,
    public readonly meta: Record<string, any>,
  ) {}
}
