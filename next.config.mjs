// next.config.mjs
import webpack from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Existing ignore plugin
      config.plugins.push(
        new webpack.IgnorePlugin({
          // Ignore any modules with "LICENSE", "README", or ending with ".txt" (case-insensitive)
          resourceRegExp: /LICENSE|README|\.txt$/i,
        })
      );
      
      // Add CopyPlugin to copy langdetect's profiles folder
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.resolve(process.cwd(), 'node_modules/langdetect/profiles'),
              to: path.resolve(process.cwd(), '.next/server/vendor-chunks/profiles'),
            },
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;