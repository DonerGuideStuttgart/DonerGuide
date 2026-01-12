// Jest type definitions
declare namespace jest {
  interface Matchers<R, T> {
    toHaveProperty(prop: string, val?: any): R;
  }
}
