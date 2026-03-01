import { validateGridConfig } from "../gridConfigValidation";

function validConfig() {
  return {
    baseCellSizeKm: 5,
    subdivision: {
      threshold: 60,
      maxDepth: 10,
      minCellSizeM: 50,
    },
  };
}

describe("validateGridConfig", () => {
  it("should not throw for a valid config", () => {
    expect(() => validateGridConfig(validConfig())).not.toThrow();
  });

  it("should throw if baseCellSizeKm is too small", () => {
    const config = validConfig();
    config.baseCellSizeKm = 0.05;
    expect(() => validateGridConfig(config)).toThrow("baseCellSizeKm");
  });

  it("should throw if baseCellSizeKm is too large", () => {
    const config = validConfig();
    config.baseCellSizeKm = 100;
    expect(() => validateGridConfig(config)).toThrow("baseCellSizeKm");
  });

  it("should throw if threshold is 0", () => {
    const config = validConfig();
    config.subdivision.threshold = 0;
    expect(() => validateGridConfig(config)).toThrow("threshold");
  });

  it("should throw if threshold exceeds 60", () => {
    const config = validConfig();
    config.subdivision.threshold = 61;
    expect(() => validateGridConfig(config)).toThrow("threshold");
  });

  it("should throw if maxDepth is 0", () => {
    const config = validConfig();
    config.subdivision.maxDepth = 0;
    expect(() => validateGridConfig(config)).toThrow("maxDepth");
  });

  it("should throw if maxDepth exceeds 15", () => {
    const config = validConfig();
    config.subdivision.maxDepth = 16;
    expect(() => validateGridConfig(config)).toThrow("maxDepth");
  });

  it("should throw if minCellSizeM is below 10", () => {
    const config = validConfig();
    config.subdivision.minCellSizeM = 5;
    expect(() => validateGridConfig(config)).toThrow("minCellSizeM");
  });

  it("should throw if minCellSizeM exceeds 5000", () => {
    const config = validConfig();
    config.subdivision.minCellSizeM = 6000;
    expect(() => validateGridConfig(config)).toThrow("minCellSizeM");
  });

  it("should accept boundary values", () => {
    const config = {
      baseCellSizeKm: 0.1,
      subdivision: {
        threshold: 1,
        maxDepth: 1,
        minCellSizeM: 10,
      },
    };
    expect(() => validateGridConfig(config)).not.toThrow();

    const configMax = {
      baseCellSizeKm: 50,
      subdivision: {
        threshold: 60,
        maxDepth: 15,
        minCellSizeM: 5000,
      },
    };
    expect(() => validateGridConfig(configMax)).not.toThrow();
  });
});
