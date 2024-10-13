import { defineConfig, type Options } from "tsup";

const NODE_TARGET: Options["target"] = ["node22"];

export default defineConfig(async (options) => {
  const commonConfig: Options = {
    // splitting: false,
    // minify: !options.watch,
    // treeshake: true,
    // sourcemap: true,
    // clean: options.watch ? false : true,
  };

  const configs: Options[] = [];


  configs.push({
    ...commonConfig,
    entry: [
      "src/preset.ts"
    ],
    format: ["esm"],
    target: NODE_TARGET,
    platform: "node",
  });


  return configs;
});
